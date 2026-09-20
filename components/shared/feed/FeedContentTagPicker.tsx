import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { searchTaggableContent, type TaggableContentResult, type TaggedFeedContentType } from "@/services/feed.service";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (results: TaggableContentResult[]) => void;
  initialSelected?: TaggableContentResult[];
  isDark: boolean;
}

const MAX_SELECTION = 5;

const TABS: { key: TaggedFeedContentType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: "course", label: "Cours", icon: "book-open-page-variant", color: "#4CAF50" },
  { key: "exercise", label: "Exercices", icon: "card-text-outline", color: "#9C27B0" },
  { key: "quiz", label: "Quiz", icon: "pencil-box-multiple", color: "#2196F3" },
  { key: "document", label: "Documents", icon: "file-document-outline", color: "#F59E0B" },
  { key: "program", label: "Classes", icon: "school-outline", color: "#EF4444" },
];

const DEBOUNCE_MS = 300;

const itemKey = (r: TaggableContentResult) => `${r.type}-${r.id}-${r.route}`;

const FeedContentTagPicker: React.FC<Props> = ({ visible, onClose, onConfirm, initialSelected, isDark }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TaggedFeedContentType>("course");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TaggableContentResult[]>([]);
  const [selected, setSelected] = useState<TaggableContentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabLabel = TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "contenus";

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected ?? []);
    } else {
      setSearchQuery("");
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchTaggableContent(trimmed, tab);
      setResults(data);
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, tab]);

  const toggleSelect = (item: TaggableContentResult) => {
    setSelected((prev) => {
      const exists = prev.some((s) => itemKey(s) === itemKey(item));
      if (exists) return prev.filter((s) => itemKey(s) !== itemKey(item));
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, item];
    });
  };

  const handleConfirm = () => {
    onConfirm(selected);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={24} color={isDark ? "#F9FAFB" : "#111827"} />
          </Pressable>
          <ThemedText style={[styles.title, isDark && styles.titleDark]}>Taguer un contenu</ThemedText>
          <Pressable onPress={handleConfirm} hitSlop={8}>
            <Text style={styles.confirmText}>Valider{selected.length > 0 ? ` (${selected.length})` : ""}</Text>
          </Pressable>
        </View>

        {selected.length > 0 && (
          <FlatList
            horizontal
            data={selected}
            keyExtractor={itemKey}
            showsHorizontalScrollIndicator={false}
            style={styles.selectedRow}
            contentContainerStyle={styles.selectedRowContent}
            renderItem={({ item }) => (
              <View style={[styles.selectedChip, isDark && styles.selectedChipDark]}>
                <Text style={[styles.selectedChipText, isDark && styles.textDark]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Pressable onPress={() => toggleSelect(item)} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </Pressable>
              </View>
            )}
          />
        )}

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tab,
                  active && { backgroundColor: t.color + "1A", borderColor: t.color },
                  isDark && !active && styles.tabDark,
                ]}
              >
                <MaterialCommunityIcons name={t.icon} size={16} color={active ? t.color : "#9CA3AF"} />
                <ThemedText style={[styles.tabText, { color: active ? t.color : "#9CA3AF" }]}>
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons name="magnify" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder={`Rechercher dans les ${activeTabLabel}...`}
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={theme.color.primary[500]} />
        ) : searchQuery.trim().length === 0 ? (
          <ThemedText style={[styles.empty, isDark && styles.emptyDark]}>
            Commencez à taper pour rechercher.{selected.length > 0 ? "\nVos sélections restent en haut." : ""}
          </ThemedText>
        ) : results.length === 0 ? (
          <ThemedText style={[styles.empty, isDark && styles.emptyDark]}>
            Aucun résultat pour "{searchQuery.trim()}".
          </ThemedText>
        ) : (
          <FlatList
            data={results}
            keyExtractor={itemKey}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = selected.some((s) => itemKey(s) === itemKey(item));
              return (
                <Pressable
                  style={[
                    styles.item,
                    isDark && styles.itemDark,
                    isSelected && { borderColor: theme.color.primary[500], borderWidth: 1.5 },
                  ]}
                  onPress={() => toggleSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.itemText, isDark && styles.itemTextDark]} numberOfLines={2}>
                      {item.label}
                    </ThemedText>
                    {item.subtitle && (
                      <ThemedText style={[styles.itemSubtitle, isDark && styles.itemSubtitleDark]} numberOfLines={1}>
                        {item.subtitle}
                      </ThemedText>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name={isSelected ? "check-circle" : "plus-circle-outline"}
                    size={22}
                    color={isSelected ? theme.color.primary[500] : (isDark ? "#6B7280" : "#9CA3AF")}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerDark: { borderBottomColor: "#1E293B" },
  title: { fontFamily: theme.typography.fontFamily, fontSize: 17, fontWeight: "700", color: "#111827" },
  titleDark: { color: "#F9FAFB" },
  textDark: { color: "#F9FAFB" },
  confirmText: { fontFamily: theme.typography.fontFamily, fontSize: 15, fontWeight: "700", color: theme.color.primary[500] },
  selectedRow: { maxHeight: 52, flexGrow: 0 },
  selectedRowContent: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F59E0B1A",
    borderWidth: 1,
    borderColor: "#F59E0B55",
    marginRight: 8,
    maxWidth: 200,
  },
  selectedChipDark: { backgroundColor: "#F59E0B26" },
  selectedChipText: { fontSize: 12, fontWeight: "600", color: "#111827", flexShrink: 1 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, paddingHorizontal: 16 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabDark: { borderColor: "#374151" },
  tabText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    marginTop: 12,
    marginHorizontal: 16,
  },
  searchBoxDark: {
    borderColor: "#374151",
    backgroundColor: theme.color.dark.background.secondary,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },
  searchInputDark: { color: "#F9FAFB" },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  itemDark: { backgroundColor: theme.color.dark.background.secondary },
  itemText: { fontFamily: theme.typography.fontFamily, fontSize: 15, color: "#111827" },
  itemTextDark: { color: "#F3F4F6" },
  itemSubtitle: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: "#6B7280", marginTop: 2 },
  itemSubtitleDark: { color: "#9CA3AF" },
  empty: { textAlign: "center", marginVertical: 28, color: "#6B7280", fontFamily: theme.typography.fontFamily, paddingHorizontal: 24 },
  emptyDark: { color: "#9CA3AF" },
});

export default FeedContentTagPicker;
