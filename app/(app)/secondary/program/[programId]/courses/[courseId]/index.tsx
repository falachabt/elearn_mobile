import { ScrollView, StyleSheet, View } from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import useSWR from "swr";

import { supabase } from "@/lib/supabase";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useUser } from "@/contexts/useUserInfo";
import { useCustomRouter } from "@/hooks/useCustomRouter";
import { Courses, CoursesCategories, CoursesContent, CourseVideos } from "@/types/type";
import {
  ViewType,
  EmptyState,
  PreviewBanner,
  ContentItem,
  VideoItem,
  QuizItem,
  ViewTabs,
  CourseHeader,
  LoadingState,
  ErrorState,
} from "@/components/shared/courses";
import { useCourseProgress } from "@/hooks/useCourseProgress";

interface Course extends Courses {
  course_category: CoursesCategories;
  courses_content: CoursesContent[];
  course_videos: CourseVideos[];
}

const SecondaryCourseDetail = () => {
  const router = useCustomRouter();
  const { courseId, programId } = useLocalSearchParams();
  const [selectedView, setSelectedView] = useState<ViewType>("content");
  const { sectionsProgress, refreshProgress } = useCourseProgress(Number(courseId));
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const { trigger } = useHaptics();

  // Check if user is enrolled in this program
  const { isSecondaryProgramEnrolled } = useUser();
  const isEnrolled = isSecondaryProgramEnrolled(String(programId));

  // Set preview mode based on enrollment status
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(!isEnrolled);

  // Refresh progress when navigating to this page
  useEffect(() => {
    refreshProgress();
  }, [courseId]);

  // Update preview mode when enrollment status changes
  useEffect(() => {
    setIsPreviewMode(!isEnrolled);
  }, [isEnrolled]);

  // Handle purchase or enrollment flow
  const handlePurchaseFlow = () => {
    trigger(HapticType.SELECTION);
    // Navigate to secondary program purchase page
    router.push(`/(app)/secondary/program/${programId}`);
  };

  // Handle locked content access attempts
  const handleLockedContentAccess = () => {
    trigger(HapticType.NOTIFICATION_ERROR);
    handlePurchaseFlow();
  };

  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    mutate: mutateCourse,
  } = useSWR<Course>(courseId ? `secondary-course-${courseId}` : null, async () => {
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

  const { data: quizzes } = useSWR(
    courseId ? `secondary-quizzes-${courseId}` : null,
    async () => {
      const { data } = await supabase
        .from("quiz_courses")
        .select("quiz(id, name, questions:quiz_questions(id))")
        .eq("courseId", courseId);
      return data?.map((d: { quiz: unknown }) => d.quiz);
    }
  );

  const { data: quizProgress } = useSWR(
    user ? [`secondary-quiz-progress-${user.id}`, courseId, quizzes] : null,
    async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, status, score, quiz_id")
        .eq("user_id", user?.id)
        .in("quiz_id", quizzes?.map((q: { id: number }) => q.id) || []);
      return data;
    }
  );

  const getHighestScore = (quizId: number) => {
    const quizAttempts = quizProgress?.filter((attempt) => attempt.quiz_id === quizId);
    if (!quizAttempts || quizAttempts.length === 0) return 0;
    const highestScore = Math.max(...quizAttempts.map((attempt) => attempt.score));
    return highestScore || 0;
  };

  // Optional: Add a loading state while checking enrollment
  if (typeof isEnrolled === "undefined") {
    return <LoadingState isDark={isDark} message="Vérification de l'inscription..." />;
  }

  if (courseLoading) {
    return <LoadingState isDark={isDark} />;
  }

  if (courseError) {
    return <ErrorState isDark={isDark} onRetry={() => mutateCourse()} />;
  }

  const sections =
    course?.courses_content?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || [];
  const videos = course?.course_videos || [];

  const renderContent = () => {
    switch (selectedView) {
      case "content":
        if (sections.length === 0) {
          return <EmptyState type="content" isDark={isDark} />;
        }

        // En mode aperçu, afficher uniquement la première section
        const visibleSections = isPreviewMode ? sections.slice(0, 1) : sections;

        const sectionItems = visibleSections.map((section, index) => {
          const progress = sectionsProgress?.find(
            (sp) => sp.sectionid == Number(section.id)
          );

          return (
            <ContentItem
              key={section.id}
              section={section}
              index={index}
              progress={progress}
              isDark={isDark}
              isLocked={isPreviewMode && index >= 1}
              onPress={() => {
                if (isPreviewMode && index >= 1) {
                  handleLockedContentAccess();
                  return;
                }
                trigger(HapticType.SELECTION);
                router.push(
                  `/(app)/secondary/program/${programId}/courses/${courseId}/lessons/${section.id}`
                );
              }}
            />
          );
        });

        // Bannière d'achat si mode aperçu et plus d'une section
        if (isPreviewMode && sections.length > 1) {
          return (
            <>
              {sectionItems}
              <PreviewBanner
                isDark={isDark}
                itemCount={sections.length - 1}
                itemType="sections"
                onPurchase={handlePurchaseFlow}
              />
            </>
          );
        }

        return sectionItems;

      case "videos":
        if (videos.length === 0) {
          return <EmptyState type="videos" isDark={isDark} />;
        }

        // En mode aperçu, afficher uniquement la première vidéo
        const visibleVideos = isPreviewMode ? videos.slice(0, 1) : videos;

        const videoItems = visibleVideos.map((video, index) => (
          <VideoItem
            key={video.id}
            video={video}
            index={index}
            isDark={isDark}
            isLocked={isPreviewMode && index >= 1}
            onPress={() => {
              if (isPreviewMode && index >= 1) {
                handleLockedContentAccess();
                return;
              }
              trigger(HapticType.SELECTION);
              router.push(
                `/(app)/secondary/program/${programId}/courses/${courseId}/videos/${video.id}`
              );
            }}
          />
        ));

        // Bannière d'achat si mode aperçu et plus d'une vidéo
        if (isPreviewMode && videos.length > 1) {
          return (
            <>
              {videoItems}
              <PreviewBanner
                isDark={isDark}
                itemCount={videos.length - 1}
                itemType="vidéos"
                onPurchase={handlePurchaseFlow}
              />
            </>
          );
        }

        return videoItems;

      case "quizzes":
        if (!quizzes || quizzes.length === 0) {
          return <EmptyState type="quizzes" isDark={isDark} />;
        }

        // En mode aperçu, afficher uniquement le premier quiz
        const visibleQuizzes = isPreviewMode ? quizzes.slice(0, 1) : quizzes;

        const quizItems = visibleQuizzes.map(
          (quiz, index) =>
            quiz?.id && (
              <QuizItem
                key={quiz.id + index}
                quiz={quiz}
                index={index}
                highestScore={getHighestScore(quiz.id)}
                isDark={isDark}
                isLocked={isPreviewMode && index >= 1}
                onPress={() => {
                  if (isPreviewMode && index >= 1) {
                    handleLockedContentAccess();
                    return;
                  }
                  trigger(HapticType.SELECTION);
                  router.push(`/(app)/secondary/program/${programId}/quizzes/${quiz.id}`);
                }}
              />
            )
        );

        // Bannière d'achat si mode aperçu et plus d'un quiz
        if (isPreviewMode && quizzes.length > 1) {
          return (
            <>
              {quizItems}
              <PreviewBanner
                isDark={isDark}
                itemCount={quizzes.length - 1}
                itemType="quiz"
                onPurchase={handlePurchaseFlow}
              />
            </>
          );
        }

        return quizItems;
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <CourseHeader
        courseName={course?.name || ""}
        categoryName={course?.course_category?.name}
        sectionsCount={sections.length}
        videosCount={videos.length}
        isEnrolled={isEnrolled}
        isDark={isDark}
        onBack={() => {
          trigger(HapticType.LIGHT);
          router.push(`/(app)/secondary/program/${programId}/courses`);
        }}
      />

      <ViewTabs
        selectedView={selectedView}
        onViewChange={setSelectedView}
        isDark={isDark}
      />

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
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentDark: {
    backgroundColor: "#111827",
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingBottom: 60,
  },
});

export default SecondaryCourseDetail;
