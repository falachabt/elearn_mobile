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
import { useColorScheme } from "@/hooks/useColorScheme";

const QuizList = () => {
  const router = useRouter();
  const { pdId } = useLocalSearchParams();
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

  const { data: quizzes, error } = useSWR(
    pdId ? `quizzes-${pdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("quiz_learningpath")
        .select(
          `
          *,
          quiz:quiz(
            *,
            category:courses_categories(*),
            quiz_questions(id),
            course(*)
          )
        `
        )
        .eq("lpId", pdId);

      return data;
    }


  );

  // Extract unique categories
  const categories = useMemo(() => {
    if (!quizzes) return [];
    const uniqueCategories = new Set(
      quizzes.map((quiz) => quiz.quiz?.category?.name).filter(Boolean)
    );
    return Array.from(uniqueCategories);
  }, [quizzes]);

  // Filter quizzes
  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    return quizzes.filter((quizItem) => {
      const quiz = quizItem.quiz;
      if (!quiz) return false;
      const matchesSearch = quiz.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || quiz.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [quizzes, searchQuery, selectedCategory]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.programHeader, isDark && styles.programHeaderDark]}>
        <ThemedText style={[styles.programName, isDark && styles.programNameDark]}>
          Programme ING PolytechStandart
        </ThemedText>
        <ThemedText style={styles.schoolInfo}>
          ing • <ThemedText style={styles.schoolName}>PolyTech</ThemedText>
        </ThemedText>
      </View>

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

      <ThemedText style={[styles.quizCount, isDark && styles.quizCountDark]}>
        {filteredQuizzes.length} quiz disponibles
      </ThemedText>

      <ScrollView style={styles.quizList}>
        {filteredQuizzes.map((quizItem) => {
          const questions = quizItem.quiz?.quiz_questions?.length || 0;
          const relatedCourse = quizItem.quiz?.course?.name;
          
          return (
            <Pressable
              key={quizItem.quiz?.id}
              style={[styles.quizItem, isDark && styles.quizItemDark]}
              onPress={() => router.push(`/(app)/learn/${pdId}/quizzes/${quizItem.quiz?.id}` as any)}
            >
              <View style={styles.quizContent}>
                <View style={styles.quizHeader}>
                  <View style={[styles.quizIcon, isDark && styles.quizIconDark]}>
                    <MaterialCommunityIcons
                      name="pencil-box-multiple"
                      size={24}
                      color={isDark ? "#818CF8" : "#2563EB"}
                    />
                  </View>
                  <View style={styles.quizTitleContainer}>
                    <ThemedText 
                      style={[styles.quizTitle, isDark && styles.quizTitleDark]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {quizItem.quiz?.name}
                    </ThemedText>
                    <ThemedText style={[styles.quizMetrics, isDark && styles.quizMetricsDark]}>
                      {questions} questions • {relatedCourse ? `Cours: ${relatedCourse}` : 'Quiz indépendant'}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={isDark ? "#6B7280" : "#9CA3AF"}
                  />
                </View>

                <View style={[styles.quizBadge, isDark && styles.quizBadgeDark]}>
                  <ThemedText style={[styles.quizBadgeText, isDark && styles.quizBadgeTextDark]}>
                    {quizItem.quiz?.category?.name}
                  </ThemedText>
                </View>

                <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                  <View
                    style={[
                      styles.progressFill,
                      isDark && styles.progressFillDark,
                      { width: "30%" }
                    ]}
                  />
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
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  programHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  programHeaderDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  programName: {
    fontSize: 24,
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
  schoolName: {
    color: "#65B741",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 16,
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
    height: 40,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    height: 32,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[200],
    justifyContent: 'center',
  },
  categoryChipDark: {
    backgroundColor: "#374151",
  },
  selectedCategory: {
    backgroundColor: "#2563EB",
  },
  selectedCategoryDark: {
    backgroundColor: "#3B82F6",
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
  quizCount: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
  },
  quizCountDark: {
    color: "#9CA3AF",
    backgroundColor: "#1F2937",
  },
  quizList: {
    flex: 1,
  },
  quizItem: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  quizItemDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  quizContent: {
    padding: 16,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  quizIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quizIconDark: {
    backgroundColor: "rgba(129, 140, 248, 0.2)",
  },
  quizTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
    flexShrink: 1,
  },
  quizTitleDark: {
    color: "#FFFFFF",
  },
  quizMetrics: {
    fontSize: 12,
    color: "#6B7280",
  },
  quizMetricsDark: {
    color: "#9CA3AF",
  },
  quizBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  quizBadgeDark: {
    backgroundColor: "#374151",
  },
  quizBadgeText: {
    fontSize: 12,
    color: "#4B5563",
  },
  quizBadgeTextDark: {
    color: "#D1D5DB",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 12,
  },
  progressBarDark: {
    backgroundColor: "#374151",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 2,
  },
  progressFillDark: {
    backgroundColor: "#3B82F6",
  },
});

export default QuizList;