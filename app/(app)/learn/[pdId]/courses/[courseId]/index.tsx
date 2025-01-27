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
import { useCourseProgress } from "@/hooks/useCourseProgress";
import {
  CoursesContent,
  CoursesCategories,
  Courses,
  CourseVideos,
} from "@/types/type";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Course extends Courses {
  course_category: CoursesCategories;
  courses_content: CoursesContent[];
  course_videos: CourseVideos[];
}

type ViewType = "content" | "videos" | "quizzes";

const CourseDetail = () => {
  const router = useRouter();
  const { courseId, pdId } = useLocalSearchParams();
  const [selectedView, setSelectedView] = useState<ViewType>("content");
  const { sectionsProgress } = useCourseProgress(Number(courseId));
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  console.log(courseId, pdId);

  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    mutate: mutateCourse,
  } = useSWR<Course>(courseId ? `course-${courseId}` : null, async () => {
    const { data } = await supabase
      .from("courses")
      .select(
        `
            *,
            category:courses_categories(*),
            courses_content(name, id, order),
            course_videos(*)
          `
      )
      .eq("id", courseId)
      .single();
    return data;
  });

  const { data: quizzes, mutate: mutateQuiz } = useSWR(
    courseId ? `quizzes-${courseId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("quiz_courses")
        .select("quiz(*)")
        .eq("courseId", courseId);
      return data?.map((d: any) => d.quiz);
    }
  );

  if (courseLoading) {
    return (
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#6EE7B7" : "#65B741"}
        />
      </View>
    );
  }

  if (courseError) {
    return (
      <View
        style={[styles.errorContainer, isDark && styles.errorContainerDark]}
      >
        <ThemedText style={styles.errorText}>
          Une erreur s'est produite lors du chargement du cours.
        </ThemedText>
      </View>
    );
  }

  const sections =
    course?.courses_content?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) ||
    [];
  const videos = course?.course_videos || [];

  const renderContent = () => {
    switch (selectedView) {
      case "content":
        return sections.map((section) => {
          const progress = sectionsProgress?.find(
            (sp) => sp.sectionid == Number(section.id)
          );
          return (
            <Pressable
              key={section.id}
              style={[styles.contentItem, isDark && styles.contentItemDark]}
              onPress={() => {
                router.push(
                  `/(app)/learn/${pdId}/courses/${courseId}/lessons/${section.id}`
                );
              }}
            >
              <View style={styles.contentHeader}>
                <ThemedText
                  style={[
                    styles.contentTitle,
                    isDark && styles.contentTitleDark,
                  ]}
                >
                  {section.name}
                </ThemedText>
                {progress && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={isDark ? "#6EE7B7" : "#65B741"}
                  />
                )}
              </View>
            </Pressable>
          );
        });

      case "videos":
        return videos.map((video) => (
          <Pressable
            key={video.id}
            style={[styles.videoItem, isDark && styles.videoItemDark]}
            onPress={() => {
              router.push(
                `/(app)/learn/${pdId}/courses/${courseId}/videos/${video.id}`
              );
            }}
          >
            <MaterialCommunityIcons
              name="play-circle"
              size={20}
              color={isDark ? "#6EE7B7" : "#65B741"}
            />
            <ThemedText
              style={[styles.videoTitle, isDark && styles.videoTitleDark]}
            >
              {video.title}
            </ThemedText>
            <ThemedText
              style={[styles.videoDuration, isDark && styles.videoDurationDark]}
            >
              {Math.floor(video?.duration || 0 / 60)}min
            </ThemedText>
          </Pressable>
        ));

      case "quizzes":
        return (
          quizzes?.map(
            (quiz, index) =>
              quiz?.id && (
                <Pressable
                  key={quiz?.id + index}
                  style={[styles.quizItem, isDark && styles.quizItemDark]}
                  onPress={() =>
                    router.push(`/(app)/learn/${pdId}/quizzes/${quiz.id}`)
                  }
                >
                  <MaterialCommunityIcons
                    name="help-circle"
                    size={20}
                    color={isDark ? "#818CF8" : "#6366F1"}
                  />
                  <ThemedText
                    style={[styles.quizTitle, isDark && styles.quizTitleDark]}
                  >
                    {quiz?.name}
                  </ThemedText>
                  <View
                    style={[styles.quizChip, isDark && styles.quizChipDark]}
                  >
                    <ThemedText
                      style={[
                        styles.quizChipText,
                        isDark && styles.quizChipTextDark,
                      ]}
                    >
                      Quiz
                    </ThemedText>
                  </View>
                </Pressable>
              )
          ) || []
        );
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push(`/(app)/learn/${pdId}/courses`)}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText
            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
            numberOfLines={1}
          >
            {course?.name}
          </ThemedText>
          <ThemedText
            style={[styles.courseInfo, isDark && styles.courseInfoDark]}
          >
            {course?.course_category?.name} • {sections.length} sections •{" "}
            {videos.length} vidéos
          </ThemedText>
        </View>
      </View>

      <View style={{ height: 80, margin: 0, padding: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.chipContainer, isDark && styles.chipContainerDark]}
          contentContainerStyle={styles.chipContent}
        >
          <Pressable
            style={[
              styles.chip,
              isDark && styles.chipDark,
              selectedView === "content" && styles.selectedChip,
              selectedView === "content" && isDark && styles.selectedChipDark,
            ]}
            onPress={() => setSelectedView("content")}
          >
            <MaterialCommunityIcons
              name="text-box-outline"
              size={18}
              color={
                selectedView === "content"
                  ? "#FFFFFF"
                  : isDark
                  ? "#D1D5DB"
                  : "#4B5563"
              }
            />
            <ThemedText
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                selectedView === "content" && styles.selectedChipText,
              ]}
            >
              Contenu
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              isDark && styles.chipDark,
              selectedView === "videos" && styles.selectedChip,
              selectedView === "videos" && isDark && styles.selectedChipDark,
            ]}
            onPress={() => setSelectedView("videos")}
          >
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={18}
              color={
                selectedView === "videos"
                  ? "#FFFFFF"
                  : isDark
                  ? "#D1D5DB"
                  : "#4B5563"
              }
            />
            <ThemedText
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                selectedView === "videos" && styles.selectedChipText,
              ]}
            >
              Vidéos
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              isDark && styles.chipDark,
              selectedView === "quizzes" && styles.selectedChip,
              selectedView === "quizzes" && isDark && styles.selectedChipDark,
            ]}
            onPress={() => setSelectedView("quizzes")}
          >
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={18}
              color={
                selectedView === "quizzes"
                  ? "#FFFFFF"
                  : isDark
                  ? "#D1D5DB"
                  : "#4B5563"
              }
            />
            <ThemedText
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                selectedView === "quizzes" && styles.selectedChipText,
              ]}
            >
              Quiz
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView style={[styles.content, isDark && styles.contentDark]}>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  errorContainerDark: {
    backgroundColor: "#111827",
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
  headerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
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
  courseTitleDark: {
    color: "#FFFFFF",
  },
  courseInfo: {
    fontSize: 14,
    color: "#6B7280",
  },
  courseInfoDark: {
    color: "#9CA3AF",
  },
  chipContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    height: 48,
    marginBottom: 16,
    borderBottomColor: "#E5E7EB",
  },
  chipContainerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
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
  chipDark: {
    backgroundColor: "#374151",
  },
  selectedChip: {
    backgroundColor: "#65B741",
  },
  selectedChipDark: {
    backgroundColor: "#059669",
  },
  chipText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextDark: {
    color: "#D1D5DB",
  },
  selectedChipText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentDark: {
    backgroundColor: "#111827",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  contentItem: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: theme.border.width.thin,
    borderColor: theme.color.background,
  },
  contentItemDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
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
  contentTitleDark: {
    color: "#FFFFFF",
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  videoItemDark: {
    backgroundColor: "#1F2937",
  },
  videoTitle: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  videoTitleDark: {
    color: "#F3F4F6",
  },
  videoDuration: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  videoDurationDark: {
    color: "#9CA3AF",
  },
  quizItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quizItemDark: {
    backgroundColor: "#1F2937",
  },
  quizTitle: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  quizTitleDark: {
    color: "#F3F4F6",
  },
  quizChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quizChipDark: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  quizChipText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
  },
  quizChipTextDark: {
    color: "#818CF8",
  },
  contentDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  contentDescriptionDark: {
    color: "#9CA3AF",
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarDark: {
    backgroundColor: "#374151",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#65B741",
    borderRadius: 2,
  },
  progressFillDark: {
    backgroundColor: "#059669",
  },
});

export default CourseDetail;
