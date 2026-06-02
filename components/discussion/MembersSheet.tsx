import React from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import type { DiscussionAuthor } from "@/types/discussion.type";

interface Props {
  visible: boolean;
  onClose: () => void;
  members: DiscussionAuthor[];
  onlineUserIds: Set<string>;
  isDark: boolean;
}

const fullName = (m: DiscussionAuthor) =>
  [m.firstname?.trim(), m.lastname?.trim()].filter(Boolean).join(" ") || "Membre";
const initials = (m: DiscussionAuthor) =>
  ((m.firstname?.[0] ?? "") + (m.lastname?.[0] ?? "")).toUpperCase() || "?";

const MembersSheet: React.FC<Props> = ({ visible, onClose, members, onlineUserIds, isDark }) => {
  // Online first, then alphabetical.
  const sorted = [...members].sort((a, b) => {
    const ao = onlineUserIds.has(a.id) ? 0 : 1;
    const bo = onlineUserIds.has(b.id) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return fullName(a).localeCompare(fullName(b));
  });
  const onlineCount = sorted.filter((m) => onlineUserIds.has(m.id)).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, isDark && styles.sheetDark]}>
          <View style={[styles.handle, isDark && styles.handleDark]} />
          <View style={styles.header}>
            <ThemedText style={[styles.title, isDark && styles.titleDark]}>
              Membres ({members.length})
            </ThemedText>
            <ThemedText style={styles.onlineSummary}>
              {onlineCount} en ligne
            </ThemedText>
          </View>

          <FlatList
            data={sorted}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const online = onlineUserIds.has(item.id);
              const avatar = item.image?.url;
              return (
                <View style={styles.row}>
                  <View>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <ThemedText style={styles.avatarInitials}>{initials(item)}</ThemedText>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: online ? "#22C55E" : "#9CA3AF" },
                        isDark && styles.statusDotDark,
                      ]}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText style={[styles.name, isDark && styles.nameDark]} numberOfLines={1}>
                      {fullName(item)}
                    </ThemedText>
                    <ThemedText style={[styles.status, { color: online ? "#22C55E" : "#9CA3AF" }]}>
                      {online ? "En ligne" : "Hors ligne"}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  handleDark: { backgroundColor: "#6B7280" },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: { fontFamily: theme.typography.fontFamily, fontSize: 18, fontWeight: "700", color: "#111827" },
  titleDark: { color: "#F9FAFB" },
  onlineSummary: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: "600", color: "#22C55E" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: theme.color.primary[500], alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  statusDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusDotDark: { borderColor: theme.color.dark.background.secondary },
  rowText: { flex: 1 },
  name: { fontFamily: theme.typography.fontFamily, fontSize: 15, fontWeight: "600", color: "#111827" },
  nameDark: { color: "#F3F4F6" },
  status: { fontFamily: theme.typography.fontFamily, fontSize: 12, marginTop: 1 },
});

export default MembersSheet;
