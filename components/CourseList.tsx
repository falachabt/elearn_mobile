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

interface CourseListProps {
  pdId: string;
}

const CourseList: React.FC<CourseListProps> = ({ pdId }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  console.log("programId",pdId)

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
    <View style={styles.container}>
      <View style={styles.programHeaderMain}>
        <View style={styles.courseIcon}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={24}
            color="#4CAF50"
          />
        </View>
        <View style={styles.programHeader}>
        <ThemedText style={styles.programName}>
          Programme ING PolytechStandart
        </ThemedText>
        <ThemedText style={styles.schoolInfo}>
          ing • <ThemedText style={styles.schoolName}>PolyTech</ThemedText>
        </ThemedText>
          </View> 
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un cours..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#6B7280"
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
              selectedCategory === "all" && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <ThemedText
              style={[
                styles.categoryText,
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
                selectedCategory === category && styles.selectedCategory,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText,
                ]}
              >
                {category}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ThemedText style={styles.courseCount}>
        {filteredCourses.length} cours disponibles
      </ThemedText>

      <ScrollView style={styles.courseList}>
        {filteredCourses.map((courseItem) => {
          const sections = courseItem.course?.courses_content?.length || 0;
          const videos = courseItem.course?.course_videos?.length || 0;
          const isCompleted = Math.random() < 0.5

          return (
            <Pressable
              key={courseItem.course?.id}
              style={styles.courseItem}
              onPress={() =>
                router.push(`/(app)/learn/${pdId}/courses/${courseItem.course?.id}`)
              }
            >
              <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                  <View style={isCompleted ? styles.courseIcon : styles.courseIconIncomplete}>
                    <MaterialCommunityIcons
                      name={ isCompleted ?"check" : "book" }
                      size={24}
                      color={ isCompleted ? "#4CAF50" : theme.color.gray[600] }
                    />
                  </View>
                  <View style={styles.courseTitleContainer}>
                    <ThemedText
                      style={styles.courseTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {courseItem.course?.name}
                    </ThemedText>
                    <ThemedText style={styles.courseMetrics}>
                      {courseItem.course?.category?.name} • {sections} sections
                      • {videos} vidéos
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: "30%" }]} />
                </View>
              </View>
            </Pressable>
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
  programHeaderMain: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  programHeader: {
    // paddingHorizontal: 16,
    // paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  programName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },
  schoolInfo: {
    fontSize: 14,
    color: "#65B741",
    marginTop: 4,
  },
  schoolName: {
    color: "#65B741",
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
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
  selectedCategory: {
    backgroundColor: "#65B741",
  },
  categoryText: {
    fontSize: 14,
    color: "#4B5563",
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
  courseList: {
    flex: 1,
  },
  courseItem: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  courseContent: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  courseIconIncomplete: {
    width: 40,
    height: 40,
    backgroundColor: theme.color.gray[200],
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  courseTitleContainer: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
    flexShrink: 1,
  },
  courseMetrics: {
    fontSize: 12,
    color: "#6B7280",
  },
  courseBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  courseBadgeText: {
    fontSize: 12,
    color: "#4B5563",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#65B741",
    borderRadius: 2,
  },
});

export default CourseList;
