import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
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
  programTitle?: string;
  programId?: string;
  baseRoute: string; // e.g., "/(app)/learn/[pdId]/exercices" or "/(app)/secondary/program/[programId]/exercices"
  onBack?: () => void;
}

type FilterType = "all" | "pinned" | "uncompleted";

export const ExerciseListView: React.FC<ExerciseListViewProps> = ({
  exercises,
  categories,
  isLoading = false,
  programTitle = "Programme",
  baseRoute,
  onBack,
}) => {
  const router = useRouter();
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Filter exercises
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    return exercises.filter((item) => {
      if (!item.exercise) return false;

      const exercise = item.exercise;

      // Filter by search query
      const matchesSearch =
        (exercise.title || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (exercise.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (exercise.course?.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Filter by category
      const category = categories?.find(
        (cat) => Number(cat.id) === exercise.course?.category
      );
      const matchesCategory =
        !selectedCategory || category?.name === selectedCategory;

      // Filter by type (all, pinned, uncompleted)
      let matchesFilter = true;
      if (filterType === "pinned") {
        matchesFilter = item.isPinned === true;
      } else if (filterType === "uncompleted") {
        matchesFilter = item.isCompleted !== true;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [exercises, searchQuery, selectedCategory, filterType, categories]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={styles.loadingText}>
          Chargement des exercices...
        </ThemedText>
      </View>
    );
  }

  // Render empty state
  if (!filteredExercises || filteredExercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerIcon} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              Exercices
            </ThemedText>
            <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
              {programTitle}
            </ThemedText>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un exercice..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#6B7280"
            />
            {searchQuery.length > 0 && (
              <Pressable style={styles.clearButton} onPress={clearSearch}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={{ height: 56 }}>
          <CategoryFilter
            id="exercise-category-filter"
            categories={categories as never}
            selectedCategory={selectedCategory || ""}
            onSelectCategory={setSelectedCategory}
          />
        </View>

        {/* Filter tabs */}
        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterTab,
              filterType === "all" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("all")}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                filterType === "all" && styles.filterTabTextActive,
              ]}
            >
              Tout
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterTab,
              filterType === "pinned" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("pinned")}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                filterType === "pinned" && styles.filterTabTextActive,
              ]}
            >
              Épinglés
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterTab,
              filterType === "uncompleted" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("uncompleted")}
          >
            <ThemedText
              style={[
                styles.filterTabText,
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
            color="#D1D5DB"
          />
          <ThemedText style={styles.emptyText}>
            {searchQuery || selectedCategory || filterType !== "all"
              ? "Aucun exercice trouvé"
              : "Aucun exercice disponible"}
          </ThemedText>
          {(searchQuery || selectedCategory || filterType !== "all") && (
            <ThemedText style={styles.emptySubtext}>
              Essayez de modifier vos critères de recherche
            </ThemedText>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerIcon} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} />
        </Pressable>

        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            Exercices
          </ThemedText>
          <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
            {programTitle}
          </ThemedText>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un exercice..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
          {searchQuery.length > 0 && (
            <Pressable style={styles.clearButton} onPress={clearSearch}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color="#6B7280"
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={{ height: 56 }}>
        <CategoryFilter
          id="exercise-category-filter"
          categories={categories as never}
          selectedCategory={selectedCategory || ""}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[
            styles.filterTab,
            filterType === "all" && styles.filterTabActive,
          ]}
          onPress={() => setFilterType("all")}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              filterType === "all" && styles.filterTabTextActive,
            ]}
          >
            Tout
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterTab,
            filterType === "pinned" && styles.filterTabActive,
          ]}
          onPress={() => setFilterType("pinned")}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              filterType === "pinned" && styles.filterTabTextActive,
            ]}
          >
            Épinglés
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterTab,
            filterType === "uncompleted" && styles.filterTabActive,
          ]}
          onPress={() => setFilterType("uncompleted")}
        >
          <ThemedText
            style={[
              styles.filterTabText,
              filterType === "uncompleted" && styles.filterTabTextActive,
            ]}
          >
            Non terminés
          </ThemedText>
        </Pressable>
      </View>

      {/* Exercise count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>
          {filteredExercises.length} exercice
          {filteredExercises.length !== 1 ? "s" : ""} disponible
          {filteredExercises.length !== 1 ? "s" : ""}
        </ThemedText>
      </View>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item?.exerciseId?.toString() || ""}
        contentContainerStyle={styles.exerciseList}
        renderItem={({ item }) => {
          if (!item || !item.exercise) return null;

          const category = categories?.find(
            (cat) => Number(cat.id) === item.exercise.course?.category
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
                router.push(`${baseRoute}/${item.exercise.id}` as never);
              }}
              onPinPress={async () => {
                // TODO: Implement pin functionality
              }}
              onCompletePress={async () => {
                // TODO: Implement complete functionality
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterTabActive: {
    backgroundColor: theme.color.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  exerciseList: {
    paddingBottom: 80,
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
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});

export default ExerciseListView;
