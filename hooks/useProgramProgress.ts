import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

// Interfaces for data structures
interface School {
    id: string;
    name: string;
}

interface Concours {
    id: string;
    name: string;
    school?: School;
}

interface ConcoursLearningPath {
    concour?: Concours;
}

interface Exercise {
    id: string;
}

interface Course {
    id: string;
    exercices?: Exercise[];
}

interface CourseLearningPath {
    id: string;
    courseId: string;
    courses?: Course;
}

interface QuizLearningPath {
    id: string;
    quizId: string;
}

interface LearningPath {
    id: string;
    title: string;
    description?: string;
    course_count?: number;
    quiz_count?: number;
    duration?: number;
    course_learningpath: CourseLearningPath[];
    quiz_learningpath: QuizLearningPath[];
    concours_learningpaths?: ConcoursLearningPath;
}

interface CourseProgress {
    course_id: string;
    progress_percentage: number;
}

interface QuizAttempt {
    quiz_id: string;
}

interface ExerciceComplete {
    exercice_id: string;
}

interface ProgressData {
    program: LearningPath;
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
}

interface ProgramProgress {
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
    totalProgress: number;
    program: LearningPath | undefined;
    isLoading: boolean;
    error: Error | null;
}

// Helper function to ensure percentage never exceeds 100%
const capPercentage = (value: number): number => {
    return Math.min(Math.max(0, value), 100);
};

