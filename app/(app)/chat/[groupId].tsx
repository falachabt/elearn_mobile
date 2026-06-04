import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as DocumentPicker from "expo-document-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import useSWR, { useSWRConfig } from "swr";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useDiscussionChat } from "@/hooks/useDiscussionChat";
import { useGroupPresence } from "@/hooks/useGroupPresence";
import { getGroupMembers, markGroupRead } from "@/services/discussion.service";
import {
  getSecondaryProgramCourses,
  getSecondaryProgramExercises,
  getSecondaryProgramQuizzes,
} from "@/services/secondary/program.service";
import MembersSheet from "@/components/discussion/MembersSheet";
import ContentTagPicker, { TaggableItem } from "@/components/discussion/ContentTagPicker";
import type {
  DiscussionAttachment,
  DiscussionMessage,
  PendingAttachment,
  TaggedContentType,
} from "@/types/discussion.type";

const TAG_META: Record<
  TaggedContentType,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string }
> = {
  course: { icon: "book-open-page-variant", label: "Cours", color: "#4CAF50" },
  quiz: { icon: "pencil-box-multiple", label: "Quiz", color: "#2196F3" },
  exercise: { icon: "card-text-outline", label: "Exercice", color: "#9C27B0" },
};

const authorName = (m: DiscussionMessage) => {
  const full = [m.author?.firstname?.trim(), m.author?.lastname?.trim()].filter(Boolean).join(" ");
  return full || "Membre";
};
const initials = (m: DiscussionMessage) =>
  ((m.author?.firstname?.[0] ?? "") + (m.author?.lastname?.[0] ?? "")).toUpperCase() || "?";
const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};
const isImage = (t?: string | null) => !!t && t.startsWith("image/");
const isVideo = (t?: string | null) => !!t && t.startsWith("video/");

// ---- media viewer (fullscreen image / video) -------------------------------
const MediaViewer: React.FC<{
  uri: string | null;
  type: string | null;
  onClose: () => void;
}> = ({ uri, type, onClose }) => {
  const player = useVideoPlayer(isVideo(type) && uri ? uri : null, (p) => {
    if (p) p.play();
  });
  if (!uri) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerOverlay}>
        <Pressable style={styles.viewerClose} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        {isVideo(type) ? (
          <VideoView player={player} style={styles.viewerVideo} allowsFullscreen nativeControls />
        ) : (
          <ExpoImage source={{ uri }} style={styles.viewerImage} contentFit="contain" />
        )}
      </View>
    </Modal>
  );
};

