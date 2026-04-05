import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import CategoryFilter from "../CategoryFilter";

import ExerciseCard from "./ExerciceCard";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

// Types
export interface ExerciseListItem {
  exerciseId: number;
  lpId: string;
  exercise: {
    id: number;
    title: string;
    description?: string | null;
    course?: {
      id: number;
      name: string;
      category?: number;
      courses_categories?: {
        id: number;
        name: string;
      };
    };
    document_count?: number;
  };
  isPinned?: boolean;
  isCompleted?: boolean;
}

export interface Category {
  id: number | string;
  name: string;
  created_at?: string;
  description?: string | null;
  icon?: string | null;
}

export interface ExerciseListViewProps {
  exercises: ExerciseListItem[] | null | undefined;
  categories: Category[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onFilterChange?: () => void;
  onSearchChange?: (query: string) => void;
  totalCount?: number;
  programTitle?: string;
  programId?: string;
  baseRoute: string; // e.g., "/(app)/learn/[pdId]/exercices" or "/(app)/secondary/program/[programId]/exercices"
  onBack?: () => void;
  onPinToggle?: (exerciseId: number) => Promise<void>;
  onCompletionToggle?: (exerciseId: number) => Promise<void>;
  featuredExercise?: ExerciseListItem;
}

type FilterType = "all" | "pinned" | "uncompleted";

export const ExerciseListView: React.FC<ExerciseListViewProps> = ({
  exercises,
  categories,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onFilterChange,
  onSearchChange,
  totalCount,
  programTitle = "Programme",
  baseRoute,
  onBack,
  onPinToggle,
  onCompletionToggle,
  featuredExercise,
}) => {
  const router = useRouter();
  const { trigger } = useHaptics();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle search debouncing - notify parent after user stops typing
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Only notify parent about search query change
      // Don't call onFilterChange - let the key change in SWR handle the refetch
      onSearchChange?.(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, onSearchChange]);

