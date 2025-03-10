import useSWR, { mutate } from "swr";
import { useAuth } from "@/contexts/auth";
import { CourseProgressService } from "@/services/course.progress.service";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

interface CourseProgress {
  total_sections: number;
  completed_sections: number;
  progress_percentage: number;
  is_completed: boolean;
}

interface SectionProgress {
  total: any;
  completed: any;
  sectionid: number;
  progress: number;
  lastaccessed: string;
}

const fetcher = (userId: string, courseId: number) =>
  CourseProgressService.getCurrentProgress(userId, courseId);

const fetchSectionsProgress = (userId: string, courseId: number) =>
  CourseProgressService.getSectionsProgress(userId, courseId);

const fetchSectionProgress = (
  userId: string,
  courseId: number,
  sectionId: number
) => CourseProgressService.getSectionProgress(userId, courseId, sectionId);

export const useCourseProgress = (courseId: number) => {
  const { user } = useAuth(); // Get current user

  const { data: progress, error: progressError, mutate : mutateCourseProgress } =
    useSWR<CourseProgress | null>(
      user?.id ? ["courseProgress", user.id, courseId] : null,
      () => fetcher(user!.id, courseId)
    );

  const { data: sectionsProgress, error: sectionsProgressError, mutate : mutateSectionProgress } = useSWR<
    SectionProgress[] | null
  >(user?.id ? ["sectionsProgress", user.id, courseId] : null, () =>
    fetchSectionsProgress(user!.id, courseId)
  );

  const updateLastAccessed = async (sectionId: number) => {
    if (!user?.id) return;

    await CourseProgressService.updateLastAccessed(user.id, courseId, sectionId);
    mutate(["courseProgress", user.id, courseId]);
    mutate(["sectionsProgress", user.id, courseId]);
  }

  const markSectionComplete = async (sectionId: number) => {
    if (!user?.id) return;

    await CourseProgressService.markSectionAsComplete(
      user.id,
      courseId,
      sectionId
    );
    mutate(["courseProgress", user.id, courseId]);
    mutate(["sectionsProgress", user.id, courseId]);
  };

  useEffect(() => {
    if (!user?.id) return;

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
          mutate(["courseProgress", user.id, courseId]);
          mutate(["sectionsProgress", user.id, courseId]);
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
          mutate(["courseProgress", user.id, courseId]);
          mutate(["sectionsProgress", user.id, courseId]);
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
        mutate(["courseProgress", user?.id, courseId]);
        mutate(["sectionsProgress", user?.id, courseId]);
    },
    getSectionProgress: (sectionId: number) =>
      sectionsProgress?.find(
        (section: SectionProgress) => section.sectionid === sectionId
      ),
  };
};