const ChatScreen = () => {
  const params = useLocalSearchParams<{
    groupId: string;
    title?: string;
    kind?: string; // 'secondary' | 'learn'
    programId?: string; // secondary_programs.id
    pdId?: string; // learning_paths id (learn)
  }>();
  const groupId = params.groupId;
  const router = useRouter();
  const { user } = useAuth();
  const { trigger } = useHaptics();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { messages, isLoading, isLoadingMore, hasMore, error, loadMore, send, retry } =
    useDiscussionChat(groupId);
  const { onlineUserIds, onlineCount } = useGroupPresence(groupId);
  const { mutate: globalMutate } = useSWRConfig();

  // Mark the group read on open and whenever new messages arrive while open,
  // then refresh the card's unread badge.
  useEffect(() => {
    if (!groupId || !user?.id) return;
    void markGroupRead(groupId).then(() => globalMutate(["group-unread", groupId, user.id]));
  }, [groupId, user?.id, messages.length, globalMutate]);

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [tag, setTag] = useState<{ type: TaggedContentType; id: string; label: string } | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [tagVisible, setTagVisible] = useState(false);
  const [viewer, setViewer] = useState<{ uri: string; type: string | null } | null>(null);

  // Group members (for the top-right panel).
  const { data: members = [] } = useSWR(groupId ? ["group-members", groupId] : null, () =>
    getGroupMembers(groupId)
  );

  // Taggable content (secondary only for now).
  const canTag = params.kind === "secondary" && !!params.programId;
  const { data: tagContent, isLoading: tagLoading } = useSWR(
    canTag ? ["tag-content", params.programId] : null,
    async () => {
      const [courses, quizzes, exercises] = await Promise.all([
        getSecondaryProgramCourses(params.programId!),
        getSecondaryProgramQuizzes(params.programId!),
        getSecondaryProgramExercises(params.programId!, undefined, 0, 50),
      ]);
      const toItem = (rows: unknown[], key: "course" | "quiz" | "exercise", nameField: string): TaggableItem[] =>
        (rows as Record<string, { id: string } & Record<string, unknown>>[])
          .map((r) => r[key])
          .filter((x): x is { id: string } & Record<string, unknown> => !!x)
          .map((x) => ({ id: x.id, label: (x[nameField] as string) || "" }));
      return {
        courses: toItem(courses ?? [], "course", "name"),
        quizzes: toItem(quizzes?.data ?? [], "quiz", "name"),
        exercises: toItem(exercises?.data ?? [], "exercise", "title"),
      };
    }
  );

  const data = useMemo(() => messages.slice().reverse(), [messages]);

  const pickFiles = useCallback(async (kind: "media" | "document") => {
    setAttachMenu(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: kind === "media" ? ["image/*", "video/*"] : ["*/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets) return;
      const picked: PendingAttachment[] = res.assets.map((a) => ({
        uri: a.uri,
        name: a.name ?? "fichier",
        mimeType: a.mimeType ?? "application/octet-stream",
        size: a.size,
      }));
      setPending((prev) => [...prev, ...picked]);
    } catch {
      /* user cancelled / picker error */
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text && pending.length === 0 && !tag) return;
    trigger(HapticType.LIGHT);
    const args = {
      textContent: text,
      attachments: pending.length ? pending : undefined,
      taggedContentType: tag?.type ?? null,
      taggedContentId: tag?.id ?? null,
      taggedContentLabel: tag?.label ?? null,
    };
    setDraft("");
    setPending([]);
    setTag(null);
    await send(args);
  }, [draft, pending, tag, send, trigger]);

  const openTagged = useCallback(
    (m: DiscussionMessage) => {
      if (!m.tagged_content_type || !m.tagged_content_id) return;
      const seg =
        m.tagged_content_type === "course"
          ? "courses"
          : m.tagged_content_type === "quiz"
          ? "quizzes"
          : "exercices";
      let route: string | null = null;
      if (params.kind === "secondary" && params.programId) {
        route = `/(app)/secondary/program/${params.programId}/${seg}/${m.tagged_content_id}`;
      } else if (params.kind === "learn" && params.pdId) {
        route = `/(app)/learn/${params.pdId}/${seg}/${m.tagged_content_id}`;
      }
      if (route) router.push(route as Href);
    },
    [params.kind, params.programId, params.pdId, router]
  );

  const renderAttachment = useCallback(
    (att: { file_url: string; file_type: string | null; file_name: string | null }, key: string) => {
      if (isImage(att.file_type)) {
        return (
          <Pressable key={key} onPress={() => setViewer({ uri: att.file_url, type: att.file_type })}>
            <ExpoImage source={{ uri: att.file_url }} style={styles.attImage} contentFit="cover" />
          </Pressable>
        );
      }
      if (isVideo(att.file_type)) {
        return (
          <Pressable
            key={key}
            style={styles.attVideo}
            onPress={() => setViewer({ uri: att.file_url, type: att.file_type })}
          >
            <MaterialCommunityIcons name="play-circle" size={44} color="#FFFFFF" />
            <ThemedText style={styles.attVideoLabel} numberOfLines={1}>
              {att.file_name || "Vidéo"}
            </ThemedText>
          </Pressable>
        );
      }
      return (
        <Pressable key={key} style={styles.attDoc} onPress={() => Linking.openURL(att.file_url)}>
          <MaterialCommunityIcons name="file-document-outline" size={22} color={theme.color.primary[500]} />
          <ThemedText style={styles.attDocName} numberOfLines={1}>
            {att.file_name || "Document"}
          </ThemedText>
        </Pressable>
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: DiscussionMessage }) => {
      const isMine = item.user_id === user?.id;
      const tagMeta = item.tagged_content_type ? TAG_META[item.tagged_content_type] : null;
      const avatarUrl = item.author?.image?.url;
      const status = item._status;

      // Combine confirmed + pending (uploading) attachments for display.
      const atts = [
        ...(item.attachments ?? []).map((a: DiscussionAttachment) => ({
          file_url: a.file_url,
          file_type: a.file_type,
          file_name: a.file_name,
        })),
        ...(item._pendingAttachments ?? []).map((p) => ({
          file_url: p.uri,
          file_type: p.mimeType,
          file_name: p.name,
        })),
      ];

      return (
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
          {!isMine &&
            (avatarUrl ? (
              <ExpoImage source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <ThemedText style={styles.avatarInitials}>{initials(item)}</ThemedText>
              </View>
            ))}

          <View
            style={[
              styles.bubble,
              isMine
                ? [styles.bubbleMine, isDark && styles.bubbleMineDark]
                : [styles.bubbleOther, isDark && styles.bubbleOtherDark],
            ]}
          >
            {!isMine && (
              <ThemedText style={[styles.author, isDark && styles.authorDark]}>{authorName(item)}</ThemedText>
            )}

            {tagMeta && (
              <Pressable
                onPress={() => openTagged(item)}
                style={[styles.tagCard, { borderColor: tagMeta.color + "55", backgroundColor: tagMeta.color + "14" }]}
              >
                <MaterialCommunityIcons name={tagMeta.icon} size={16} color={tagMeta.color} />
                <ThemedText style={[styles.tagLabel, { color: tagMeta.color }]} numberOfLines={1}>
                  {item.tagged_content_label || `${tagMeta.label} partagé`}
                </ThemedText>
                <MaterialCommunityIcons name="chevron-right" size={16} color={tagMeta.color} />
              </Pressable>
            )}

            {atts.length > 0 && (
              <View style={styles.attWrap}>{atts.map((a, i) => renderAttachment(a, `${item.id}-${i}`))}</View>
            )}

            {item.text_content ? (
              <ThemedText
                style={[styles.messageText, isMine ? styles.messageTextMine : isDark && styles.messageTextDark]}
              >
                {item.text_content}
              </ThemedText>
            ) : null}

            <View style={styles.metaRow}>
              <ThemedText style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
                {formatTime(item.created_at)}
              </ThemedText>
              {isMine && status === "sending" && (
                <MaterialCommunityIcons name="clock-outline" size={13} color="rgba(255,255,255,0.7)" />
              )}
              {isMine && status === "sent" && (
                <MaterialCommunityIcons name="check" size={14} color="rgba(255,255,255,0.85)" />
              )}
              {isMine && status === "failed" && (
                <Pressable onPress={() => retry(item.id)} style={styles.retryBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#FECACA" />
                  <ThemedText style={styles.retryText}>Réessayer</ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      );
    },
    [user?.id, isDark, openTagged, renderAttachment, retry]
  );

  const canSend = !!draft.trim() || pending.length > 0 || !!tag;

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, isDark && styles.iconButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? "#F9FAFB" : "#111827"} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText numberOfLines={1} style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            {params.title || "Groupe de suivi"}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: onlineCount > 0 ? "#22C55E" : isDark ? "#9CA3AF" : "#6B7280" }]}>
            {members.length} membres{onlineCount > 0 ? ` · ${onlineCount} en ligne` : ""}
          </ThemedText>
        </View>
        <Pressable onPress={() => setMembersVisible(true)} style={[styles.iconButton, isDark && styles.iconButtonDark]}>
          <MaterialCommunityIcons name="account-group" size={22} color={isDark ? "#F9FAFB" : "#111827"} />
          {onlineCount > 0 && <View style={styles.onlineBadge} />}
        </Pressable>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.color.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            Impossible de charger la discussion.
          </ThemedText>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="chat-outline" size={48} color={isDark ? "#4B5563" : "#D1D5DB"} />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            Aucun message pour l’instant.{"\n"}Lancez la discussion !
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} color={theme.color.primary[500]} /> : null
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Compose previews (pending attachments + tag) */}
      {(pending.length > 0 || tag) && (
        <View style={[styles.previewBar, isDark && styles.previewBarDark]}>
          {tag && (
            <View style={[styles.previewTag, { borderColor: TAG_META[tag.type].color }]}>
              <MaterialCommunityIcons name={TAG_META[tag.type].icon} size={14} color={TAG_META[tag.type].color} />
              <ThemedText style={[styles.previewTagText, { color: TAG_META[tag.type].color }]} numberOfLines={1}>
                {tag.label}
              </ThemedText>
              <Pressable onPress={() => setTag(null)} hitSlop={6}>
                <MaterialCommunityIcons name="close" size={14} color={TAG_META[tag.type].color} />
              </Pressable>
            </View>
          )}
          {pending.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={styles.previewChip}>
              {isImage(p.mimeType) ? (
                <ExpoImage source={{ uri: p.uri }} style={styles.previewThumb} contentFit="cover" />
              ) : (
                <MaterialCommunityIcons
                  name={isVideo(p.mimeType) ? "video" : "file-document-outline"}
                  size={18}
                  color={theme.color.primary[500]}
                />
              )}
              <ThemedText style={[styles.previewName, isDark && styles.previewNameDark]} numberOfLines={1}>
                {p.name}
              </ThemedText>
              <Pressable onPress={() => setPending((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={6}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, isDark && styles.inputBarDark]}>
        <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
          <Pressable
            onPress={() => setAttachMenu(true)}
            style={[styles.attachButton, isDark && styles.attachButtonDark]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="plus" size={22} color={theme.color.primary[500]} />
          </Pressable>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Votre message..."
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Attach menu */}
      <Modal visible={attachMenu} transparent animationType="fade" onRequestClose={() => setAttachMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setAttachMenu(false)}>
          <View style={[styles.menu, isDark && styles.menuDark]}>
            <Pressable style={styles.menuItem} onPress={() => pickFiles("media")}>
              <MaterialCommunityIcons name="image-multiple" size={22} color="#4F46E5" />
              <ThemedText style={[styles.menuText, isDark && styles.menuTextDark]}>Photo / Vidéo</ThemedText>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => pickFiles("document")}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#0EA5E9" />
              <ThemedText style={[styles.menuText, isDark && styles.menuTextDark]}>Document</ThemedText>
            </Pressable>
            {canTag && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setAttachMenu(false);
                  setTagVisible(true);
                }}
              >
                <MaterialCommunityIcons name="bookmark-outline" size={22} color="#16A34A" />
                <ThemedText style={[styles.menuText, isDark && styles.menuTextDark]}>
                  Partager un cours / quiz / exercice
                </ThemedText>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      <MembersSheet
        visible={membersVisible}
        onClose={() => setMembersVisible(false)}
        members={members}
        onlineUserIds={onlineUserIds}
        isDark={isDark}
      />

      <ContentTagPicker
        visible={tagVisible}
        onClose={() => setTagVisible(false)}
        courses={tagContent?.courses ?? []}
        quizzes={tagContent?.quizzes ?? []}
        exercises={tagContent?.exercises ?? []}
        isLoading={tagLoading}
        isDark={isDark}
        onPick={(type, id, label) => {
          setTag({ type, id, label });
          setTagVisible(false);
        }}
      />

      {viewer && (
        <MediaViewer uri={viewer.uri} type={viewer.type} onClose={() => setViewer(null)} />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  emptyText: { textAlign: "center", fontFamily: theme.typography.fontFamily, fontSize: 15, color: "#6B7280", lineHeight: 22 },
  emptyTextDark: { color: "#9CA3AF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: Platform.OS === "ios" ? 44 : 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: { backgroundColor: theme.color.dark.background.secondary, borderBottomColor: theme.color.dark.border },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  iconButtonDark: { backgroundColor: "#374151" },
  onlineBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "700", color: "#111827" },
  headerTitleDark: { color: "#F9FAFB" },
  headerSubtitle: { fontFamily: theme.typography.fontFamily, fontSize: 12, marginTop: 1, fontWeight: "600" },

  listContent: { paddingHorizontal: 12, paddingVertical: 12 },
  row: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  avatarFallback: { backgroundColor: theme.color.primary[500], alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: theme.color.primary[500], borderBottomRightRadius: 4 },
  bubbleMineDark: { backgroundColor: theme.color.primary[600] },
  bubbleOther: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4 },
  bubbleOtherDark: { backgroundColor: theme.color.dark.background.secondary },

  author: { fontFamily: theme.typography.fontFamily, fontSize: 12, fontWeight: "700", color: theme.color.primary[600], marginBottom: 2 },
  authorDark: { color: "#93C5FD" },

  tagCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  tagLabel: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 12, fontWeight: "600" },

  attWrap: { gap: 6, marginBottom: 4 },
  attImage: { width: 200, height: 150, borderRadius: 10, backgroundColor: "#00000010" },
  attVideo: {
    width: 200,
    height: 130,
    borderRadius: 10,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  attVideoLabel: { color: "#FFFFFF", fontSize: 11, paddingHorizontal: 8, fontFamily: theme.typography.fontFamily },
  attDoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 220,
  },
  attDocName: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 13, color: "#374151" },

  messageText: { fontFamily: theme.typography.fontFamily, fontSize: 15, lineHeight: 20, color: "#111827" },
  messageTextMine: { color: "#FFFFFF" },
  messageTextDark: { color: "#F3F4F6" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, alignSelf: "flex-end" },
  time: { fontFamily: theme.typography.fontFamily, fontSize: 10 },
  timeMine: { color: "rgba(255,255,255,0.7)" },
  timeOther: { color: "#9CA3AF" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  retryText: { color: "#FECACA", fontSize: 11, fontFamily: theme.typography.fontFamily, fontWeight: "600" },

  previewBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  previewBarDark: { backgroundColor: theme.color.dark.background.secondary, borderTopColor: theme.color.dark.border },
  previewTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  previewTagText: { fontFamily: theme.typography.fontFamily, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 180,
  },
  previewThumb: { width: 24, height: 24, borderRadius: 5 },
  previewName: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 12, color: "#374151" },
  previewNameDark: { color: "#D1D5DB" },

  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputBarDark: { backgroundColor: theme.color.dark.background.secondary, borderTopColor: theme.color.dark.border },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: theme.border.radius.medium,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputWrapperDark: { backgroundColor: theme.color.dark.background.primary, borderColor: theme.color.dark.border },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: theme.border.radius.small,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonDark: { backgroundColor: "#1E3A8A" },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 38,
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: "#1F2937",
    paddingTop: Platform.OS === "ios" ? 9 : 6,
    paddingBottom: Platform.OS === "ios" ? 9 : 6,
    textAlignVertical: "center",
  },
  inputDark: { color: "#F9FAFB" },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.primary[500],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.color.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: { opacity: 0.4, shadowOpacity: 0 },

  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menu: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 8, paddingBottom: 28 },
  menuDark: { backgroundColor: theme.color.dark.background.secondary },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 16 },
  menuText: { fontFamily: theme.typography.fontFamily, fontSize: 16, color: "#111827" },
  menuTextDark: { color: "#F3F4F6" },

  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  viewerClose: { position: "absolute", top: Platform.OS === "ios" ? 56 : 24, right: 20, zIndex: 2 },
  viewerImage: { width: "100%", height: "80%" },
  viewerVideo: { width: "100%", height: "60%" },
});

export default ChatScreen;