export const useProgramProgress = (lpId: string, userId: string): ProgramProgress => {
    const [courseProgress, setCourseProgress] = useState<{
        completed: number;
        percentage: number;
    }>({
        completed: 0,
        percentage: 0,
    });

    const [quizProgress, setQuizProgress] = useState<{
        completed: number;
        percentage: number;
    }>({
        completed: 0,
        percentage: 0,
    });

    const [exercisesProgress, setExercisesProgress] = useState<{
        completed: number;
        total: number;
        percentage: number;
    }>({
        completed: 0,
        total: 0,
        percentage: 0,
    });

    const { data: programData, error, isLoading } = useSWR<ProgressData>(
        lpId && userId ? `program-progress-${lpId}-${userId}` : null,
        async () => {
            // Step 1: First fetch the program data to extract relevant IDs
            const { data: rawProgramData, error: programError } = await supabase
                .from("learning_paths")
                .select(`
                    id,
                    title,
                    description,
                    course_count,
                    quiz_count,
                    duration,
                    course_learningpath(
                        id, 
                        courseId,
                        courses(
                            id, 
                            exercices(id)
                        )
                    ),
                    quiz_learningpath(
                        id, 
                        quizId
                    ),
                    concours_learningpaths(
                        concour:concours(
                            id,
                            name,
                            school:schools(
                                id,
                                name
                            )
                        )
                    )
                `)
                .eq("id", lpId)
                .single();

            if (programError) throw programError;

            const program = rawProgramData as unknown as LearningPath;

            // Extract IDs for filtered queries
            const relevantCourseIds = program.course_learningpath
                .map(c => c.courseId)
                .filter(Boolean);

            const relevantQuizIds = program.quiz_learningpath
                .map(q => q.quizId)
                .filter(Boolean);

            // Extract all exercise IDs
            const allExerciseIds: string[] = [];
            program.course_learningpath.forEach(courseLP => {
                if (courseLP.courses?.exercices) {
                    courseLP.courses.exercices.forEach(exercise => {
                        if (exercise.id) {
                            allExerciseIds.push(exercise.id);
                        }
                    });
                }
            });

            // Step 2: Fetch only the necessary progress data in parallel
            const [courseProgressData, quizData, exerciseData] = await Promise.all([
                // Fetch only relevant course progress
                supabase
                    .from("course_progress_summary")
                    .select("course_id, progress_percentage")
                    .eq("user_id", userId)
                    .in("course_id", relevantCourseIds.length ? relevantCourseIds : ['none'])
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data as CourseProgress[] || [];
                    }),

                // Fetch only relevant quiz attempts
                supabase
                    .from("quiz_attempts")
                    .select("quiz_id")
                    .eq("user_id", userId)
                    .eq("status", "completed")
                    .gte("score", 70)
                    .in("quiz_id", relevantQuizIds.length ? relevantQuizIds : ['none'])
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data as QuizAttempt[] || [];
                    }),

                // Fetch only relevant completed exercises
                supabase
                    .from("exercices_complete")
                    .select("exercice_id")
                    .eq("user_id", userId)
                    .eq("is_completed", true)
                    .in("exercice_id", allExerciseIds.length ? allExerciseIds : ['none'])
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data as ExerciceComplete[] || [];
                    })
            ]);

            // Calculate course progress
            const totalCourses = program.course_learningpath.length || 0;

            // Cap individual course progress values at 100%
            const cappedCourseProgressData = courseProgressData.map(course => ({
                ...course,
                progress_percentage: Math.min(course.progress_percentage, 100)
            }));

            const totalCourseProgress = cappedCourseProgressData.reduce((acc, course) => {
                return acc + course.progress_percentage;
            }, 0);

            // Ensure courseProgress percentage doesn't exceed 100%
            let calculatedCourseProgress = 0;
            if (totalCourses > 0) {
                calculatedCourseProgress = capPercentage(totalCourseProgress / (totalCourses * 100) * 100);
            }

            // Make sure completed courses count doesn't exceed total courses
            const courseCompleted = Math.min(
                cappedCourseProgressData.filter(course => course.progress_percentage === 100).length,
                totalCourses
            );

            // Calculate quiz progress
            const totalQuizzes = program.quiz_learningpath.length || 0;

            // Make sure completedQuizzes count doesn't exceed total quizzes
            const completedQuizzes = Math.min(quizData.length, totalQuizzes);

            // Ensure quizProgress percentage doesn't exceed 100%
            let calculatedQuizProgress = 0;
            if (totalQuizzes > 0) {
                calculatedQuizProgress = capPercentage((completedQuizzes / totalQuizzes) * 100);
            }

            // Calculate exercises progress
            const totalExercises = allExerciseIds.length;

            // Get unique completed exercise IDs
            const completedExerciseIds = new Set(
                exerciseData
                    .map(exercise => exercise.exercice_id)
                    .filter(id => allExerciseIds.includes(id))
            );

            // Make sure completedExercises count doesn't exceed total exercises
            const completedExercises = Math.min(completedExerciseIds.size, totalExercises);

            // Ensure exercisesProgress percentage doesn't exceed 100%
            let calculatedExercisesProgress = 0;
            if (totalExercises > 0) {
                calculatedExercisesProgress = capPercentage((completedExercises / totalExercises) * 100);
            }

            return {
                program,
                courseProgress: {
                    completed: courseCompleted,
                    percentage: calculatedCourseProgress,
                },
                quizProgress: {
                    completed: completedQuizzes,
                    percentage: calculatedQuizProgress,
                },
                exercisesProgress: {
                    completed: completedExercises,
                    total: totalExercises,
                    percentage: calculatedExercisesProgress
                }
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
            setExercisesProgress(programData.exercisesProgress);
        }
    }, [programData]);

    // Calculate total progress with weighted components and capped at 100%
    const totalProgress = (() => {
        const totalCourses = programData?.program?.course_learningpath?.length || 0;
        const totalQuizzes = programData?.program?.quiz_learningpath?.length || 0;
        const totalExercises = exercisesProgress?.total || 0;

        if (!totalCourses && !totalQuizzes && !totalExercises) return 0;

        // Define weights for each component
        const componentsWeight = {
            courses: totalCourses > 0 ? 0.5 : 0,
            quizzes: totalQuizzes > 0 ? 0.3 : 0,
            exercises: totalExercises > 0 ? 0.2 : 0
        };

        // Normalize weights if any component is missing
        const totalWeight = componentsWeight.courses + componentsWeight.quizzes + componentsWeight.exercises;

        if (totalWeight === 0) return 0;

        const normalizedWeights = {
            courses: componentsWeight.courses / totalWeight,
            quizzes: componentsWeight.quizzes / totalWeight,
            exercises: componentsWeight.exercises / totalWeight
        };

        // Calculate weighted progress and cap at 100%
        const weightedProgress =
            ((courseProgress?.percentage || 0) * normalizedWeights.courses) +
            ((quizProgress?.percentage || 0) * normalizedWeights.quizzes) +
            ((exercisesProgress?.percentage || 0) * normalizedWeights.exercises);

        return Math.round(capPercentage(weightedProgress));
    })();

    return {
        courseProgress,
        quizProgress,
        exercisesProgress,
        totalProgress,
        program: programData?.program,
        isLoading,
        error: error as Error | null,
    };
};