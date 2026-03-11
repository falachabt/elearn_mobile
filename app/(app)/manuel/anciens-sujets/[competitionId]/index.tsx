import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import useSWR, { mutate } from "swr";

import { theme } from "@/constants/theme";
import { useFileDownload } from "@/hooks/useFileDownload";
import { ArchiveCard, type Archive as ArchiveCardItem } from "@/components/ArchiveCard";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/lib/supabase";
import { useCompetitionPayment } from "@/hooks/useCompetitionPayment";
import { useArchiveData } from "@/hooks/useArchiveData";
import CompetitionPaymentBottomSheet from "@/components/shared/CompetitionPaymentBottomSheet";

// PaymentOverlay Component
const PaymentOverlay = ({
  visible,
  isDark,
  onUnlock,
}: {
  visible: boolean;
  isDark: boolean;
  onUnlock: () => void;
}) => {
  if (!visible) return null;

  return (
    <View style={styles.paymentOverlay}>
      <View
        style={[
          styles.paymentOverlayContent,
          isDark && styles.paymentOverlayContentDark,
        ]}
      >
        <MaterialCommunityIcons
          name="lock"
          size={48}
          color={isDark ? theme.color.primary[400] : theme.color.primary[500]}
        />
        <Text style={[styles.paymentOverlayTitle, isDark && styles.textDark]}>
          Contenu verrouillé
        </Text>
        <Text
          style={[styles.paymentOverlayDescription, isDark && styles.textDark]}
        >
          Payez 2000 FCFA pour accéder à tous les sujets de ce concours
        </Text>
        <TouchableOpacity
          style={styles.paymentOverlayButton}
          onPress={onUnlock}
        >
          <MaterialCommunityIcons name="lock-open" size={20} color="#FFFFFF" />
          <Text style={styles.paymentOverlayButtonText}>
            Débloquer maintenant
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Reuse the Archive interface from the anales section
type Archive = Omit<ArchiveCardItem, "id" | "courses_categories" | "concour_id"> & {
  id: number;
  courses_categories?: {
    id: string;
    name: string | null;
    description: string | null;
  } | null;
  concour_id?: string | number | null;
};

interface CompetitionData {
  id: string;
  name: string;
}

type FilterButton = {
  id: FilterType;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
};

type FilterType = "all" | "pinned" | "completed" | "incomplete";

// Fetcher for competition data
const fetchCompetitionData = async (url: string): Promise<CompetitionData> => {
  if (!url) throw new Error("No URL provided");

  const id = url.split("/").pop();
  if (!id) throw new Error("No ID found in URL");

  const { data, error } = await supabase
    .from("concours")
    .select(
      `
      id,
      name
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("No data returned from API");

  return {
    id: String(data.id),
    name: data.name || "",
  };
};

// Fetcher for archives data
const fetchArchivesData = async (url: string): Promise<Archive[]> => {
  if (!url) throw new Error("No URL provided");

  const competitionId = url.split("/").pop();
  if (!competitionId) throw new Error("No competitionId found in URL");

  const { data, error } = await supabase
    .from("concours_archives")
    .select(
      `
      *,
      concours_corrections(*),
      courses_categories(
        id,
        name,
        description
      )
    `
    )
    .eq("concour_id", competitionId);

  if (error) throw error;
  if (!data) return [];

  // Transform to ensure it matches the Archive type
  return data.map((item) => ({
    id: Number(item.id),
    name: item.name || "",
    file_url: item.file_url || "",
    session: item.session || "",
    is_pinned: false, // Will be set by combining with pinned data
    file_type: (item.file_url && item.file_url.toLowerCase().endsWith('.pdf')) ? "pdf" : "other",
    concour_id: item.concour_id,
    courses_categories: item.courses_categories,
  }));
};

export const ArchivesList = () => {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const router = useRouter();
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "Tout"
  );
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { downloadState, checkIfFileExists, downloadFile } = useFileDownload();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { user } = useAuth();
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const isRevalidatingRef = useRef(false);

  // Competition payment hook
  const { hasAccess, accessLoading, checkAccess } =
    useCompetitionPayment();

  // Use shared archive data hook
  const {
    pinnedData,
    completedData,
    togglePin,
    toggleCompleted,
  } = useArchiveData(competitionId);

  // SWR hooks for data fetching
  const { data: competitionData, error: competitionError } =
    useSWR<CompetitionData>(
      competitionId ? `/competition/${competitionId}` : null,
      fetchCompetitionData,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 3600000, // Cache for 1 hour
        focusThrottleInterval: 5000, // Throttle focus events
      }
    );

  const { data: archivesData, error: archivesError } = useSWR<Archive[]>(
    competitionId ? `/archives/competition/${competitionId}` : null,
    fetchArchivesData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // Cache for 1 hour
      focusThrottleInterval: 5000, // Throttle focus events
    }
  );

  // Combine all data to create final archives with status
  const { archives, categories } = useMemo(() => {
    if (!archivesData) return { archives: [], categories: ["Tout"] };

    const completedArchiveIds = new Set(
      completedData?.map((item) => item.archive_id) || []
    );

    const pinnedArchivesMap = new Map(
      pinnedData?.map((item) => [item.archive_id, item.is_pinned]) || []
    );

    const updatedArchives = archivesData.map((archive) => ({
      ...archive,
      is_pinned: pinnedArchivesMap.get(archive.id) || false,
      is_completed: completedArchiveIds.has(archive.id),
    }));

    const uniqueCategories = [
      "Tout",
      ...new Set(
        updatedArchives
          .map((archive) => archive.courses_categories?.name)
          .filter(Boolean) as string[]
      ),
    ];

    return {
      archives: updatedArchives,
      categories: uniqueCategories,
    };
  }, [archivesData, pinnedData, completedData]);

  // Memoize filter buttons data and render function
  const filterButtonsData = useMemo(
    (): FilterButton[] => [
      {
        id: "all",
        icon: "format-list-bulleted",
        label: "Tout",
      },
      {
        id: "pinned",
        icon: "pin",
        label: "Épinglés",
      },
      {
        id: "completed",
        icon: "check-circle",
        label: "Terminés",
      },
      {
        id: "incomplete",
        icon: "circle-outline",
        label: "À faire",
      },
    ],
    []
  );

  const renderFilterButton = useCallback(
    ({ item }: { item: FilterButton }) => (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isDark && styles.filterButtonDark,
          filterType === item.id && styles.filterButtonActive,
        ]}
        onPress={() => {
          trigger(HapticType.LIGHT);
          setFilterType(item.id as FilterType);
        }}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={20}
          color={
            filterType === item.id
              ? "#FFFFFF"
              : isDark
              ? theme.color.gray[400]
              : theme.color.gray[600]
          }
        />
        <Text
          style={[
            styles.filterButtonText,
            isDark && styles.filterButtonTextDark,
            filterType === item.id && styles.filterButtonTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    ),
    [filterType, isDark, trigger]
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          isDark && styles.categoryChipDark,
          selectedCategory === item && styles.selectedCategoryChip,
        ]}
        onPress={() => {
          trigger(HapticType.LIGHT);
          setSelectedCategory(item);
        }}
      >
        <Text
          style={[
            styles.categoryText,
            selectedCategory === item && styles.selectedCategoryText,
            isDark && styles.textDark,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory, isDark, trigger]
  );

  // Check existing downloads for all archives
  React.useEffect(() => {
    archives.forEach((archive) => {
      checkIfFileExists(archive);
    });
  }, [archives, checkIfFileExists]);

  // Check if user has access to this competition
  useEffect(() => {
    if (competitionId && user) {
      checkAccess(competitionId);
    }
  }, [competitionId, user, checkAccess]);

  // Handle pinning an archive
  const handlePin = useCallback(
    async (archiveId: number | string) => {
      trigger(HapticType.LIGHT);
      const numericArchiveId = Number(archiveId);
      const archive = archives.find((a) => a.id === numericArchiveId);
      if (!archive) return;
      
      await togglePin(numericArchiveId, archive.is_pinned);
    },
    [trigger, archives, togglePin]
  );

  // Handle toggling completion status
  const handleToggleComplete = useCallback(
    async (archiveId: number | string) => {
      trigger(HapticType.SUCCESS);
      const numericArchiveId = Number(archiveId);
      const archive = archives.find((a) => a.id === numericArchiveId);
      if (!archive) return;
      
      await toggleCompleted(numericArchiveId, archive.is_completed || false);
    },
    [trigger, archives, toggleCompleted]
  );

  // Handle downloading an archive
  const handleDownload = useCallback(
    async (file: ArchiveCardItem) => {
      trigger(HapticType.MEDIUM);
      const success = await downloadFile(file);
      if (success) {
        // Update UI or show success message
      }
    },
    [trigger, downloadFile]
  );

  // Handle viewing an archive
  const handleView = useCallback(
    (file: ArchiveCardItem) => {
      trigger(HapticType.SELECTION);

      // If user doesn't have access, show payment sheet
      if (hasAccess === false) {
        setShowPaymentSheet(true);
        return;
      }

      router.push({
        pathname: "/manuel/anciens-sujets/[competitionId]/[filePath]/[fileId]",
        params: {
          competitionId: String(competitionId),
          fileId: file.id || "",
          filePath: downloadState[file.id]?.localPath || file.file_url || "",
        },
      });
    },
    [trigger, router, competitionId, downloadState, hasAccess]
  );

  // Filter archives based on search, category, and filter type
  const filteredArchives = useMemo(() => {
    return archives.filter((archive) => {
      const matchesSearch = archive.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        selectedCategory === "Tout" ||
        archive.courses_categories?.name === selectedCategory;

      let matchesFilter = false;

      switch (filterType) {
        case "all":
          matchesFilter = true;
          break;
        case "pinned":
          matchesFilter = archive.is_pinned;
          break;
        case "completed":
          matchesFilter = !!archive.is_completed;
          break;
        case "incomplete":
          matchesFilter = !archive.is_completed;
          break;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [archives, searchQuery, selectedCategory, filterType]);

  const handlePaymentSuccess = useCallback(async () => {
    if (!competitionId || !user?.id) return;
    
    // Prevent multiple simultaneous revalidations
    if (isRevalidatingRef.current) return;
    isRevalidatingRef.current = true;
    
    try {
      // Revalidate all data when payment is successful
      await checkAccess(competitionId, true); // Force refresh with true parameter
      mutate(`/archives/competition/${competitionId}`);
      mutate(`/pinned/${user.id}/${competitionId}`);
      mutate(`/completed/${user.id}/${competitionId}`);
    } finally {
      // Reset the flag after a short delay
      setTimeout(() => {
        isRevalidatingRef.current = false;
      }, 2000);
    }
  }, [competitionId, user?.id, checkAccess]); // Ajout de checkAccess dans les dépendances

  const renderItem = useCallback(
    ({ item }: { item: Archive }) => (
      <ArchiveCard
        item={item}
        isDark={isDark}
        onPin={handlePin}
        onDownload={handleDownload}
        onView={handleView}
        onToggleComplete={handleToggleComplete}
        downloadState={downloadState[item.id] || {}}
      />
    ),
    [
      isDark,
      handlePin,
      handleDownload,
      handleView,
      handleToggleComplete,
      downloadState,
    ]
  );

  const keyExtractor = useCallback((item: Archive) => item.id.toString(), []);
  // Determine if we should show loading (only for initial load)
  const isInitialLoading = !archivesData && !archivesError;

  // Show error state if any critical error occurs
  if (competitionError || archivesError) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
          <Text style={[styles.errorText, isDark && styles.textDark]}>
            Erreur lors du chargement des données
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            trigger(HapticType.LIGHT);
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          {competitionData?.name || "Chargement..."}
        </Text>

        {/* Payment status indicator */}
        {!accessLoading && hasAccess === false && (
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => setShowPaymentSheet(true)}
          >
            <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>Débloquer</Text>
          </TouchableOpacity>
        )}

        {!accessLoading && hasAccess === true && (
          <View style={styles.accessGrantedBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.accessGrantedText}>Accès</Text>
          </View>
        )}
      </View>

      {/* Only show loading for initial data fetch */}
      {isInitialLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.color.primary[500]}
          style={styles.loader}
        />
      ) : (
        <>
          {/* Filters */}
          <View style={styles.filtersContainer}>
            {/* Filter buttons */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterButtonsContainer}
              data={filterButtonsData}
              renderItem={renderFilterButton}
              keyExtractor={(item) => item.id}
              removeClippedSubviews={true}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
            />

            {/* Categories */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
              style={styles.categoriesScroll}
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              removeClippedSubviews={true}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
            />
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
              />
              <TextInput
                placeholder="Rechercher dans les archives..."
                placeholderTextColor={
                  isDark ? theme.color.gray[400] : theme.color.gray[600]
                }
                style={[styles.searchInput, isDark && styles.textDark]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Archives List */}
          <FlatList
            data={filteredArchives}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="file-search-outline"
                  size={48}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                />
                <Text style={[styles.emptyText, isDark && styles.textDark]}>
                  Aucun ancien sujet trouvé pour ce concours.
                </Text>
              </View>
            }
          />

          {/* Payment overlay for users without access */}
          <PaymentOverlay
            visible={
              !accessLoading &&
              hasAccess === false &&
              filteredArchives.length > 0
            }
            isDark={isDark}
            onUnlock={() => setShowPaymentSheet(true)}
          />
        </>
      )}

      {/* Competition Payment Bottom Sheet */}
      {competitionId && showPaymentSheet && (
        <CompetitionPaymentBottomSheet
          visible={true}
          onClose={() => setShowPaymentSheet(false)}
          competitionId={competitionId}
          competitionName={competitionData?.name || "ce concours"}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 70,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    marginLeft: "auto",
  },
  paymentButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  accessGrantedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.success[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    marginLeft: "auto",
  },
  accessGrantedText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  paymentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 10,
  },
  paymentOverlayContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.medium,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentOverlayContentDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  paymentOverlayTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 8,
  },
  paymentOverlayDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[600],
    textAlign: "center",
    marginBottom: 24,
  },
  textLightDark: {
    color: theme.color.gray[400],
  },
  paymentOverlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
  },
  paymentOverlayButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  filtersContainer: {
    paddingTop: 8,
  },
  filterButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    gap: 8,
  },
  filterButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  filterButtonActive: {
    backgroundColor: theme.color.primary[500],
  },
  filterButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
  filterButtonTextDark: {
    color: theme.color.gray[400],
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBoxDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#1A1A1A",
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 48,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    marginRight: 8,
    height: 40,
  },
  categoryChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  selectedCategoryChip: {
    backgroundColor: theme.color.primary[500],
  },
  categoryText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  textDark: {
    color: "#FFFFFF",
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    color: "#1A1A1A",
  },
  errorContainer: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    color: "#1A1A1A",
  },
});

export default ArchivesList;