  // Filter exercises (search is done at database level, not here)
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    return exercises.filter((item) => {
      if (!item.exercise) return false;

      const exercise = item.exercise;

      // Filter by category
      const category = categories?.find(
        (cat) => cat.id === exercise.course?.category
      );
      const matchesCategory =
        !selectedCategory || selectedCategory === 'all' || category?.name === selectedCategory;

      // Filter by type (all, pinned, uncompleted)
      let matchesFilter = true;
      if (filterType === "pinned") {
        matchesFilter = item.isPinned === true;
      } else if (filterType === "uncompleted") {
        matchesFilter = item.isCompleted !== true;
      }

      return matchesCategory && matchesFilter;
    });
  }, [exercises, selectedCategory, filterType, categories]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };
  const featuredExerciseRoute = featuredExercise
    ? `${baseRoute}/${featuredExercise.exercise.id}`
    : null;

  // Handle back button
  const handleBack = () => {
    trigger(HapticType.LIGHT);
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement des exercices...
        </ThemedText>
      </View>
    );
  }

  // Render empty state
  if (!filteredExercises || filteredExercises.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Pressable style={styles.headerIcon} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark]} numberOfLines={1}>
              Exercices
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]} numberOfLines={1}>
              {programTitle}
            </ThemedText>
          </View>
        </View>

        {/* Search temporarily disabled */}
        {false && (
          <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
            <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
              <MaterialCommunityIcons name="magnify" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              <TextInput
                style={[styles.searchInput, isDark && styles.searchInputDark]}
                placeholder="Rechercher un exercice..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              />
              {searchQuery.length > 0 && (
                <Pressable style={styles.clearButton} onPress={clearSearch}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={{ height: 56, marginTop: 12 }}>
          <CategoryFilter
            id="exercise-category-filter"
            categories={categories as never}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              onFilterChange?.();
            }}
          />
        </View>

        {/* Filter tabs */}
        <View style={[styles.filterContainer, isDark && styles.filterContainerDark]}>
          <Pressable
            style={[
              styles.filterTab,
              isDark && styles.filterTabDark,
              filterType === "all" && styles.filterTabActive,
            ]}
            onPress={() => {
              setFilterType("all");
              onFilterChange?.();
            }}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                isDark && styles.filterTabTextDark,
                filterType === "all" && styles.filterTabTextActive,
              ]}
            >
              Tout
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterTab,
              isDark && styles.filterTabDark,
              filterType === "pinned" && styles.filterTabActive,
            ]}
            onPress={() => {
              setFilterType("pinned");
              onFilterChange?.();
            }}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                isDark && styles.filterTabTextDark,
                filterType === "pinned" && styles.filterTabTextActive,
              ]}
            >
              Épinglés
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterTab,
              isDark && styles.filterTabDark,
              filterType === "uncompleted" && styles.filterTabActive,
            ]}
            onPress={() => {
              setFilterType("uncompleted");
              onFilterChange?.();
            }}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                isDark && styles.filterTabTextDark,
                filterType === "uncompleted" && styles.filterTabTextActive,
              ]}
            >
              Non terminés
            </ThemedText>
          </Pressable>
        </View>

        {/* Empty state */}
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="text-box-outline"
            size={64}
            color={isDark ? "#4B5563" : "#D1D5DB"}
          />
          <ThemedText style={[styles.emptyText, isDark && styles.emptyTextDark]}>
            {searchQuery || selectedCategory || filterType !== "all"
              ? "Aucun exercice trouvé"
              : "Aucun exercice disponible"}
          </ThemedText>
          {(searchQuery || selectedCategory || filterType !== "all") && (
            <ThemedText style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
              Essayez de modifier vos critères de recherche
            </ThemedText>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable style={styles.headerIcon} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
        </Pressable>

        <View style={styles.headerInfo}>
          <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark]} numberOfLines={1}>
            Exercices
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]} numberOfLines={1}>
            {programTitle}
          </ThemedText>
        </View>
      </View>

      {/* Search temporarily disabled */}
      {false && (
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
          <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
            <MaterialCommunityIcons name="magnify" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Rechercher un exercice..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
            />
            {searchQuery.length > 0 && (
              <Pressable style={styles.clearButton} onPress={clearSearch}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Categories */}
      <View style={{ height: 56, marginTop: 12 }}>
        <CategoryFilter
          id="exercise-category-filter"
          categories={categories as never}
          selectedCategory={selectedCategory || ""}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            onFilterChange?.();
          }}
        />
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterContainer, isDark && styles.filterContainerDark]}>
        <Pressable
          style={[
            styles.filterTab,
            isDark && styles.filterTabDark,
            filterType === "all" && styles.filterTabActive,
          ]}
          onPress={() => {
            setFilterType("all");
            onFilterChange?.();
          }}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              isDark && styles.filterTabTextDark,
              filterType === "all" && styles.filterTabTextActive,
            ]}
          >
            Tout
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterTab,
            isDark && styles.filterTabDark,
            filterType === "pinned" && styles.filterTabActive,
          ]}
          onPress={() => setFilterType("pinned")}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              isDark && styles.filterTabTextDark,
              filterType === "pinned" && styles.filterTabTextActive,
            ]}
          >
            Épinglés
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterTab,
            isDark && styles.filterTabDark,
            filterType === "uncompleted" && styles.filterTabActive,
          ]}
          onPress={() => setFilterType("uncompleted")}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              isDark && styles.filterTabTextDark,
              filterType === "uncompleted" && styles.filterTabTextActive,
            ]}
          >
            Non terminés
          </ThemedText>
        </Pressable>
      </View>

      {/* Exercise count */}
      <View style={[styles.countContainer, isDark && styles.countContainerDark]}>
        <ThemedText style={[styles.countText, isDark && styles.countTextDark]}>
          {filteredExercises.length}{totalCount ? ` / ${totalCount}` : ''} exercice
          {(totalCount || filteredExercises.length) !== 1 ? "s" : ""} disponible
          {(totalCount || filteredExercises.length) !== 1 ? "s" : ""}
        </ThemedText>
      </View>

      {featuredExercise && featuredExerciseRoute && (
        <View style={[styles.featuredCardWrapper, isDark && styles.featuredCardWrapperDark]}>
          <Pressable
            style={[styles.featuredCard, isDark && styles.featuredCardDark]}
            onPress={() => {
              trigger(HapticType.LIGHT);
              router.push(featuredExerciseRoute as Href);
            }}
          >
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons
                name="flash-outline"
                size={16}
                color="#FFFFFF"
              />
              <ThemedText style={styles.featuredBadgeText}>
                Exercice du jour
              </ThemedText>
            </View>

            <ThemedText style={[styles.featuredTitle, isDark && styles.featuredTitleDark]}>
              {featuredExercise.exercise.title}
            </ThemedText>

            <ThemedText style={[styles.featuredSubtitle, isDark && styles.featuredSubtitleDark]}>
              Le même exercice est proposé aujourd&apos;hui à tous les élèves de {programTitle}.
            </ThemedText>

            <View style={styles.featuredFooter}>
              <ThemedText style={[styles.featuredMeta, isDark && styles.featuredMetaDark]}>
                {featuredExercise.isCompleted ? "Déjà terminé" : "À faire aujourd'hui"}
              </ThemedText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.color.primary[500]}
              />
            </View>
          </Pressable>
        </View>
      )}

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item?.exerciseId?.toString() || ""}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        style={[styles.listContainer, isDark && styles.listContainerDark]}
        onEndReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => {
          if (isLoadingMore) {
            return (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={theme.color.primary[500]} />
                <ThemedText style={[styles.loadingMoreText, isDark && styles.loadingMoreTextDark]}>
                  Chargement...
                </ThemedText>
              </View>
            );
          }
          return null;
        }}
        renderItem={({ item }) => {
          if (!item || !item.exercise) return null;

          const category = categories?.find(
            (cat) => cat.id === item.exercise.course?.category
          );

          return (
            <ExerciseCard
              exercise={{
                id: item.exercise.id,
                title: item.exercise.title,
                description: item.exercise.description || "",
                is_pinned: item.isPinned || false,
                is_completed: item.isCompleted || false,
                course: {
                  name: item.exercise.course?.name || "",
                  category: category?.name,
                  courses_categories: category?.name ? {
                    name: category.name,
                    description: category.description || "",
                  } : undefined,
                },
              }}
              onPress={() => {
                trigger(HapticType.LIGHT);
                router.push(`${baseRoute}/${item.exercise.id}` as Href);
              }}
              onPinPress={async (e) => {
                e?.stopPropagation();
                if (onPinToggle) {
                  await onPinToggle(item.exercise.id);
                }
              }}
              onCompletePress={async (e) => {
                e?.stopPropagation();
                if (onCompletionToggle) {
                  await onCompletionToggle(item.exercise.id);
                }
              }}
            />
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingContainerDark: {
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  loadingTextDark: {
    color: "#9CA3AF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  headerIcon: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.typography.fontFamily,
    color: "#111827",
  },
  headerTitleDark: {
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  headerSubtitleDark: {
    color: "#9CA3AF",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchContainerDark: {
    backgroundColor: "#111827",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBoxDark: {
    backgroundColor: "#1F2937",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  searchInputDark: {
    color: "#FFFFFF",
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  filterContainerDark: {
    backgroundColor: "#111827",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterTabDark: {
    backgroundColor: "#1F2937",
  },
  filterTabActive: {
    backgroundColor: theme.color.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterTabTextDark: {
    color: "#9CA3AF",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  countContainerDark: {
    backgroundColor: "#111827",
  },
  featuredCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  featuredCardWrapperDark: {
    backgroundColor: "#111827",
  },
  featuredCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  featuredCardDark: {
    backgroundColor: "#052E16",
    borderColor: "#059669",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    backgroundColor: "#059669",
  },
  featuredBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  featuredTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  featuredTitleDark: {
    color: "#FFFFFF",
  },
  featuredSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  featuredSubtitleDark: {
    color: "#D1FAE5",
  },
  featuredFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
    flex: 1,
    marginRight: 8,
  },
  featuredMetaDark: {
    color: "#6EE7B7",
  },
  countText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  countTextDark: {
    color: "#9CA3AF",
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
  },
  listContainerDark: {
    backgroundColor: "#111827",
  },
  exerciseList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: theme.typography.fontFamily,
  },
  loadingMoreTextDark: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    color: "#111827",
  },
  emptyTextDark: {
    color: "#FFFFFF",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  emptySubtextDark: {
    color: "#9CA3AF",
  },
});

export default ExerciseListView;
