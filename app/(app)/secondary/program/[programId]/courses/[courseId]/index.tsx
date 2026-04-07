/* eslint-disable @typescript-eslint/no-explicit-any */
import { ScrollView, StyleSheet, View } from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import useSWR, { mutate as swrGlobalMutate } from "swr";

const invalidateDailyContent = () =>
  void swrGlobalMutate(
    (key: unknown) =>
      Array.isArray(key) &&
      typeof key[0] === "string" &&
      (key[0] === "secondary-daily-content" ||
        key[0] === "secondary-daily-content-programs"),
    undefined,
    { revalidate: true }
  );

import { supabase } from "@/lib/supabase";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useUser } from "@/contexts/useUserInfo";
import { useCustomRouter } from "@/hooks/useCustomRouter";
import {
  findSecondaryDailyItemId,
  markSecondaryDailyItemCompleted,
} from "@/services/secondary/dailyContent.service";
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
  CourseSummaryCard,
} from "@/components/shared/courses";
import { useCourseProgress } from "@/hooks/useCourseProgress";

interface Course extends Omit<Courses, "category"> {
  category: CoursesCategories | null;
  courses_content: CoursesContent[];
  course_videos: CourseVideos[];
}

interface QuizAttemptProgress {
  id: number;
  status: string | null;
  score: number | null;
  quiz_id: number | null;
}

interface SecondaryQuizItem {
  id: number;
  name: string;
  questions: { id: number }[];
}

const SecondaryCourseDetail = () => {
  const router = useCustomRouter();
  const { courseId, programId, dailyContentItemId } = useLocalSearchParams();
  const [selectedView, setSelectedView] = useState<ViewType>("content");
  const { progress, sectionsProgress, refreshProgress } = useCourseProgress(Number(courseId));
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const { trigger } = useHaptics();
  const hasMarkedDailyCourseRef = React.useRef(false);

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
    trigger(HapticType.ERROR);
    handlePurchaseFlow();
  };

  const {
    data: course,
    error: courseError,
    isLoading: courseLoading,
    mutate: mutateCourse,
  } = useSWR<Course>(courseId ? `secondary-course-${courseId}` : null, async () => {
    const { data } = await (supabase as any)
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

  const { data: courseSummary } = useSWR(
    courseId ? `secondary-course-summary-${courseId}` : null,
    async () => {
      const { data } = await (supabase as any)
        .from("course_summaries")
        .select("course_id, source_content_count")
        .eq("course_id", Number(courseId))
        .maybeSingle();
      return data;
    }
  );

  const { data: quizzes } = useSWR<SecondaryQuizItem[]>(
    courseId ? `secondary-quizzes-${courseId}` : null,
    async () => {
      const { data } = await (supabase as any)
        .from("quiz_courses")
        .select("quiz(id, name)")
        .eq("courseId", courseId);
      return (data ?? [])
        .map((d: { quiz: { id: number; name: string | null } | null }) => d.quiz)
        .filter((quiz: { id: number; name: string | null } | null): quiz is { id: number; name: string | null } => quiz !== null)
        .map((quiz: { id: number; name: string | null }) => ({
          id: quiz.id,
          name: quiz.name ?? "Quiz sans titre",
          questions: [],
        }));
    }
  );

  const { data: quizProgress } = useSWR<QuizAttemptProgress[]>(
    user ? [`secondary-quiz-progress-${user.id}`, courseId, quizzes] : null,
    async () => {
      const { data } = await (supabase as any)
        .from("quiz_attempts")
        .select("id, status, score, quiz_id")
        .eq("user_id", user?.id)
        .in("quiz_id", quizzes?.map((q: { id: number }) => q.id) || []);
      return data;
    }
  );

  const getHighestScore = (quizId: number) => {
    const quizAttempts = quizProgress?.filter((attempt: QuizAttemptProgress) => attempt.quiz_id === quizId);
    if (!quizAttempts || quizAttempts.length === 0) return 0;
    const highestScore = Math.max(...quizAttempts.map((attempt: QuizAttemptProgress) => attempt.score ?? 0));
    return highestScore || 0;
  };

  useEffect(() => {
    if (
      !user?.id ||
      !course ||
      !progress?.is_completed ||
      hasMarkedDailyCourseRef.current
    ) {
      return;
    }

    void (async () => {
      const effectiveDailyContentItemId =
        (typeof dailyContentItemId === "string" ? dailyContentItemId : null) ??
        (programId
          ? await findSecondaryDailyItemId(String(programId), user.id, {
              courseId: Number(courseId),
            })
          : null);

      if (!effectiveDailyContentItemId) return;

      hasMarkedDailyCourseRef.current = true;

      await markSecondaryDailyItemCompleted(
        effectiveDailyContentItemId,
        user.id,
        "course",
        {
          courseId: Number(courseId),
          programId: String(programId),
        }
      );
      invalidateDailyContent();
    })();
  }, [course, courseId, dailyContentItemId, programId, progress?.is_completed, user?.id]);

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
    course?.courses_content
      ?.map((section) => ({
        id: section.id,
        name: section.name ?? "Section sans titre",
        order: section.order ?? undefined,
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || [];
  const videos =
    course?.course_videos?.map((video, index) => ({
      id: Number(video.id),
      title: video.title ?? `Video ${index + 1}`,
      duration: video.duration ?? undefined,
    })) || [];

  const renderContent = () => {
    switch (selectedView) {
      case "content":
        const summaryCard = (
          <CourseSummaryCard
            isDark={isDark}
            sourceContentCount={courseSummary?.source_content_count}
            onPress={() => {
              trigger(HapticType.SELECTION);
              router.push(`/(app)/secondary/program/${programId}/courses/${courseId}/summary`);
            }}
          />
        );

        if (sections.length === 0) {
          return (
            <>
              {summaryCard}
              <EmptyState type="content" isDark={isDark} />
            </>
          );
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
              {summaryCard}
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

        return (
          <>
            {summaryCard}
            {sectionItems}
          </>
        );

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
          (quiz: SecondaryQuizItem, index: number) =>
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
        categoryName={course?.category?.name ?? undefined}
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











