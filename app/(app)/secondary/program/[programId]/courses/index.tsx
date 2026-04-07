import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { useSecondaryDailyContent } from "@/hooks/secondary/useSecondaryDailyContent";
import {
  useSecondaryProgram,
  useSecondaryProgramCourses,
} from "@/hooks/secondary/useSecondaryPrograms";
import { useColorScheme } from "@/hooks/useColorScheme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { Category, CourseItem } from "@/types/course.type";
import { useUser } from "@/contexts/useUserInfo";
import { useAuth } from "@/contexts/auth";

const CourseScreen: React.FC<null> = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { programId } = useLocalSearchParams();
  const { trigger } = useHaptics();
  const { isSecondaryProgramEnrolled } = useUser();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isEnrolled = isSecondaryProgramEnrolled(String(programId));

  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(
    String(programId)
  );
  const { dailyContent } = useSecondaryDailyContent(String(programId), user?.id);
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
  }, [allCategories, courses]);

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
  }, [allCategories, courses, searchQuery, selectedCategory]);

  const findDailyCourseItemId = useCallback(
    (courseId: string | number | null | undefined) => {
      if (courseId == null) return null;
      return (
        dailyContent?.courses.find(
          (dailyCourse) => String(dailyCourse.courseId) === String(courseId)
        )?.dailyContentItemId ?? null
      );
    },
    [dailyContent?.courses]
  );

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle course press
  const handleCoursePress = async (courseItem: CourseItem) => {
    await trigger(HapticType.LIGHT);
    const courseId = courseItem.course?.id;
    if (!courseId) return;

    const dailyContentItemId = findDailyCourseItemId(courseId);
    const route = `/secondary/program/${programId}/courses/${courseId}${
      dailyContentItemId ? `?dailyContentItemId=${dailyContentItemId}` : ""
    }`;

    router.push(route as Href);
  };

  const featuredCourse = useMemo(() => {
    const primaryDailyCourse = dailyContent?.courses?.[0];
    if (!primaryDailyCourse || !courses?.length) return null;

    return (
      courses.find(
        (courseItem) =>
          String(courseItem.course?.id) === String(primaryDailyCourse.courseId)
      ) ?? null
    );
  }, [courses, dailyContent?.courses]);

  const featuredCourseRoute = useMemo(() => {
    if (!featuredCourse?.course?.id) return null;
    const dailyContentItemId = findDailyCourseItemId(featuredCourse.course.id);

    return `/secondary/program/${programId}/courses/${featuredCourse.course.id}${
      dailyContentItemId ? `?dailyContentItemId=${dailyContentItemId}` : ""
    }`;
  }, [featuredCourse, findDailyCourseItemId, programId]);

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

      {featuredCourse && featuredCourseRoute ? (
        <View style={[styles.featuredCardWrapper, isDark && styles.featuredCardWrapperDark]}>
          <Pressable
            style={[styles.featuredCard, isDark && styles.featuredCardDark]}
            onPress={() => {
              trigger(HapticType.LIGHT);
              router.push(featuredCourseRoute as Href);
            }}
          >
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={16}
                color="#FFFFFF"
              />
              <ThemedText style={styles.featuredBadgeText}>
                Cours du jour
              </ThemedText>
            </View>

            <ThemedText style={[styles.featuredTitle, isDark && styles.featuredTitleDark]}>
              {featuredCourse.course?.name || "Cours du jour"}
            </ThemedText>

            <ThemedText
              style={[styles.featuredSubtitle, isDark && styles.featuredSubtitleDark]}
            >
              Le même cours est mis en avant aujourd&apos;hui pour tous les élèves de {programTitle}.
            </ThemedText>

            <View style={styles.featuredFooter}>
              <ThemedText style={[styles.featuredMeta, isDark && styles.featuredMetaDark]}>
                {dailyContent?.courses?.[0]
                  ? `${Math.round(dailyContent.courses[0].progressPercentage)}% de progression`
                  : "À faire aujourd'hui"}
              </ThemedText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.color.primary[500]}
              />
            </View>
          </Pressable>
        </View>
      ) : null}

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
  featuredCardWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  featuredCardWrapperDark: {
    backgroundColor: "#111827",
  },
  featuredCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  featuredCardDark: {
    backgroundColor: "#422006",
    borderColor: "#D97706",
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
    backgroundColor: "#D97706",
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
    color: "#78350F",
  },
  featuredSubtitleDark: {
    color: "#FDE68A",
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
    color: "#B45309",
    flex: 1,
    marginRight: 8,
  },
  featuredMetaDark: {
    color: "#FCD34D",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default CourseScreen;
