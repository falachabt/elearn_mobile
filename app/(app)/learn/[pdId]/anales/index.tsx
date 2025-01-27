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

export interface Archive {
  id: string;
  name: string;
  file_url: string;
  session: string;
  is_pinned: boolean;
  local_path?: string;
  file_type: "pdf" | "doc" | "other";
  courses_categories?: {
    id: string;
    name: string;
    description: string;
  };
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

type PathData = {
  concourId: number;
  concours: {
    name: string;
  };
};

type FilterType = 'all' | 'pinned';

export const ArchivesList = () => {
  const { pdId } = useLocalSearchParams();
  const router = useRouter();
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

  useEffect(() => {
    fetchData();
  }, [pdId]);

  useEffect(() => {
    // Check existing downloads for all archives
    archives.forEach((archive) => {
      checkIfFileExists(archive);
    });
  }, [archives, checkIfFileExists]);

  const fetchData = async () => {
    try {
      const {
        data: pathData,
        error: pathError,
      }: { data: PathData | null; error: any } = await supabase
        .from("concours_learningpaths")
        .select(
          `
          concourId,
          concours!inner (
            name
          )
        `
        )
        .eq("learningPathId", pdId)
        .limit(1)
        .single();

      if (pathError) throw pathError;
      if (!pathData) throw new Error("Learning path not found");

      setConcoursName(pathData.concours?.name);

      const { data: archivesData, error: archivesError } = await supabase
        .from("concours_archives")
        .select(
          `
          *,
          courses_categories (
            id,
            name,
            description
          )
        `
        )
        .eq("concour_id", pathData.concourId);

      if (archivesError) throw archivesError;

      const { data: pinnedArchives, error: pinnedArchivesError } = await supabase
        .from("user_pinned_archive")
        .select("archive_id, is_pinned")
        .in(
          "archive_id",
          archivesData ? archivesData.map((archive) => archive.id) : []
        )
        .eq("user_id", user?.id);

      // Mettre à jour le statut épinglé pour chaque archive
      archivesData.forEach((archive) => {
        const pinnedArchive = pinnedArchives?.find(
          (pa) => pa.archive_id === archive.id
        );
        archive.is_pinned = pinnedArchive?.is_pinned || false;
      });

      // Get unique categories
      const uniqueCategories = [
        "Tout",
        ...new Set(
          archivesData
            .map((archive) => archive.courses_categories?.name)
            .filter(Boolean)
        ),
      ];

      setArchives(archivesData);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (archiveId: string) => {
    try {
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

  const handleDownload = async (file: Archive) => {
    const success = await downloadFile(file);
    if (success) {
      // Update UI or show success message
    }
  };

  const handleView = (file: Archive) => {
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
      
      const matchesFilter = filterType === 'all' || 
        (filterType === 'pinned' && archive.is_pinned);

      return matchesSearch && matchesCategory && matchesFilter;
    });
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
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
            onPress={() => setFilterType('all')}
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
            onPress={() => setFilterType('pinned')}
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
              onPress={() => setSelectedCategory(category)}
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
    // Suite des styles...

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