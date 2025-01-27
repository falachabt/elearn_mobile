import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import React, { useState, useMemo } from "react";
import { ThemedText } from "@/components/ThemedText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { theme } from "@/constants/theme";
import CourseRowItem from "./shared/CourseRowItem";
import { useColorScheme } from "@/hooks/useColorScheme";

interface CourseListProps {
  pdId: string;
}

const CourseList: React.FC<CourseListProps> = ({ pdId }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: program } = useSWR(
    pdId ? `program-${pdId}` : null,
    async () => {
      const { data } = await supabase
        .from("learning_paths")
        .select(
          `
            *,
            concours_learningpaths(
              concour:concours(
                name,
                school:schools(name)
              )
            )
          `
        )
        .eq("id", pdId)
        .single();
      return data;
    }
  );

  const { data: courses } = useSWR(
    pdId ? `program-courses-${pdId}` : null,
    async () => {
      const { data } = await supabase
        .from("course_learningpath")
        .select(
          `
            *,
            course:courses(
              *,
              category:courses_categories(*),
              courses_content(*),
              course_videos(*)
            )
          `
        )
        .eq("lpId", pdId);
      return data;
    }
  );

  // Extract unique categories
  const categories = useMemo(() => {
    if (!courses) return [];
    const uniqueCategories = new Set(
      courses.map((course) => course.course?.category?.name).filter(Boolean)
    );
    return Array.from(uniqueCategories);
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((courseItem) => {
      const course = courseItem.course;
      if (!course) return false;
      const matchesSearch = course.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        course.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.programHeaderMain, isDark && styles.programHeaderMainDark]}>
        <View style={[styles.courseIcon, isDark && styles.courseIconDark]}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={24}
            color={isDark ? "#6EE7B7" : "#4CAF50"}
          />
        </View>
        <View style={[styles.programHeader, isDark && styles.programHeaderDark]}>
          <ThemedText style={[styles.programName, isDark && styles.programNameDark]}>
            Programme ING PolytechStandart
          </ThemedText>
          <ThemedText style={[styles.schoolInfo, isDark && styles.schoolInfoDark]}>
            ing • <ThemedText style={[styles.schoolName, isDark && styles.schoolNameDark]}>PolyTech</ThemedText>
          </ThemedText>
        </View>
      </View>

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
      </View>

      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          <Pressable
            style={[
              styles.categoryChip,
              isDark && styles.categoryChipDark,
              selectedCategory === "all" && styles.selectedCategory,
              selectedCategory === "all" && isDark && styles.selectedCategoryDark,
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <ThemedText
              style={[
                styles.categoryText,
                isDark && styles.categoryTextDark,
                selectedCategory === "all" && styles.selectedCategoryText,
              ]}
            >
              Tout
            </ThemedText>
          </Pressable>

          {categories.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryChip,
                isDark && styles.categoryChipDark,
                selectedCategory === category && styles.selectedCategory,
                selectedCategory === category && isDark && styles.selectedCategoryDark,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText
                style={[
                  styles.categoryText,
                  isDark && styles.categoryTextDark,
                  selectedCategory === category && styles.selectedCategoryText,
                ]}
              >
                {category}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ThemedText style={[styles.courseCount, isDark && styles.courseCountDark]}>
        {filteredCourses.length} cours disponibles
      </ThemedText>

      <ScrollView style={styles.courseList}>
        {filteredCourses.map((courseItem) => {
          return (
            <CourseRowItem 
              key={courseItem.course.id} 
              courseItem={courseItem} 
              pdId={pdId}
              isDark={isDark} 
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingBottom: 80,
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  programHeaderMain: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  programHeaderMainDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  programHeader: {
    backgroundColor: "#FFFFFF",
  },
  programHeaderDark: {
    backgroundColor: "#1F2937",
  },
  courseIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  courseIconDark: {
    backgroundColor: "rgba(110, 231, 183, 0.1)",
  },
  programName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },
  programNameDark: {
    color: "#FFFFFF",
  },
  schoolInfo: {
    fontSize: 14,
    color: "#65B741",
    marginTop: 4,
  },
  schoolInfoDark: {
    color: "#6EE7B7",
  },
  schoolName: {
    color: "#65B741",
  },
  schoolNameDark: {
    color: "#6EE7B7",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 10,
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
    fontSize: 16,
    color: "#111827",
  },
  searchInputDark: {
    color: "#FFFFFF",
  },
  categoryWrapper: {
    height: 60,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[200],
    justifyContent: "center",
  },
  categoryChipDark: {
    backgroundColor: "#374151",
  },
  selectedCategory: {
    backgroundColor: "#65B741",
  },
  selectedCategoryDark: {
    backgroundColor: "#059669",
  },
  categoryText: {
    fontSize: 14,
    color: "#4B5563",
  },
  categoryTextDark: {
    color: "#D1D5DB",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  courseCount: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
  },
  courseCountDark: {
    color: "#9CA3AF",
    backgroundColor: "#1F2937",
  },
  courseList: {
    flex: 1,
  },
  courseItem: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  courseItemDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  }
});

export default CourseList;