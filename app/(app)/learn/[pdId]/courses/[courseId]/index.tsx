import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { ThemedText } from "@/components/ThemedText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { theme } from "@/constants/theme";
import WebView from "react-native-webview";

type Video = {
  id: string;
  title: string;
  duration: number;
  order_index: number;
};

type Section = {
  id: string;
  name: string;
  content: any;
};

type ViewType = "content" | "videos" | "quizzes";

const CourseDetail = () => {
  const router = useRouter();
  const { courseId, pdId } = useLocalSearchParams();
  const [selectedView, setSelectedView] = useState<ViewType>("content");

  console.log(courseId, pdId)
  

  // Fetch course data
  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    mutate: mutateCourse
  } = useSWR(courseId ? `course-${courseId}` : null, async () => {
    const { data } = await supabase
      .from("courses")
      .select(
        `
            *,
            category:courses_categories(*),
            courses_content(*),
            course_videos(*)
          `
      )
      .eq("id", courseId)
      .single();
    return data;
  });

  // Fetch related quizzes
  const { data: quizzes, mutate: mutateQuiz } = useSWR(
    courseId ? `quizzes-${courseId}` : null,
    async () => {
      const { data } = await supabase
        .from("quiz")
        .select("*")
        .eq("course", courseId);
      return data;
    }
  );

  if (courseLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#65B741" />
      </View>
    );
  }

  if (courseError) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>
          Une erreur s'est produite lors du chargement du cours.
        </ThemedText>
      </View>
    );
  }


  const sections = course?.courses_content || [];
  const videos = course?.course_videos || [];

//   console.log(course)

  const renderContent = () => {
    switch (selectedView) {
      case "content":
        return sections.map((section: Section) => (
          <Pressable
          key={section.id}
            onPress={() =>
              router.push(
                `/(app)/learn/${pdId}/courses/${courseId}/lessons/${section.id}`
              )
            }
            style={styles.contentItem}
          >
            <View style={styles.contentHeader}>
              <MaterialCommunityIcons name="check" size={20} color="#65B741" />
              <ThemedText style={styles.contentTitle}>
                {section.name}
              </ThemedText>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="#65B741"
              />
            </View>

          </Pressable>
        ));

      case "videos":
        return videos.map((video: Video) => (
          <Pressable
            key={video.id}
            style={styles.videoItem}
            onPress={() => {
              // Handle video selection
            }}
          >
            <MaterialCommunityIcons
              name="play-circle"
              size={20}
              color="#65B741"
            />
            <ThemedText style={styles.videoTitle}>{video.title}</ThemedText>
            <ThemedText style={styles.videoDuration}>
              {Math.floor(video.duration / 60)}min
            </ThemedText>
          </Pressable>
        ));

      case "quizzes":
        return (
          quizzes?.map((quiz) => (
            <Pressable
              key={quiz.id}
              style={styles.quizItem}
              onPress={() =>
                router.push(`/(app)/learn/${courseId}/quiz/${quiz.id}`)
              }
            >
              <MaterialCommunityIcons
                name="help-circle"
                size={20}
                color="#6366F1"
              />
              <ThemedText style={styles.quizTitle}>{quiz.name}</ThemedText>
              <View style={styles.quizChip}>
                <ThemedText style={styles.quizChipText}>Quiz</ThemedText>
              </View>
            </Pressable>
          )) || []
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Course Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.push(`/(app)/learn/${pdId}/courses`)}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText style={styles.courseTitle} numberOfLines={1} >{course?.name}</ThemedText>
   
          <ThemedText style={styles.courseInfo}>
            {course?.category?.name} • {sections.length} sections •{" "}
            {videos.length} vidéos
          </ThemedText>
        </View>
      </View>

      {/* Navigation Chips */}
      <View style={{ height: 80, margin: 0, padding: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
          contentContainerStyle={styles.chipContent}
        >
          <Pressable
            style={[
              styles.chip,
              selectedView === "content" && styles.selectedChip,
            ]}
            onPress={() => setSelectedView("content")}
          >
            <MaterialCommunityIcons
              name="text-box-outline"
              size={18}
              color={selectedView === "content" ? "#FFFFFF" : "#4B5563"}
            />
            <ThemedText
              style={[
                styles.chipText,
                selectedView === "content" && styles.selectedChipText,
              ]}
            >
              Contenu
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              selectedView === "videos" && styles.selectedChip,
            ]}
            onPress={() => setSelectedView("videos")}
          >
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={18}
              color={selectedView === "videos" ? "#FFFFFF" : "#4B5563"}
            />
            <ThemedText
              style={[
                styles.chipText,
                selectedView === "videos" && styles.selectedChipText,
              ]}
            >
              Vidéos
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              selectedView === "quizzes" && styles.selectedChip,
            ]}
            onPress={() => setSelectedView("quizzes")}
          >
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={18}
              color={selectedView === "quizzes" ? "#FFFFFF" : "#4B5563"}
            />
            <ThemedText
              style={[
                styles.chipText,
                selectedView === "quizzes" && styles.selectedChipText,
              ]}
            >
              Quiz
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>
      {/* Content Area */}
      <ScrollView style={styles.content}>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  courseInfo: {
    fontSize: 14,
    color: "#6B7280",
  },
  chipContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    height: 48,
    marginBottom: 16,
    borderBottomColor: "#E5E7EB",
  },
  chipContent: {
    paddingHorizontal: 16,
    gap: 8,
    height: "100%",
    alignItems: "center",
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    gap: 6,
  },
  selectedChip: {
    backgroundColor: "#65B741",
  },
  chipText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  selectedChipText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1, // Ajout de flex 1
  },
  contentContainer: {
    //   flexGrow: 1,
  },
  contentItem: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: theme.border.width.thin,
    borderColor: theme.color.background,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  contentDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
  },
  videoTitle: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  videoDuration: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  quizItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
  },
  quizTitle: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  quizChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quizChipText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
  },
});

export default CourseDetail;
