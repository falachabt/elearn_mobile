import React, { useState, useEffect } from "react";
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
import { ScrollView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useFileDownload } from "@/hooks/useFileDownload";
import { ArchiveCard } from "@/components/ArchiveCard";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import useSWR from "swr";

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
  concour_id?: number; // Added this property
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

interface PathData {
  concourId: number;
  concours: {
    name: string;
  };
}

type FilterType = 'all' | 'pinned' | 'completed' | 'incomplete';

// Separate fetchers for SWR to improve type safety
const fetchPathData = async (url: string): Promise<PathData> => {
  if (!url) throw new Error("No URL provided");

  const id = url.split('/').pop();
  if (!id) throw new Error("No ID found in URL");

  const { data, error } = await supabase
      .from("concours_learningpaths")
      .select(`
      concourId,
      concours:concourId(name)
    `)
      .eq("learningPathId", id)
      .single();

  if (error) throw error;

  if (!data) throw new Error("No data returned from API");

  // Ensure the structure matches the PathData type
  return {
    concourId: data.concourId,
    concours: {
  // @ts-ignore
      name: data.concours?.name || ""
    }
  };
};

const fetchArchivesData = async (url: string): Promise<Archive[]> => {
  if (!url) throw new Error("No URL provided");

  const concourId = url.split('/').pop();
  if (!concourId) throw new Error("No concourId found in URL");

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
      .eq("concour_id", concourId);

  if (error) throw error;

  if (!data) return [];

  // Transform to ensure it matches the Archive type
  return data.map(item => ({
    id: item.id,
    name: item.name || "",
    file_url: item.file_url || "",
    session: item.session || "",
    is_pinned: false, // Will be set later
    file_type: item.file_type || "other",
    concour_id: item.concour_id,
    courses_categories: item.courses_categories
  }));
};

