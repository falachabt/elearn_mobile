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
  
  const QuizList = () => {
    const router = useRouter();
    const { pdId } = useLocalSearchParams();
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
      <View style={styles.container}>
        <View style={styles.programHeader}>
          <ThemedText style={styles.programName}>Programme ING PolytechStandart</ThemedText>
          <ThemedText style={styles.schoolInfo}>
            ing • <ThemedText style={styles.schoolName}>PolyTech</ThemedText>
          </ThemedText>
        </View>
  
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un quiz..."
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
  
        <ThemedText style={styles.quizCount}>
          {filteredQuizzes.length} quiz disponibles
        </ThemedText>
  
        <ScrollView style={styles.quizList}>
          {filteredQuizzes.map((quizItem) => {
            const questions = quizItem.quiz?.quiz_questions?.length || 0;
            const relatedCourse = quizItem.quiz?.course?.name;
            
            return (
              <Pressable
                key={quizItem.quiz?.id}
                style={styles.quizItem}
                onPress={() => router.push(`/quiz/${quizItem.quiz?.id}` as any)}
              >
                <View style={styles.quizContent}>
                  <View style={styles.quizHeader}>
                    <View style={styles.quizIcon}>
                      <MaterialCommunityIcons
                        name="pencil-box-multiple"
                        size={24}
                        color="#2563EB"
                      />
                    </View>
                    <View style={styles.quizTitleContainer}>
                      <ThemedText 
                        style={styles.quizTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {quizItem.quiz?.name}
                      </ThemedText>
                      <ThemedText style={styles.quizMetrics}>
                        {questions} questions • {relatedCourse ? `Cours: ${relatedCourse}` : 'Quiz indépendant'}
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color="#9CA3AF"
                    />
                  </View>
  
                  <View style={styles.quizBadge}>
                    <ThemedText style={styles.quizBadgeText}>
                      {quizItem.quiz?.category?.name}
                    </ThemedText>
                  </View>
  
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
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
    programHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    programName: {
      fontSize: 24,
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
      margin: 16,
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
    selectedCategory: {
      backgroundColor: "#2563EB", // Blue for quizzes
    },
    categoryText: {
      fontSize: 14,
      color: "#4B5563",
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
    quizList: {
      flex: 1,
    },
    quizItem: {
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
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
      backgroundColor: "#EFF6FF", // Light blue background
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
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
    quizMetrics: {
      fontSize: 12,
      color: "#6B7280",
    },
    quizBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#F3F4F6",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 8,
    },
    quizBadgeText: {
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
      backgroundColor: "#2563EB", // Blue progress for quizzes
      borderRadius: 2,
    },
  });
  
  export default QuizList;