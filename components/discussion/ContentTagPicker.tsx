import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import type { TaggedContentType } from "@/types/discussion.type";

export interface TaggableItem {
  id: string;
  label: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (type: TaggedContentType, id: string, label: string) => void;
  courses: TaggableItem[];
  quizzes: TaggableItem[];
  exercises: TaggableItem[];
  isLoading: boolean;
  isDark: boolean;
}

const TABS: { key: TaggedContentType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: "course", label: "Cours", icon: "book-open-page-variant", color: "#4CAF50" },
  { key: "quiz", label: "Quiz", icon: "pencil-box-multiple", color: "#2196F3" },
  { key: "exercise", label: "Exercices", icon: "card-text-outline", color: "#9C27B0" },
];

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const ContentTagPicker: React.FC<Props> = ({
  visible,
  onClose,
  onPick,
  courses,
  quizzes,
  exercises,
  isLoading,
  isDark,
}) => {
  const [tab, setTab] = useState<TaggedContentType>("course");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const data = tab === "course" ? courses : tab === "quiz" ? quizzes : exercises;
  const normalizedSearchQuery = normalizeSearchValue(deferredSearchQuery);
  const filteredData = useMemo(() => {
    if (!normalizedSearchQuery) return data;
    return data.filter((item) => normalizeSearchValue(item.label).includes(normalizedSearchQuery));
  }, [data, normalizedSearchQuery]);
  const hasSearch = searchQuery.trim().length > 0;
  const activeTabLabel = TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "contenus";

  useEffect(() => {
    if (!visible) setSearchQuery("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, isDark && styles.sheetDark]}>
          <View style={[styles.handle, isDark && styles.handleDark]} />
          <ThemedText style={[styles.title, isDark && styles.titleDark]}>Partager un contenu</ThemedText>

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
            />
            {hasSearch && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 28 }} color={theme.color.primary[500]} />
          ) : data.length === 0 ? (
            <ThemedText style={[styles.empty, isDark && styles.emptyDark]}>Aucun contenu disponible.</ThemedText>
          ) : filteredData.length === 0 ? (
            <ThemedText style={[styles.empty, isDark && styles.emptyDark]}>
              Aucun résultat pour "{searchQuery.trim()}".
            </ThemedText>
          ) : (
            <>
              <ThemedText style={[styles.resultCount, isDark && styles.resultCountDark]}>
                {filteredData.length}
                {filteredData.length < data.length ? ` / ${data.length}` : ""} contenu
                {filteredData.length > 1 ? "s" : ""} disponible{filteredData.length > 1 ? "s" : ""}
              </ThemedText>
              <FlatList
                data={filteredData}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.item, isDark && styles.itemDark]}
                    onPress={() => onPick(tab, item.id, item.label)}
                  >
                    <ThemedText style={[styles.itemText, isDark && styles.itemTextDark]} numberOfLines={2}>
                      {item.label}
                    </ThemedText>
                    <MaterialCommunityIcons name="share-outline" size={18} color={theme.color.primary[500]} />
                  </Pressable>
                )}
              />
            </>
          )}
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
    paddingHorizontal: 16,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: "#D1D5DB", marginBottom: 12 },
  handleDark: { backgroundColor: "#6B7280" },
  title: { fontFamily: theme.typography.fontFamily, fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  titleDark: { color: "#F9FAFB" },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
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
    marginBottom: 10,
  },
  searchBoxDark: {
    borderColor: "#374151",
    backgroundColor: theme.color.dark.background.primary,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },
  searchInputDark: { color: "#F9FAFB" },
  resultCount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  resultCountDark: { color: "#9CA3AF" },
  list: { paddingBottom: 12 },
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
  itemDark: { backgroundColor: theme.color.dark.background.primary },
  itemText: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 15, color: "#111827" },
  itemTextDark: { color: "#F3F4F6" },
  empty: { textAlign: "center", marginVertical: 28, color: "#6B7280", fontFamily: theme.typography.fontFamily },
  emptyDark: { color: "#9CA3AF" },
});

export default ContentTagPicker;
