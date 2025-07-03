import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { theme } from "@/constants/theme";
import { useFileDownload } from "@/hooks/useFileDownload";
import { ArchiveCard } from "@/components/ArchiveCard";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useCompetitionPayment } from "@/hooks/useCompetitionPayment";
import CompetitionPaymentBottomSheet from "@/components/shared/CompetitionPaymentBottomSheet";

// PaymentOverlay Component
const PaymentOverlay = ({ visible, isDark, onUnlock }: { visible: boolean, isDark: boolean, onUnlock: () => void }) => {
  if (!visible) return null;

  return (
    <View style={styles.paymentOverlay}>
      <View style={[styles.paymentOverlayContent, isDark && styles.paymentOverlayContentDark]}>
        <MaterialCommunityIcons
          name="lock"
          size={48}
          color={isDark ? theme.color.primary[400] : theme.color.primary[500]}
        />
        <Text style={[styles.paymentOverlayTitle, isDark && styles.textDark]}>
          Contenu verrouillé
        </Text>
        <Text style={[styles.paymentOverlayDescription, isDark && styles.textDark]}>
          Payez 2000 FCFA pour accéder à tous les sujets de ce concours
        </Text>
        <TouchableOpacity
          style={styles.paymentOverlayButton}
          onPress={onUnlock}
        >
          <MaterialCommunityIcons name="lock-open" size={20} color="#FFFFFF" />
          <Text style={styles.paymentOverlayButtonText}>Débloquer maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Reuse the Archive interface from the anales section
export interface Archive {
  id: string;
  name: string;
  file_url: string;
  session: string;
  is_pinned: boolean;
  is_completed?: boolean;
  local_path?: string;
  file_type: "pdf" | "doc" | "other";
  courses_categories?: {
    id: string;
    name: string;
    description: string;
  };
  concour_id?: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface CompetitionData {
  id: number;
  name: string;
}

interface PinnedStatus {
  archive_id: string;
  is_pinned: boolean;
}

interface CompletedStatus {
  archive_id: string;
}

type FilterType = 'all' | 'pinned' | 'completed' | 'incomplete';

// Fetcher for competition data
const fetchCompetitionData = async (url: string): Promise<CompetitionData> => {
  if (!url) throw new Error("No URL provided");

  const id = url.split('/').pop();
  if (!id) throw new Error("No ID found in URL");

  const { data, error } = await supabase
      .from("concours")
      .select(`
      id,
      name
    `)
      .eq("id", id)
      .single();

  if (error) throw error;
  if (!data) throw new Error("No data returned from API");

  return {
    id: data.id,
    name: data.name || ""
  };
};

// Fetcher for archives data
const fetchArchivesData = async (url: string): Promise<Archive[]> => {
  if (!url) throw new Error("No URL provided");

  const competitionId = url.split('/').pop();
  if (!competitionId) throw new Error("No competitionId found in URL");

  const { data, error } = await supabase
      .from("concours_archives")
      .select(`
      *,
      concours_corrections(*),
      courses_categories(
        id,
        name,
        description
      )
    `)
      .eq("concour_id", competitionId);

  if (error) throw error;
  if (!data) return [];

  // Transform to ensure it matches the Archive type
  return data.map(item => ({
    id: item.id,
    name: item.name || "",
    file_url: item.file_url || "",
    session: item.session || "",
    is_pinned: false, // Will be set by combining with pinned data
    file_type: item.file_type || "other",
    concour_id: item.concour_id,
    courses_categories: item.courses_categories
  }));
};

// Fetcher for pinned status
const fetchPinnedData = async (url: string): Promise<PinnedStatus[]> => {
  if (!url) throw new Error("No URL provided");

  const parts = url.split('/');
  const userId = parts[parts.length - 2];
  const competitionId = parts[parts.length - 1];

  if (!userId || !competitionId) throw new Error("Missing userId or competitionId");

  // First get all archives for this competition to filter pinned data
  const { data: archivesData, error: archivesError } = await supabase
      .from("concours_archives")
      .select("id")
      .eq("concour_id", competitionId);

  if (archivesError) throw archivesError;
  if (!archivesData || archivesData.length === 0) return [];

  const archiveIds = archivesData.map(archive => archive.id);

  const { data, error } = await supabase
      .from("user_pinned_archive")
      .select("archive_id, is_pinned")
      .in("archive_id", archiveIds)
      .eq("user_id", userId);

  if (error) throw error;
  return data || [];
};

// Fetcher for completed status
const fetchCompletedData = async (url: string): Promise<CompletedStatus[]> => {
  if (!url) throw new Error("No URL provided");

  const parts = url.split('/');
  const userId = parts[parts.length - 2];
  const competitionId = parts[parts.length - 1];

  if (!userId || !competitionId) throw new Error("Missing userId or competitionId");

  // First get all archives for this competition to filter completed data
  const { data: archivesData, error: archivesError } = await supabase
      .from("concours_archives")
      .select("id")
      .eq("concour_id", competitionId);

  if (archivesError) throw archivesError;
  if (!archivesData || archivesData.length === 0) return [];

  const archiveIds = archivesData.map(archive => archive.id);

  const { data, error } = await supabase
      .from("user_completed_archives")
      .select("archive_id")
      .in("archive_id", archiveIds)
      .eq("user_id", userId);

  if (error) throw error;
  return data || [];
};

export const ArchivesList = () => {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const router = useRouter();
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>("Tout");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const { downloadState, checkIfFileExists, downloadFile } = useFileDownload();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { user } = useAuth();
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  // Competition payment hook
  const { 
    hasAccess, 
    accessLoading, 
    checkAccess, 
    paymentStatus 
  } = useCompetitionPayment();

  // SWR hooks for data fetching
  const { data: competitionData, error: competitionError } = useSWR<CompetitionData>(
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

  const { data: pinnedData, error: pinnedError } = useSWR<PinnedStatus[]>(
      competitionId && user?.id ? `/pinned/${user.id}/${competitionId}` : null,
      fetchPinnedData,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // Cache for 1 minute
        focusThrottleInterval: 5000, // Throttle focus events
      }
  );

  const { data: completedData, error: completedError } = useSWR<CompletedStatus[]>(
      competitionId && user?.id ? `/completed/${user.id}/${competitionId}` : null,
      fetchCompletedData,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // Cache for 1 minute
        focusThrottleInterval: 5000, // Throttle focus events
      }
  );

  // Combine all data to create final archives with status
  const { archives, categories } = useMemo(() => {
    if (!archivesData) return { archives: [], categories: ["Tout"] };

    const completedArchiveIds = new Set(
        completedData?.map(item => item.archive_id) || []
    );

    const pinnedArchivesMap = new Map(
        pinnedData?.map(item => [item.archive_id, item.is_pinned]) || []
    );

    const updatedArchives = archivesData.map((archive) => ({
      ...archive,
      is_pinned: pinnedArchivesMap.get(archive.id) || false,
      is_completed: completedArchiveIds.has(archive.id)
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
      categories: uniqueCategories
    };
  }, [archivesData, pinnedData, completedData]);

  // Memoize filter buttons data and render function
  const filterButtonsData = useMemo(() => [
    {
      id: 'all',
      icon: 'format-list-bulleted',
      label: 'Tout'
    },
    {
      id: 'pinned',
      icon: 'pin',
      label: 'Épinglés'
    },
    {
      id: 'completed',
      icon: 'check-circle',
      label: 'Terminés'
    },
    {
      id: 'incomplete',
      icon: 'circle-outline',
      label: 'À faire'
    }
  ], []);

  const renderFilterButton = useCallback(({ item } : { item : any}) => (
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
            color={filterType === item.id ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
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
  ), [filterType, isDark, trigger]);

  const renderCategoryItem = useCallback(({item}: { item: string }) => (
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
  ), [selectedCategory, isDark, trigger]);

  // Check existing downloads for all archives
  React.useEffect(() => {
    archives.forEach((archive) => {
      checkIfFileExists(archive);
    });
  }, [archives, checkIfFileExists]);

  // Check if user has access to this competition
  useEffect(() => {
    if (competitionId && user) {
      // Use a timeout to debounce the access check and prevent UI flickering
      const timer = setTimeout(() => {
        checkAccess(competitionId);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [competitionId, user, checkAccess]);

  // Handle pinning an archive
  const handlePin = useCallback(async (archiveId: string) => {
    try {
      trigger(HapticType.LIGHT);

      const archive = archives.find((a) => a.id === archiveId);
      if (!archive) return;

      // Optimistically update the UI
      const newPinnedStatus = !archive.is_pinned;
      mutate(`/pinned/${user?.id}/${competitionId}`,
          (currentData: PinnedStatus[] = []) => {
            const updatedData = [...currentData];
            const existingIndex = updatedData.findIndex(item => item.archive_id === archiveId);

            if (existingIndex >= 0) {
              updatedData[existingIndex].is_pinned = newPinnedStatus;
            } else {
              updatedData.push({archive_id: archiveId, is_pinned: true});
            }

            return updatedData;
          },
          false
      );

      const {data: existingPin, error: fetchError} = await supabase
          .from("user_pinned_archive")
          .select("archive_id, is_pinned")
          .eq("archive_id", archiveId)
          .eq("user_id", user?.id)
          .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      let error;
      if (existingPin) {
        const {error: updateError} = await supabase
            .from("user_pinned_archive")
            .update({is_pinned: !existingPin.is_pinned})
            .eq("archive_id", archiveId)
            .eq("user_id", user?.id);
        error = updateError;
      } else {
        const {error: insertError} = await supabase
            .from("user_pinned_archive")
            .insert({
              archive_id: archiveId,
              is_pinned: true,
              user_id: user?.id,
            });
        error = insertError;
      }

      if (error) throw error;

      // Revalidate to ensure server state
      mutate(`/pinned/${user?.id}/${competitionId}`);
    } catch (error) {
      console.error("Error updating pin status:", error);
      // Revert optimistic update on error
      mutate(`/pinned/${user?.id}/${competitionId}`);
    }
  }, [trigger, archives, user?.id, competitionId]);

  // Handle toggling completion status
  const handleToggleComplete = useCallback(async (archiveId: string) => {
    try {
      trigger(HapticType.SUCCESS);

      const archive = archives.find((a) => a.id === archiveId);
      if (!archive) return;

      const isCurrentlyCompleted = archive.is_completed;

      // Optimistically update the UI
      mutate(`/completed/${user?.id}/${competitionId}`,
          (currentData: CompletedStatus[] = []) => {
            if (isCurrentlyCompleted) {
              return currentData.filter(item => item.archive_id !== archiveId);
            } else {
              return [...currentData, {archive_id: archiveId}];
            }
          },
          false
      );

      if (isCurrentlyCompleted) {
        // Remove completion status
        const {error} = await supabase
            .from("user_completed_archives")
            .delete()
            .eq("user_id", user?.id)
            .eq("archive_id", archiveId);

        if (error) throw error;
      } else {
        // Check if record already exists to avoid constraint error
        const {data: existingRecord} = await supabase
            .from("user_completed_archives")
            .select("id")
            .eq("user_id", user?.id)
            .eq("archive_id", archiveId);

        if (existingRecord && existingRecord.length > 0) {
          // Already exists, just update the timestamp
          const {error} = await supabase
              .from("user_completed_archives")
              .update({completed_at: new Date().toISOString()})
              .eq("user_id", user?.id)
              .eq("archive_id", archiveId);

          if (error) throw error;
        } else {
          // Mark as completed
          const {error} = await supabase
              .from("user_completed_archives")
              .insert({
                user_id: user?.id,
                archive_id: archiveId,
                completed_at: new Date().toISOString(),
              });

          if (error) throw error;
        }
      }

      // Revalidate to ensure server state
      mutate(`/completed/${user?.id}/${competitionId}`);
    } catch (error) {
      console.error("Error updating completion status:", error);
      // Revert optimistic update on error
      mutate(`/completed/${user?.id}/${competitionId}`);
    }
  }, [trigger, archives, user?.id, competitionId]);

  // Handle downloading an archive
  const handleDownload = useCallback(async (file: Archive) => {
    trigger(HapticType.MEDIUM);
    const success = await downloadFile(file);
    if (success) {
      // Update UI or show success message
    }
  }, [trigger, downloadFile]);

  // Handle viewing an archive
  const handleView = useCallback((file: Archive) => {
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
  }, [trigger, router, competitionId, downloadState, hasAccess]);

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
        case 'all':
          matchesFilter = true;
          break;
        case 'pinned':
          matchesFilter = archive.is_pinned;
          break;
        case 'completed':
          matchesFilter = !!archive.is_completed;
          break;
        case 'incomplete':
          matchesFilter = !archive.is_completed;
          break;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [archives, searchQuery, selectedCategory, filterType]);

  const renderItem = useCallback(({ item } : { item : any}) => (
      <ArchiveCard
          item={item}
          isDark={isDark}
          onPin={handlePin}
          onDownload={handleDownload}
          onView={handleView}
          onToggleComplete={handleToggleComplete}
          downloadState={downloadState[item.id] || {}}
      />
  ), [isDark, handlePin, handleDownload, handleView, handleToggleComplete, downloadState]);

  const keyExtractor = useCallback((item: Archive) => item.id, []);
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
              <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
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
                    keyExtractor={item => item.id}
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
                    keyExtractor={item => item}
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
                visible={!accessLoading && hasAccess === false && filteredArchives.length > 0}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    marginLeft: 'auto',
  },
  paymentButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  accessGrantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.success[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    marginLeft: 'auto',
  },
  accessGrantedText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  paymentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 10,
  },
  paymentOverlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.medium,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
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
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  paymentOverlayDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  textLightDark: {
    color: theme.color.gray[400],
  },
  paymentOverlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  paymentOverlayButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#FFFFFF',
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
