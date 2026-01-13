import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  Animated,
  FlatList,
  Easing,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import EnhancedQuizCard from "./QuizCard";
import EnhancedQuizRowItem from "./QuizRowItem";
import EnhancedQuizCategoryFilter from "./QuizCategoryFilter";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { theme } from "@/constants/theme";

// Types
export interface QuizListItem {
  quizId: number;
  lpId: string;
  quiz: {
    id: number;
    name: string;
    description?: string | null;
    category?: {
      id: number;
      name: string;
    };
    quiz_questions?: Array<{
      id: number;
      question: string;
    }>;
    course?: {
      id: number;
      name: string;
    };
  };
  isPinned?: boolean;
  progress?: number;
}

export interface QuizListViewProps {
  quizzes: QuizListItem[] | null | undefined;
  isLoading?: boolean;
  programTitle?: string;
  programId?: string;
  baseRoute: string;
  onBack?: () => void;
}

export const QuizListView: React.FC<QuizListViewProps> = ({
  quizzes,
  isLoading = false,
  programTitle = "Programme",
  programId = "",
  baseRoute,
  onBack,
}) => {
  const router = useRouter();
  const { trigger } = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in content when data loads
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }
  }, [isLoading, fadeAnim]);

  // Extract unique categories from quizzes
  const categories = useMemo(() => {
    if (!quizzes) return [];
    const uniqueCategories = new Set(
      quizzes.map((quiz) => quiz?.quiz?.category?.name).filter(Boolean)
    );
    return Array.from(uniqueCategories) as string[];
  }, [quizzes]);

  // Filter quizzes based on search and category
  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    return quizzes.filter((quizItem) => {
      const quiz = quizItem?.quiz;
      if (!quiz) return false;
      const matchesSearch = quiz.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        quiz.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [quizzes, searchQuery, selectedCategory]);

  // Toggle view mode between list and grid
  const toggleViewMode = () => {
    trigger(HapticType.LIGHT);
    setViewMode((prev) => (prev === "list" ? "grid" : "list"));
  };

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
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={styles.loadingText}>
          Chargement des quiz...
        </ThemedText>
      </View>
    );
  }

  // Render empty state
  if (!filteredQuizzes || filteredQuizzes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Pressable style={styles.headerIcon} onPress={handleBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={isDark ? "#FFFFFF" : "#111827"}
            />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              {programTitle}
            </ThemedText>
          </View>
          <Pressable style={styles.viewModeButton} onPress={toggleViewMode}>
            <MaterialCommunityIcons
              name={viewMode === "list" ? "view-grid" : "view-list"}
              size={24}
              color={theme.color.primary[500]}
            />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchContainer,
            isDark && styles.searchContainerDark,
          ]}
        >
          <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Rechercher un quiz..."
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

        {/* Categories */}
        <View style={{ height: 56 }}>
          <EnhancedQuizCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            isDark={isDark}
          />
        </View>

        {/* Quiz count */}
        <View
          style={[
            styles.quizCountContainer,
            isDark && styles.quizCountContainerDark,
          ]}
        >
          <ThemedText
            style={[
              styles.quizCountText,
              isDark && styles.quizCountTextDark,
            ]}
          >
            0 quiz disponible
          </ThemedText>
        </View>

        {/* Empty state */}
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="file-search-outline"
            size={64}
            color={isDark ? "#818CF8" : "#2563EB"}
          />
          <ThemedText
            style={[styles.emptyStateTitle, isDark && { color: "#D1D5DB" }]}
          >
            {searchQuery || selectedCategory !== "all"
              ? "Aucun quiz trouvé"
              : "Aucun quiz disponible"}
          </ThemedText>
          <ThemedText
            style={[styles.emptyStateText, isDark && { color: "#9CA3AF" }]}
          >
            {searchQuery || selectedCategory !== "all"
              ? "Essayez de modifier vos critères de recherche"
              : "Revenez plus tard pour voir les nouveaux quiz"}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          isDark && styles.headerDark,
          { opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.headerIcon} onPress={handleBack}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>

        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            {programTitle}
          </ThemedText>
        </View>

        {/* View mode toggle */}
        <Pressable style={styles.viewModeButton} onPress={toggleViewMode}>
          <MaterialCommunityIcons
            name={viewMode === "list" ? "view-grid" : "view-list"}
            size={24}
            color={theme.color.primary[500]}
          />
        </Pressable>
      </Animated.View>

      {/* Search */}
      <Animated.View
        style={[
          styles.searchContainer,
          isDark && styles.searchContainerDark,
          { opacity: fadeAnim },
        ]}
      >
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Rechercher un quiz..."
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
      </Animated.View>

      {/* Categories */}
      <View style={{ height: 56 }}>
        <EnhancedQuizCategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          isDark={isDark}
        />
      </View>

      {/* Quiz count */}
      <Animated.View
        style={[
          styles.quizCountContainer,
          isDark && styles.quizCountContainerDark,
          { opacity: fadeAnim },
        ]}
      >
        <ThemedText
          style={[styles.quizCountText, isDark && styles.quizCountTextDark]}
        >
          {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? "s" : ""}{" "}
          disponible{filteredQuizzes.length !== 1 ? "s" : ""}
        </ThemedText>
      </Animated.View>

      {/* Quiz list */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {viewMode === "list" ? (
          <FlatList
            data={filteredQuizzes}
            keyExtractor={(item) => item?.quizId?.toString() || ""}
            contentContainerStyle={styles.quizList}
            renderItem={({ item, index }) => {
              if (!item) return null;
              return (
                <EnhancedQuizRowItem
                  quizItem={item}
                  pdId={programId}
                  baseRoute={baseRoute}
                  isDark={isDark}
                  index={index}
                />
              );
            }}
          />
        ) : (
          <FlatList
            data={filteredQuizzes}
            keyExtractor={(item) => item?.quizId?.toString() || ""}
            numColumns={2}
            contentContainerStyle={styles.quizGrid}
            columnWrapperStyle={styles.quizGridRow}
            renderItem={({ item, index }) => {
              if (!item) return null;
              return (
                <EnhancedQuizCard
                  quizItem={item}
                  pdId={programId}
                  baseRoute={baseRoute}
                  isDark={isDark}
                  index={index}
                />
              );
            }}
          />
        )}
      </Animated.View>
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
  },
  viewModeButton: {
    padding: 8,
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
  quizCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  quizCountContainerDark: {
    backgroundColor: "#111827",
  },
  quizCountText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  quizCountTextDark: {
    color: "#9CA3AF",
  },
  quizList: {
    paddingBottom: 80,
  },
  quizGrid: {
    paddingHorizontal: 8,
    paddingBottom: 80,
  },
  quizGridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    color: "#111827",
    textAlign: "center",
  },
  emptyStateText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
});

export default QuizListView;