export const ArchivesList = () => {
  const { pdId } = useLocalSearchParams<{ pdId: string }>();
  const router = useRouter();
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [concoursName, setConcoursName] = useState("");
  const { downloadState, checkIfFileExists, downloadFile } = useFileDownload();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { user } = useAuth();

  // Use SWR to fetch path data with dedicated fetcher
  const { data: pathData, error: pathError } = useSWR<PathData>(
      pdId ? `/path/${pdId}` : null,
      fetchPathData
  );

  // Use SWR to fetch archives data when pathData is available with dedicated fetcher
  const { data: archivesData, error: archivesError } = useSWR<Archive[]>(
      pathData?.concourId ? `/archives/${pathData.concourId}` : null,
      fetchArchivesData
  );

  useEffect(() => {
    if (pathData) {
      setConcoursName(pathData.concours?.name || "");
    }
  }, [pathData]);

  useEffect(() => {
    if (archivesData && user?.id) {
      fetchPinnedAndCompletedStatus();
    }
  }, [archivesData, user?.id]);

  useEffect(() => {
    // Check existing downloads for all archives
    archives.forEach((archive) => {
      checkIfFileExists(archive);
    });
  }, [archives, checkIfFileExists]);

  const fetchPinnedAndCompletedStatus = async () => {
    try {
      setLoading(true);

      // Ensure archivesData exists
      if (!archivesData) {
        setLoading(false);
        return;
      }

      // Fetch pinned status
      const { data: pinnedArchives, error: pinnedArchivesError } = await supabase
          .from("user_pinned_archive")
          .select("archive_id, is_pinned")
          .in(
              "archive_id",
              archivesData.map((archive) => archive.id)
          )
          .eq("user_id", user?.id);

      if (pinnedArchivesError) throw pinnedArchivesError;

      // Fetch completed status
      const { data: completedArchives, error: completedArchivesError } = await supabase
          .from("user_completed_archives")
          .select("archive_id")
          .in(
              "archive_id",
              archivesData.map((archive) => archive.id)
          )
          .eq("user_id", user?.id);

      if (completedArchivesError) throw completedArchivesError;

      // Create a set of completed archive IDs for faster lookups
      const completedArchiveIds = new Set(
          completedArchives?.map(item => item.archive_id) || []
      );

      // Update archives with pinned and completed status
      const updatedArchives = archivesData.map((archive) => {
        const pinnedArchive = pinnedArchives?.find(
            (pa) => pa.archive_id === archive.id
        );

        return {
          ...archive,
          is_pinned: pinnedArchive?.is_pinned || false,
          is_completed: completedArchiveIds.has(archive.id)
        };
      });

      // Get unique categories
      const uniqueCategories = [
        "Tout",
        ...new Set(
            updatedArchives
                .map((archive) => archive.courses_categories?.name)
                .filter(Boolean) as string[]
        ),
      ];

      setArchives(updatedArchives);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (archiveId: string) => {
    try {
      trigger(HapticType.LIGHT);

      const archive = archives.find((a) => a.id === archiveId);
      if (!archive) return;

      const { data: existingPin, error: fetchError } = await supabase
          .from("user_pinned_archive")
          .select("archive_id, is_pinned")
          .eq("archive_id", archiveId)
          .eq("user_id", user?.id)
          .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      let error;
      if (existingPin) {
        const { error: updateError } = await supabase
            .from("user_pinned_archive")
            .update({ is_pinned: !existingPin.is_pinned })
            .eq("archive_id", archiveId)
            .eq("user_id", user?.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
            .from("user_pinned_archive")
            .insert({
              archive_id: archiveId,
              is_pinned: true,
              user_id: user?.id,
            });
        error = insertError;
      }

      if (error) throw error;

      setArchives(
          archives.map((a) =>
              a.id === archiveId ? { ...a, is_pinned: !a.is_pinned } : a
          )
      );
    } catch (error) {
      console.error("Error updating pin status:", error);
    }
  };

  const handleToggleComplete = async (archiveId: string) => {
    try {
      trigger(HapticType.SUCCESS);

      const archive = archives.find((a) => a.id === archiveId);
      if (!archive) return;

      const isCurrentlyCompleted = archive.is_completed;

      if (isCurrentlyCompleted) {
        // Remove completion status
        const { error } = await supabase
            .from("user_completed_archives")
            .delete()
            .eq("user_id", user?.id)
            .eq("archive_id", archiveId);

        if (error) throw error;
      } else {
        // Check if record already exists to avoid constraint error
        const { data: existingRecord } = await supabase
            .from("user_completed_archives")
            .select("id")
            .eq("user_id", user?.id)
            .eq("archive_id", archiveId);

        if (existingRecord && existingRecord.length > 0) {
          // Already exists, just update the timestamp
          const { error } = await supabase
              .from("user_completed_archives")
              .update({ completed_at: new Date().toISOString() })
              .eq("user_id", user?.id)
              .eq("archive_id", archiveId);

          if (error) throw error;
        } else {
          // Mark as completed
          const { error } = await supabase
              .from("user_completed_archives")
              .insert({
                user_id: user?.id,
                archive_id: archiveId,
                completed_at: new Date().toISOString(),
              });

          if (error) throw error;
        }
      }

      // Update local state
      setArchives(
          archives.map((a) =>
              a.id === archiveId ? { ...a, is_completed: !isCurrentlyCompleted } : a
          )
      );
    } catch (error) {
      console.error("Error updating completion status:", error);
    }
  };

  const handleDownload = async (file: Archive) => {
    trigger(HapticType.MEDIUM);
    const success = await downloadFile(file);
    if (success) {
      // Update UI or show success message
    }
  };

  const handleView = (file: Archive) => {
    trigger(HapticType.SELECTION);
    router.push({
      pathname: "/learn/[pdId]/anales/[filePath]/[fileId]",
      params: {
        pdId: String(pdId),
        fileId: file.id || "",
        filePath: downloadState[file.id]?.localPath || file.file_url || "",
      },
    });
  };

  const getFilteredArchives = () => {
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
  };

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
            {concoursName}
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterButtonsContainer}
          >
            <TouchableOpacity
                style={[
                  styles.filterButton,
                  isDark && styles.filterButtonDark,
                  filterType === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  trigger(HapticType.LIGHT);
                  setFilterType('all');
                }}
            >
              <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={20}
                  color={filterType === 'all' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
              <Text
                  style={[
                    styles.filterButtonText,
                    isDark && styles.filterButtonTextDark,
                    filterType === 'all' && styles.filterButtonTextActive,
                  ]}
              >
                Tout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                  styles.filterButton,
                  isDark && styles.filterButtonDark,
                  filterType === 'pinned' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  trigger(HapticType.LIGHT);
                  setFilterType('pinned');
                }}
            >
              <MaterialCommunityIcons
                  name="pin"
                  size={20}
                  color={filterType === 'pinned' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
              <Text
                  style={[
                    styles.filterButtonText,
                    isDark && styles.filterButtonTextDark,
                    filterType === 'pinned' && styles.filterButtonTextActive,
                  ]}
              >
                Épinglés
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                  styles.filterButton,
                  isDark && styles.filterButtonDark,
                  filterType === 'completed' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  trigger(HapticType.LIGHT);
                  setFilterType('completed');
                }}
            >
              <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={filterType === 'completed' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
              <Text
                  style={[
                    styles.filterButtonText,
                    isDark && styles.filterButtonTextDark,
                    filterType === 'completed' && styles.filterButtonTextActive,
                  ]}
              >
                Terminés
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                  styles.filterButton,
                  isDark && styles.filterButtonDark,
                  filterType === 'incomplete' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  trigger(HapticType.LIGHT);
                  setFilterType('incomplete');
                }}
            >
              <MaterialCommunityIcons
                  name="circle-outline"
                  size={20}
                  color={filterType === 'incomplete' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
              <Text
                  style={[
                    styles.filterButtonText,
                    isDark && styles.filterButtonTextDark,
                    filterType === 'incomplete' && styles.filterButtonTextActive,
                  ]}
              >
                À faire
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Categories */}
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
              style={styles.categoriesScroll}
          >
            {categories.map((category) => (
                <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      isDark && styles.categoryChipDark,
                      selectedCategory === category && styles.selectedCategoryChip,
                    ]}
                    onPress={() => {
                      trigger(HapticType.LIGHT);
                      setSelectedCategory(category);
                    }}
                >
                  <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category && styles.selectedCategoryText,
                        isDark && styles.textDark,
                      ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
            ))}
          </ScrollView>
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
        {loading ? (
            <ActivityIndicator
                size="large"
                color={theme.color.primary[500]}
                style={styles.loader}
            />
        ) : (
            <FlatList
                data={getFilteredArchives()}
                renderItem={({ item }) => (
                    <ArchiveCard
                        item={item}
                        isDark={isDark}
                        onPin={handlePin}
                        onDownload={handleDownload}
                        onView={handleView}
                        onToggleComplete={handleToggleComplete}
                        downloadState={downloadState[item.id] || {}}
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        )}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom : 70,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
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
});

export default ArchivesList;