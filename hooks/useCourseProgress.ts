import useSWR, { mutate } from "swr";
import { useEffect } from "react";

import { logger } from '@/utils/logger';
import { useAuth } from "@/contexts/auth";
import { CourseProgressService } from "@/services/course.progress.service";
import { supabase } from "@/lib/supabase";
import {courseProgressKeys, programProgressKeys} from "@/constants/swr-path";

interface CourseProgress {
  total_sections: number;
  completed_sections: number;
  progress_percentage: number;
  is_completed: boolean;
}

interface SectionProgress {
  total: number;
  completed: number;
  sectionid: number;
  progress: number;
  lastaccessed: string;
}

const fetcher = async (userId: string, courseId: number): Promise<CourseProgress | null> => {
  const progress = await CourseProgressService.getCurrentProgress(userId, courseId);

  if (!progress) {
    return null;
  }

  return {
    total_sections: progress.total_sections ?? 0,
    completed_sections: progress.completed_sections ?? 0,
    progress_percentage: progress.progress_percentage ?? 0,
    is_completed: progress.is_completed ?? false,
  };
};

const fetchSectionsProgress = async (userId: string, courseId: number): Promise<SectionProgress[] | null> => {
  const sections = await CourseProgressService.getSectionsProgress(userId, courseId);

  return (sections ?? [])
    .filter(
      (section): section is typeof section & { sectionid: number } =>
        typeof section.sectionid === "number"
    )
    .map((section) => ({
      total: 1,
      completed: (section.progress ?? 0) >= 1 ? 1 : 0,
      sectionid: section.sectionid,
      progress: section.progress ?? 0,
      lastaccessed: section.lastaccessed ?? "",
    }));
};

const fetchSectionProgress = (
  userId: string,
  courseId: number,
  sectionId: number
) => CourseProgressService.getSectionProgress(userId, courseId, sectionId);

export const useCourseProgress = (courseId: number | undefined) => {
  const { user } = useAuth(); // Get current user

    const { data: progress, error: progressError, mutate: mutateCourseProgress } =
        useSWR<CourseProgress | null>(
            user?.id && typeof courseId === "number" ? courseProgressKeys.summary(user.id, courseId) : null,
            () => fetcher(user!.id, courseId as number),
            {
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                refreshInterval: 0,
            }
        );

    const { data: sectionsProgress, error: sectionsProgressError, mutate: mutateSectionProgress } = useSWR<SectionProgress[] | null>(
        user?.id && typeof courseId === "number" ? courseProgressKeys.sections(user.id, courseId) : null,
            () => fetchSectionsProgress(user!.id, courseId as number),
            {
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                refreshInterval: 0,
            }
    );


  const updateLastAccessed = async (sectionId: number) => {
    if (!user?.id) return;
    if (typeof courseId !== "number") return;

    await CourseProgressService.updateLastAccessed(user.id, courseId, sectionId);
    mutate(["courseProgress", user.id, courseId]);
    mutate(["sectionsProgress", user.id, courseId]);
  }

  const markSectionComplete = async (sectionId: number) => {
    if (!user?.id) return;
    if (typeof courseId !== "number") return;

    try {
      await CourseProgressService.markSectionAsComplete(
        user.id,
        courseId,
        sectionId
      );
      
      // Forcer le refetch de tous les caches avec revalidate = true
      await mutateSectionProgress();
      await mutateCourseProgress();
      
      // Muter tous les caches liés à ce cours avec refetch
      await mutate(courseProgressKeys.summary(user.id, courseId), undefined, true);
      await mutate(courseProgressKeys.sections(user.id, courseId), undefined, true);
      
      // Muter aussi les caches des listes de cours avec refetch
      await mutate(`secondary-course-${courseId}`, undefined, { revalidate: true });
      await mutate(`secondary-course-sections-${courseId}`, undefined, { revalidate: true });
      await mutate(`course-${courseId}`, undefined, { revalidate: true });
      await mutate(`course-section-${courseId}`, undefined, { revalidate: true });
      
      // Muter les progressions au niveau du programme
      programProgressKeys.mutateAll();
    } catch (error) {
      logger.error('Error marking section complete:', error);
    }
  };

  useEffect(() => {
    if (!user?.id || typeof courseId !== "number") return;

    const channel = supabase
      .channel("courses_progress" + courseId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_progress_summary",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
            courseProgressKeys.mutateAllForCourse(user?.id || "", courseId);
        }
      )
      .subscribe();
    const channel1 = supabase
      .channel("course_progress")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "usercourseprogress",
          filter: `userid=eq.${user.id}`,
        },
        () => {
            courseProgressKeys.mutateAllForCourse(user?.id || "", courseId);
        }
      )
      .subscribe();

    return () => {
        if(channel) supabase.removeChannel(channel);
        if(channel1)supabase.removeChannel(channel1);
    };
  }, [user?.id, courseId]);

  return {
    progress,
    sectionsProgress,
    loading: !progress && !progressError,
    error: progressError || sectionsProgressError,
    updateLastAccessed,
    markSectionComplete,
    refreshProgress: () => {
        if (user?.id && typeof courseId === "number") {
          courseProgressKeys.mutateAllForCourse(user.id, courseId);
        }
    },
    getSectionProgress: (sectionId: number) =>
      sectionsProgress?.find(
        (section: SectionProgress) => section.sectionid === sectionId
      ),
  };
};
