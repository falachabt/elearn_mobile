import React, { useState, useMemo } from "react";
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
import { useSecondaryDocuments, useSecondaryDocumentBreadcrumb } from "@/hooks/secondary/useSecondaryDocuments";
import { useSecondaryProgram } from "@/hooks/secondary/useSecondaryPrograms";
import { ThemedText } from "@/components/ThemedText";
import { useDocumentsStatus, DocumentFilter } from "@/hooks/secondary/useDocumentActions";

const SecondaryDocumentsScreen = () => {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { trigger } = useHaptics();

  // Fetch program data for header title
  const { program } = useSecondaryProgram(programId);
  
  // Get program title
  const programTitle = program?.class?.name && program?.serie?.name
    ? `${program.class.name} - ${program.serie.name}`
    : 'Documents';

  if (!programId) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          Programme introuvable
        </ThemedText>
      </View>
    );
  }

  const { folders, documents, isLoading, isError } = useSecondaryDocuments(
    programId,
    currentFolderId
  );
  const { breadcrumb } = useSecondaryDocumentBreadcrumb(currentFolderId);

  // Récupérer les statuts des documents (completed/pinned)
  const documentIds = useMemo(() => documents.map(doc => doc.id), [documents]);
  const { completedIds, pinnedIds, filteredDocumentIds } = useDocumentsStatus(documentIds, filter);

  // Filtrer les documents selon le filtre sélectionné
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => filteredDocumentIds.includes(doc.id));
  }, [documents, filteredDocumentIds]);

  const handleFilterChange = (newFilter: DocumentFilter) => {
    trigger(HapticType.LIGHT);
    setFilter(newFilter);
  };

  const handleFolderPress = (folderId: string) => {
    trigger(HapticType.LIGHT);
    setCurrentFolderId(folderId);
  };

  const handleDocumentPress = (documentId: string) => {
    trigger(HapticType.LIGHT);
    const docPath = `/(app)/secondary/program/${programId}/documents/${documentId}`;
    router.push(docPath as Href);
  };

  const handleBreadcrumbPress = (folderId: string | null) => {
    trigger(HapticType.LIGHT);
    setCurrentFolderId(folderId);
  };

  const handleGoBack = () => {
    if (breadcrumb.length > 0) {
      const parentFolder = breadcrumb[breadcrumb.length - 2];
      setCurrentFolderId(parentFolder?.id || null);
    } else {
      setCurrentFolderId(null);
    }
  };

  if (isLoading) {
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
      {/* Program Title Header */}
      <View style={[styles.titleHeader, isDark && styles.titleHeaderDark]}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButtonHeader}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          
          <View style={styles.titleContent}>
            <ThemedText style={[styles.titleText, isDark && styles.titleTextDark]}>
              {programTitle}
            </ThemedText>
            <ThemedText style={[styles.subtitleText, isDark && styles.subtitleTextDark]}>
              Documents
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Header with breadcrumb */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        {currentFolderId && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
          >
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
          <TouchableOpacity
            onPress={() => handleBreadcrumbPress(null)}
            style={styles.breadcrumbItem}
          >
            <MaterialCommunityIcons
              name="home"
              size={20}
              color={!currentFolderId ? theme.color.primary[600] : isDark ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              style={[
                styles.breadcrumbText,
                !currentFolderId && styles.breadcrumbTextActive,
                isDark && styles.breadcrumbTextDark,
              ]}
            >
              Racine
            </Text>
          </TouchableOpacity>
          {breadcrumb.map((folder) => (
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
          ))}
        </ScrollView>
      </View>

      {/* Filtres */}
      <View style={[styles.filterContainer, isDark && styles.filterContainerDark]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterChip
            label="Tous"
            count={documents.length}
            isActive={filter === 'all'}
            onPress={() => handleFilterChange('all')}
            icon="file-document-multiple"
            isDark={isDark}
          />
          <FilterChip
            label="Complétés"
            count={completedIds.size}
            isActive={filter === 'completed'}
            onPress={() => handleFilterChange('completed')}
            icon="check-circle"
            isDark={isDark}
          />
          <FilterChip
            label="Non complétés"
            count={documents.length - completedIds.size}
            isActive={filter === 'not-completed'}
            onPress={() => handleFilterChange('not-completed')}
            icon="circle-outline"
            isDark={isDark}
          />
          <FilterChip
            label="Épinglés"
            count={pinnedIds.size}
            isActive={filter === 'pinned'}
            onPress={() => handleFilterChange('pinned')}
            icon="pin"
            isDark={isDark}
          />
          <FilterChip
            label="Non épinglés"
            count={documents.length - pinnedIds.size}
            isActive={filter === 'not-pinned'}
            onPress={() => handleFilterChange('not-pinned')}
            icon="pin-off"
            isDark={isDark}
          />
        </ScrollView>
      </View>

      {/* Empty state */}
      {folders.length === 0 && filteredDocuments.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="folder-open-outline"
            size={64}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            Aucun document ou dossier disponible
          </ThemedText>
        </View>
      )}

      {/* Folders and documents list */}
      <FlatList
        data={[...folders, ...filteredDocuments]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isFolder = "parent_folder_id" in item;
          const icon = isFolder ? "folder" : "file-document-outline";
          const color = isFolder
            ? theme.color.primary[600]
            : isDark
            ? "#60A5FA"
            : "#3B82F6";

          const isCompleted = !isFolder && completedIds.has(item.id);
          const isPinned = !isFolder && pinnedIds.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.item, isDark && styles.itemDark]}
              onPress={() =>
                isFolder
                  ? handleFolderPress(item.id)
                  : handleDocumentPress(item.id)
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: color + (isDark ? "20" : "10") },
                ]}
              >
                <MaterialCommunityIcons name={icon} size={24} color={color} />
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
                    style={[
                      styles.itemDescription,
                      isDark && styles.itemDescriptionDark,
                    ]}
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
    </View>
  );
};

