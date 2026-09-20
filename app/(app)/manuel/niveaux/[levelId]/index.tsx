import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { useColorScheme } from "@/hooks/useColorScheme";
import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import {
  useLevel,
  useLevelDocuments,
  useLevelDocumentBreadcrumb,
} from "@/hooks/secondary/useLevelDocuments";
import type {
  SecondaryLevelDocumentFolder,
  SecondaryLevelDocument,
} from "@/services/secondary/level-documents.service";
import { ThemedText } from "@/components/ThemedText";
import {
  useLevelDocumentsStatus,
  usePinnedLevelDocuments,
  LevelDocumentFilter,
} from "@/hooks/secondary/useLevelDocumentActions";
import { useFeatureFlag } from "posthog-react-native";
import { useLevelDocumentsPayment } from "@/hooks/useLevelDocumentsPayment";
import { LevelDocumentsPaymentBottomSheet } from "@/components/shared/documents/LevelDocumentsPaymentBottomSheet";

const PINNED_VIRTUAL_FOLDER_ID = "__pinned__";

type PinnedVirtualFolder = {
  id: string;
  parent_folder_id: null;
  name: string;
  description: string;
};

type ListItem = SecondaryLevelDocumentFolder | SecondaryLevelDocument | PinnedVirtualFolder;

