import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import CourseList from "@/components/CourseList";
import CategoryFilter from "@/components/shared/learn/CategoryFilter";
import { CourseGridByCategory } from "@/components/shared/learn/CourseGrid";
import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { useCategories } from "@/hooks/global/useCategories";
import {
  useSecondaryProgram,
  useSecondaryProgramCourses,
} from "@/hooks/secondary/useSecondaryPrograms";
import { useColorScheme } from "@/hooks/useColorScheme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { Category, CourseItem } from "@/types/course.type";
import { useUser } from "@/contexts/useUserInfo";

const CourseScreen: React.FC<null> = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { programId } = useLocalSearchParams();
  const { trigger } = useHaptics();
  const { isSecondaryProgramEnrolled } = useUser();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isEnrolled = isSecondaryProgramEnrolled(String(programId));

  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(
    String(programId)
  );
  const { courses, isLoading: isLoadingCourses } = useSecondaryProgramCourses(
    String(programId)
  );
  const { categories: allCategories, isLoading: isLoadingCategories } =
    useCategories();

  // Extract unique categories from courses
  const categories = useCallback(() => {
    if (!courses) return [];

    const categoriesMap = new Map<string, Category>();

    courses.forEach((courseItem) => {
      const category = courseItem?.course?.category;
      const selectedCategory = allCategories?.find(
        (cat) => cat.id === category
      );

      if (!selectedCategory || !category || !selectedCategory.name) return;

      if (category && !categoriesMap.has(selectedCategory?.name)) {
        categoriesMap.set(selectedCategory?.name, selectedCategory);
      }
    });

    return Array.from(categoriesMap.values());
  }, [courses]);

  // Filter courses based on search query
  const filteredCourses = useCallback(() => {
    if (!courses) return [];

    return courses.filter((courseItem) => {
      const course = courseItem.course;
      if (!course) return false;

      // Filter by search query
      const matchesSearch =
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.goals || []).some((goal) =>
          goal.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Filter by category (if not 'all')
      const matchesCategory =
        selectedCategory === "all" ||
        course.category ===
          allCategories?.find((cat) => cat.name === selectedCategory)?.id;

      if (!matchesSearch || !matchesCategory) return false;

      return matchesSearch && matchesCategory;
    }) ;
  }, [courses, searchQuery, selectedCategory]);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle course press
  const handleCoursePress = async (courseItem: CourseItem) => {
    await trigger(HapticType.LIGHT);
    if (!courseItem.course?.id) return;
    router.push(`/secondary/program/${programId}/courses/${courseItem.course.id}`);
  };

  // Toggle view mode between grid and list
  const toggleViewMode = () => {
    trigger(HapticType.LIGHT);
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Get program title and school
  const getProgramInfo = () => {

    const programClass = program?.class;
    const serie = program?.serie;

    const title = programClass?.name + " - " + serie?.name || "Programme";

    return { title };
  };

  const { title: programTitle} = getProgramInfo();

  const isLoading = isLoadingProgram || isLoadingCourses || isLoadingCategories;

  // Render loading state
  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement des cours...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable
          style={styles.headerIcon}
          onPress={() => {
            trigger(HapticType.LIGHT);
            router.back();
          }}
        >
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
            name={viewMode === "grid" ? "view-list" : "view-grid"}
            size={24}
            color={theme.color.primary[500]}
          />
        </Pressable>
      </View>

      {/* Search bar */}
      <View
        style={[styles.searchContainer, isDark && styles.searchContainerDark]}
      >
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Rechercher un cours..."
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

      {/* Category filter */}
      <View style={{ height: 50, marginTop: 8 }}>
        <CategoryFilter
          id={"courses-categories-filter"}
          categories={categories()}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </View>

      {/* Course count */}
      <View
        style={[
          styles.courseCountContainer,
          isDark && styles.courseContContainerDark,
          { marginTop: 4 },
        ]}
      >
        <ThemedText
          style={[styles.courseCountText, isDark && styles.courseCountTextDark]}
        >
          {filteredCourses().length} cours disponibles
        </ThemedText>
      </View>

      {/* Courses display (grid or list) */}
      {viewMode === "grid" ? (
        <CourseGridByCategory
          courses={filteredCourses()}
          programId={String(programId)}
          type="secondary"
          selectedCategory={selectedCategory}
          onCoursePress={handleCoursePress}
          isEnrolled={isEnrolled}
        />
      ) : (
        <CourseList
          pdId={String(programId)}
          courses={filteredCourses()}
          onCoursePress={handleCoursePress}
          isEnrolled={isEnrolled}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingContainerDark: {
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
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
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    marginTop: 2,
  },
  concoursText: {
    color: theme.color.primary[500],
  },
  schoolText: {
    fontWeight: "500",
  },
  viewModeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchBoxDark: {
    backgroundColor: "#374151",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#111827",
  },
  searchInputDark: {
    color: "#FFFFFF",
  },
  clearButton: {
    padding: 4,
  },
  courseCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
  },
  courseContContainerDark: {
    backgroundColor: "#374151",
  },
  courseCountText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "500",
  },
  courseCountTextDark: {
    color: "#D1D5DB",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default CourseScreen;
