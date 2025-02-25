import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

interface ProgramProgress {
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    totalProgress: number;
    program: any; // You can type this according to your program structure
    isLoading: boolean;
    error: Error | null;
}

export const useProgramProgress = (lpId: string, userId: string): ProgramProgress => {
    const [courseProgress, setCourseProgress] = useState({
        completed: 0,
        percentage: 0,
    });
    const [quizProgress, setQuizProgress] = useState({
        completed: 0,
        percentage: 0,
    });

    const { data: programData, error, isLoading } = useSWR(
        lpId && userId ? `program-${lpId}-${userId}` : null,
        async () => {
            // Fetch program data
            const { data: program, error: programError } = await supabase
                .from("learning_paths")
                .select(`
          *,
          course_learningpath(*),
          quiz_learningpath(*),
          concours_learningpaths(
            concour:concours(
              *,
              school:schools(*)
            )
          )
        `)
                .eq("id", lpId)
                .single();

            if (programError) throw programError;

            // Fetch course progress
            const { data: courseProgressData, error: courseProgressError } = await supabase
                .from("course_progress_summary")
                .select("*")
                .eq("user_id", userId)
                .in(
                    "course_id",
                    program?.course_learningpath?.map((c: any) => c.courseId) || []
                );

            if (courseProgressError) throw courseProgressError;

            // Fetch quiz progress
            const { data: quizData, error: quizError } = await supabase
                .from("quiz_attempts")
                .select("quiz_id, score, status")
                .eq("user_id", userId)
                .in(
                    "quiz_id",
                    program?.quiz_learningpath?.map((q: any) => q.quizId) || []
                )
                .eq("status", "completed")
                .gte("score", 70);

            if (quizError) throw quizError;

            // Calculate course progress
            const totalCourses = program?.course_learningpath?.length || 0;
            const totalCourseProgress = courseProgressData?.reduce((acc, course) => {
                return acc + Math.min(course.progress_percentage, 100);
            }, 0) || 0;

            const courseProgress = totalCourses
                ? (totalCourseProgress / (totalCourses * 100)) * 100
                : 0;

            const courseCompleted = courseProgressData?.filter(
                (course) => course.progress_percentage === 100
            ).length || 0;

            // Calculate quiz progress
            const totalQuizzes = program?.quiz_learningpath?.length || 0;
            const quizProgress = totalQuizzes && quizData
                ? (quizData.length / totalQuizzes) * 100
                : 0;

            return {
                program,
                courseProgress: {
                    completed: courseCompleted,
                    percentage: courseProgress,
                },
                quizProgress: {
                    completed: quizData?.length || 0,
                    percentage: quizProgress,
                },
            };
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 10000, // Refresh every 10 seconds
        }
    );

    useEffect(() => {
        if (programData) {
            setCourseProgress(programData.courseProgress);
            setQuizProgress(programData.quizProgress);
        }
    }, [programData]);

    // Calculate total progress
    const totalProgress = (() => {
        const totalCourses = programData?.program?.course_learningpath?.length || 0;
        const totalQuizzes = programData?.program?.quiz_learningpath?.length || 0;

        if (!totalCourses && !totalQuizzes) return 0;

        return Math.round(
            (courseProgress.percentage * totalCourses +
                quizProgress.percentage * totalQuizzes) /
            (totalCourses + totalQuizzes)
        );
    })();

    return {
        courseProgress,
        quizProgress,
        totalProgress,
        program: programData?.program,
        isLoading,
        error: error as Error | null,
    };
};