// Composant FilterChip pour les filtres
interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
  icon: string;
  isDark: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  isActive,
  onPress,
  icon,
  isDark,
}) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      isActive && styles.filterChipActive,
      isDark && !isActive && styles.filterChipDark,
    ]}
    onPress={onPress}
  >
    <MaterialCommunityIcons
      name={icon as any}
      size={16}
      color={
        isActive
          ? "#FFFFFF"
          : isDark
          ? "#9CA3AF"
          : "#6B7280"
      }
      style={styles.filterIcon}
    />
    <Text
      style={[
        styles.filterLabel,
        isActive && styles.filterLabelActive,
        isDark && !isActive && styles.filterLabelDark,
      ]}
    >
      {label}
    </Text>
    <View
      style={[
        styles.filterCount,
        isActive && styles.filterCountActive,
        isDark && !isActive && styles.filterCountDark,
      ]}
    >
      <Text
        style={[
          styles.filterCountText,
          isActive && styles.filterCountTextActive,
        ]}
      >
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingBottom: 60
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonHeader: {
    marginRight: 8,
    padding: 4,
  },
  titleContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  titleTextDark: {
    color: "#F9FAFB",
  },
  subtitleText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
  },
  subtitleTextDark: {
    color: "#9CA3AF",
  },
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
  backButton: {
    marginRight: 12,
  },
  breadcrumbContainer: {
    flex: 1,
  },
  breadcrumbContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
    fontFamily: theme.typography.fontFamily,
  },
  breadcrumbTextDark: {
    color: "#9CA3AF",
  },
  breadcrumbTextActive: {
    color: theme.color.primary[600],
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  emptyTextDark: {
    color: "#9CA3AF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 12,
    marginBottom: 8,
  },
  itemDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  statusIcon: {
    marginLeft: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
    flex: 1,
  },
  itemNameDark: {
    color: "#F9FAFB",
  },
  itemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  itemDescriptionDark: {
    color: "#9CA3AF",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
  },
  loadingTextDark: {
    color: "#9CA3AF",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: {
    color: "#EF4444",
  },
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
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipDark: {
    backgroundColor: "#374151",
  },
  filterChipActive: {
    backgroundColor: theme.color.primary[600],
  },
  filterIcon: {
    marginRight: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
    marginRight: 6,
  },
  filterLabelDark: {
    color: "#9CA3AF",
  },
  filterLabelActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountDark: {
    backgroundColor: "#4B5563",
  },
  filterCountActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },
});

export default SecondaryDocumentsScreen;