const LevelDocumentsScreen = () => {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewingPinnedFolder, setViewingPinnedFolder] = useState(false);
  const [filter, setFilter] = useState<LevelDocumentFilter>("all");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { trigger } = useHaptics();

  const { level } = useLevel(levelId);
  const { pinnedDocuments } = usePinnedLevelDocuments(levelId);
  const documentsParNiveauEnabled = useFeatureFlag("documents_par_niveau_enabled");
  const { hasAccess, accessLoading, checkAccess } = useLevelDocumentsPayment(levelId);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    if (documentsParNiveauEnabled === false) {
      router.replace("/(app)/manuel" as Href);
    }
  }, [documentsParNiveauEnabled]);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!levelId) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          Niveau introuvable
        </ThemedText>
      </View>
    );
  }

  const { folders, documents, isLoading, isError } = useLevelDocuments(levelId, currentFolderId);
  const { breadcrumb } = useLevelDocumentBreadcrumb(currentFolderId);

  const documentIds = useMemo(() => documents.map((doc) => doc.id), [documents]);
  const { completedIds, pinnedIds, filteredDocumentIds } = useLevelDocumentsStatus(
    documentIds,
    filter
  );

  const filteredDocuments = useMemo(
    () =>
      documents
        .filter((doc) => filteredDocumentIds.includes(doc.id))
        .sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id))),
    [documents, filteredDocumentIds, pinnedIds]
  );

  const listData = useMemo((): ListItem[] => {
    if (viewingPinnedFolder) return pinnedDocuments;

    const items: ListItem[] = [...folders, ...filteredDocuments];
    if (!currentFolderId && pinnedDocuments.length > 0) {
      const pinnedFolder: PinnedVirtualFolder = {
        id: PINNED_VIRTUAL_FOLDER_ID,
        parent_folder_id: null,
        name: "Mes documents épinglés",
        description: `${pinnedDocuments.length} document${pinnedDocuments.length > 1 ? "s" : ""}`,
      };
      items.unshift(pinnedFolder);
    }
    return items;
  }, [viewingPinnedFolder, pinnedDocuments, folders, filteredDocuments, currentFolderId]);

  const handleFilterChange = (newFilter: LevelDocumentFilter) => {
    trigger(HapticType.LIGHT);
    setFilter(newFilter);
  };

  const handleFolderPress = (folderId: string) => {
    trigger(HapticType.LIGHT);
    if (folderId === PINNED_VIRTUAL_FOLDER_ID) {
      setViewingPinnedFolder(true);
      return;
    }
    setCurrentFolderId(folderId);
  };

  const handleDocumentPress = (documentId: string) => {
    trigger(HapticType.LIGHT);
    router.push(`/(app)/manuel/niveaux/${levelId}/${documentId}` as Href);
  };

  const handleBreadcrumbPress = (folderId: string | null) => {
    trigger(HapticType.LIGHT);
    setViewingPinnedFolder(false);
    setCurrentFolderId(folderId);
  };

  const handleGoBack = () => {
    if (viewingPinnedFolder) {
      setViewingPinnedFolder(false);
      return;
    }
    if (breadcrumb.length > 0) {
      const parentFolder = breadcrumb[breadcrumb.length - 2];
      setCurrentFolderId(parentFolder?.id || null);
    } else {
      setCurrentFolderId(null);
    }
  };

  if (isLoading || accessLoading || hasAccess === null) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ActivityIndicator size="large" color={theme.color.primary[600]} />
        <ThemedText style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement des documents...
        </ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={isDark ? "#EF4444" : "#DC2626"}
        />
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          Erreur lors du chargement des documents
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.titleHeader, isDark && styles.titleHeaderDark]}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          <View style={styles.titleContent}>
            <ThemedText style={[styles.titleText, isDark && styles.titleTextDark]}>
              {level?.name || "Documents"}
            </ThemedText>
            <ThemedText style={[styles.subtitleText, isDark && styles.subtitleTextDark]}>
              Documents
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.header, isDark && styles.headerDark]}>
        {(currentFolderId || viewingPinnedFolder) && (
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={isDark ? "#F9FAFB" : "#111827"}
            />
          </TouchableOpacity>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbContainer}
          contentContainerStyle={styles.breadcrumbContent}
        >
          <TouchableOpacity onPress={() => handleBreadcrumbPress(null)} style={styles.breadcrumbItem}>
            <MaterialCommunityIcons
              name="home"
              size={20}
              color={!currentFolderId && !viewingPinnedFolder ? theme.color.primary[600] : isDark ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              style={[
                styles.breadcrumbText,
                !currentFolderId && !viewingPinnedFolder && styles.breadcrumbTextActive,
                isDark && styles.breadcrumbTextDark,
              ]}
            >
              Racine
            </Text>
          </TouchableOpacity>
          {viewingPinnedFolder ? (
            <React.Fragment>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
              <View style={styles.breadcrumbItem}>
                <Text style={[styles.breadcrumbText, styles.breadcrumbTextActive, isDark && styles.breadcrumbTextDark]}>
                  Mes documents épinglés
                </Text>
              </View>
            </React.Fragment>
          ) : (
            breadcrumb.map((folder) => (
              <React.Fragment key={folder.id}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                />
                <TouchableOpacity
                  onPress={() => handleBreadcrumbPress(folder.id)}
                  style={styles.breadcrumbItem}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      folder.id === currentFolderId && styles.breadcrumbTextActive,
                      isDark && styles.breadcrumbTextDark,
                    ]}
                  >
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </View>

      {!viewingPinnedFolder && <View style={[styles.filterContainer, isDark && styles.filterContainerDark]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterChip
            label="Tous"
            count={documents.length}
            isActive={filter === "all"}
            onPress={() => handleFilterChange("all")}
            icon="file-document-multiple"
            isDark={isDark}
          />
          <FilterChip
            label="Complétés"
            count={completedIds.size}
            isActive={filter === "completed"}
            onPress={() => handleFilterChange("completed")}
            icon="check-circle"
            isDark={isDark}
          />
          <FilterChip
            label="Non complétés"
            count={documents.length - completedIds.size}
            isActive={filter === "not-completed"}
            onPress={() => handleFilterChange("not-completed")}
            icon="circle-outline"
            isDark={isDark}
          />
          <FilterChip
            label="Épinglés"
            count={pinnedIds.size}
            isActive={filter === "pinned"}
            onPress={() => handleFilterChange("pinned")}
            icon="pin"
            isDark={isDark}
          />
          <FilterChip
            label="Non épinglés"
            count={documents.length - pinnedIds.size}
            isActive={filter === "not-pinned"}
            onPress={() => handleFilterChange("not-pinned")}
            icon="pin-off"
            isDark={isDark}
          />
        </ScrollView>
      </View>}

      {listData.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="folder-open-outline"
            size={64}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            {viewingPinnedFolder ? "Aucun document épinglé" : "Aucun document ou dossier disponible"}
          </ThemedText>
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPinnedVirtualFolder = item.id === PINNED_VIRTUAL_FOLDER_ID;
          const isFolder = "parent_folder_id" in item;
          const icon = isPinnedVirtualFolder
            ? "pin"
            : isFolder
            ? "folder"
            : "file-document-outline";
          const color = isPinnedVirtualFolder
            ? "#D97706"
            : isFolder
            ? theme.color.primary[600]
            : isDark
            ? "#60A5FA"
            : "#3B82F6";

          const isCompleted = !isFolder && completedIds.has(item.id);
          const isPinned = !isFolder && (viewingPinnedFolder || pinnedIds.has(item.id));
          const isFirstDocument = !isFolder && filteredDocuments[0]?.id === item.id;
          const isLocked =
            !isFolder &&
            !isPinnedVirtualFolder &&
            !viewingPinnedFolder &&
            hasAccess === false &&
            !isFirstDocument;

          return (
            <TouchableOpacity
              style={[
                styles.item,
                isDark && styles.itemDark,
                isPinnedVirtualFolder && (isDark ? styles.itemPinnedDark : styles.itemPinned),
                !isPinnedVirtualFolder && isCompleted && (isDark ? styles.itemCompletedDark : styles.itemCompleted),
                !isPinnedVirtualFolder && !isCompleted && isPinned && (isDark ? styles.itemPinnedDark : styles.itemPinned),
                isLocked && styles.itemLocked,
              ]}
              onPress={() => {
                if (isLocked) {
                  trigger(HapticType.ERROR);
                  setShowPaymentSheet(true);
                  return;
                }
                isFolder ? handleFolderPress(item.id) : handleDocumentPress(item.id);
              }}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: color + (isDark ? "20" : "10") }]}
              >
                <MaterialCommunityIcons
                  name={isLocked ? "lock-outline" : icon}
                  size={24}
                  color={isLocked ? (isDark ? theme.color.gray[400] : theme.color.gray[600]) : color}
                />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <ThemedText
                    style={[styles.itemName, isDark && styles.itemNameDark]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </ThemedText>
                  {!isFolder && (
                    <View style={styles.statusIcons}>
                      {isPinned && (
                        <MaterialCommunityIcons
                          name="pin"
                          size={16}
                          color={theme.color.primary[600]}
                          style={styles.statusIcon}
                        />
                      )}
                      {isCompleted && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={16}
                          color="#10B981"
                          style={styles.statusIcon}
                        />
                      )}
                    </View>
                  )}
                </View>
                {item.description && (
                  <ThemedText
                    style={[styles.itemDescription, isDark && styles.itemDescriptionDark]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </ThemedText>
                )}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </TouchableOpacity>
          );
        }}
      />

      <LevelDocumentsPaymentBottomSheet
        visible={showPaymentSheet}
        levelId={levelId}
        levelName={level?.name}
        onClose={() => setShowPaymentSheet(false)}
        onPaymentSuccess={() => {
          setShowPaymentSheet(false);
          checkAccess(true);
        }}
      />
    </View>
  );
};

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
  icon: string;
  isDark: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, count, isActive, onPress, icon, isDark }) => (
  <TouchableOpacity
    style={[styles.filterChip, isActive && styles.filterChipActive, isDark && !isActive && styles.filterChipDark]}
    onPress={onPress}
  >
    <MaterialCommunityIcons
      name={icon as any}
      size={16}
      color={isActive ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280"}
      style={styles.filterIcon}
    />
    <Text style={[styles.filterLabel, isActive && styles.filterLabelActive, isDark && !isActive && styles.filterLabelDark]}>
      {label}
    </Text>
    <View style={[styles.filterCount, isActive && styles.filterCountActive, isDark && !isActive && styles.filterCountDark]}>
      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>{count}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingBottom: 60 },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  centered: { justifyContent: "center", alignItems: "center" },
  titleHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  titleHeaderDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: "#374151",
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  backButtonHeader: { marginRight: 8, padding: 4 },
  titleContent: { flex: 1 },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  titleTextDark: { color: "#F9FAFB" },
  subtitleText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
  },
  subtitleTextDark: { color: "#9CA3AF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: "#374151",
  },
  backButton: { marginRight: 12 },
  breadcrumbContainer: { flex: 1 },
  breadcrumbContent: { flexDirection: "row", alignItems: "center" },
  breadcrumbItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 4 },
  breadcrumbText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
    fontFamily: theme.typography.fontFamily,
  },
  breadcrumbTextDark: { color: "#9CA3AF" },
  breadcrumbTextActive: { color: theme.color.primary[600], fontWeight: "600" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  emptyTextDark: { color: "#9CA3AF" },
  listContent: { padding: 16, paddingBottom: 32 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 12,
    marginBottom: 8,
  },
  itemDark: { backgroundColor: theme.color.dark.background.secondary },
  itemCompleted: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  itemCompletedDark: {
    backgroundColor: "#052E1655",
    borderWidth: 1,
    borderColor: "#059669",
  },
  itemPinned: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  itemPinnedDark: {
    backgroundColor: "#78350F33",
    borderWidth: 1,
    borderColor: "#D97706",
  },
  itemLocked: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusIcons: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  statusIcon: { marginLeft: 4 },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
    flex: 1,
  },
  itemNameDark: { color: "#F9FAFB" },
  itemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  itemDescriptionDark: { color: "#9CA3AF" },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
  },
  loadingTextDark: { color: "#9CA3AF" },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: { color: "#EF4444" },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  filterContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: "#374151",
  },
  filterScrollContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipDark: { backgroundColor: "#374151" },
  filterChipActive: { backgroundColor: theme.color.primary[600] },
  filterIcon: { marginRight: 4 },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
    marginRight: 6,
  },
  filterLabelDark: { color: "#9CA3AF" },
  filterLabelActive: { color: "#FFFFFF" },
  filterCount: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountDark: { backgroundColor: "#4B5563" },
  filterCountActive: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  filterCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
  },
  filterCountTextActive: { color: "#FFFFFF" },
});

export default LevelDocumentsScreen;
