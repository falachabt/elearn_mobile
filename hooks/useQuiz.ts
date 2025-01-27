// hooks/useQuiz.ts
import useSWR from 'swr';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Quiz, QuizAttempts, QuizQuestions, UserAnswers } from '@/types/type';
import { QuizQuestion } from '@/types/quiz.type';

export interface Attempt extends QuizAttempts {
    user_answers: UserAnswers[];
}

interface QuizProgress {
    attempts: QuizAttempts[];
    totalAttempts: number;
    bestScore: number;
    averageScore: number;
    lastAttempt: QuizAttempts | null;
}

export interface QuizResults extends QuizAttempts {
    statistics: {
        totalQuestions: number;
        correctAnswers: number;
        accuracy: number;
        timeSpent: number;
        averageTimePerQuestion: number;
        xpGained: number;
    };
}

interface LeaderboardEntry {
    id: string;
    score: number;
    start_time: string;
    end_time: string;
    user: {
        id: string;
        firstname: string;
        lastname: string;
        image: string;
    };
    timeSpent: number;
}

// Hook to fetch quiz details with realtime updates
export const useQuiz = (quizId: string | undefined) => {
    const { data, error, mutate } = useSWR<Quiz>(
        quizId ? `quiz-${quizId}` : null,
        async () => {
            const { data, error } = await supabase
                .from('quiz')
                .select(`
                    *,
                    quiz_questions(count),
                    quiz_category:category(*),
                    quiz_tags:quiz_tags(tags(*)),
                    quiz_courses:quiz_courses(courses(id,name))
                `)
                .eq('id', quizId)
                .single();

            if (error) throw error;
            return data;
        }
    );

    useEffect(() => {
        if (!quizId) return;

        const subscription = supabase
            .channel(`quiz-${quizId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz',
                    filter: `id=eq.${quizId}`,
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [quizId, mutate]);

    return { quiz: data, error, isLoading: !error && !data };
};

// Hook to fetch quiz questions with realtime updates
export const useQuizQuestions = (quizId: string | undefined) => {
    const { data, error, mutate } = useSWR<QuizQuestion[]>(
        quizId ? `quiz-questions-${quizId}` : null,
        async () => {
            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('quizId', quizId)
                .order('order');

            if (error) throw error;
            return data;
        }
    );

    useEffect(() => {
        if (!quizId) return;

        const subscription = supabase
            .channel(`quiz-questions-${quizId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_questions',
                    filter: `quizId=eq.${quizId}`,
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [quizId, mutate]);

    return { questions: data, error, isLoading: !error && !data };
};

// Hook to manage quiz attempts with realtime updates
export const useQuizAttempt = (attemptId: string | undefined) => {
    const { data, error, mutate } = useSWR<Attempt>(
        attemptId ? `quiz-attempt-${attemptId}` : null,
        async () => {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('*, user_answers(*)')
                .eq('id', attemptId)
                .single();

               

            if (error) throw error;
            return data;
        }
    );

    useEffect(() => {
        if (!attemptId) return;

        const subscription = supabase
            .channel(`quiz-attempt-${attemptId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_attempts',
                    filter: `id=eq.${attemptId}`,
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [attemptId, mutate]);

    

    return { attempt: data, error, isLoading: !error && !data };
};

// Hook to manage user's quiz progress
export const useQuizProgress = (quizId: string | undefined, userId: string | undefined) => {
    const { data, error, mutate } = useSWR<QuizProgress>(
        quizId && userId ? `quiz-progress-${quizId}-${userId}` : null,
        async () => {
            // Fetch all attempts for this quiz by the user
            const { data: attempts, error: attemptsError } = await supabase
                .from('quiz_attempts')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (attemptsError) throw attemptsError;

            // Calculate progress statistics
            const totalAttempts = attempts.length;
            const completedAttempts = attempts.filter(a => a.status === 'completed');
            const scores = completedAttempts.map(a => a.score || 0);
            
            return {
                attempts,
                totalAttempts,
                bestScore: Math.max(0, ...scores),
                averageScore: scores.length > 0 
                    ? scores.reduce((a, b) => a + b, 0) / scores.length 
                    : 0,
                lastAttempt: attempts[0] || null,
            };
        }
    );

    useEffect(() => {
        if (!quizId || !userId) return;

        const subscription = supabase
            .channel(`quiz-progress-${quizId}-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_attempts',
                    filter: `quiz_id=eq.${quizId} AND user_id=eq.${userId}`,
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [quizId, userId, mutate]);

    return { progress: data, error, isLoading: !error && !data };
};

// Hook to manage quiz results
export const useQuizResults = (attemptId: string | undefined) => {
    const { data, error, mutate } = useSWR<QuizResults>(
        attemptId ? `quiz-results-${attemptId}` : null,
        async () => {
            // Fetch attempt details with answers
            const { data: attempt, error: attemptError } = await supabase
                .from('quiz_attempts')
                .select(`
                    *,
                    user_answers(*),
                    quiz:quiz_id(
                        name,
                        description,
                        quiz_questions(count)
                    )
                `)
                .eq('id', attemptId)
                .single();


            if (attemptError) throw attemptError;

            // Calculate additional statistics
            const answers = attempt.user_answers;
            const correctAnswers: number = answers.filter((a: UserAnswers) => a.is_correct).length;
            const timeSpent = attempt.end_time 
                ? Math.floor((new Date(attempt.end_time).getTime() - new Date(attempt.start_time).getTime()) / 1000)
                : 0;

            // Calculate XP and rewards
            const baseXP = 100;
            const scoreMultiplier = attempt.score ? attempt.score / 100 : 0;
            const timeBonus = Math.max(0, 1 - (timeSpent / (answers.length * 60)));
            const xpGained = Math.round(baseXP * scoreMultiplier * (1 + timeBonus));

            return {
                ...attempt,
                attemptId,
                attempt,
                totalQuestions: answers.length,
                correctAnswers,
                accuracy: (correctAnswers / answers.length) * 100,
                timeSpent,
                averageTimePerQuestion: timeSpent / answers.length,
                xpGained,
                statistics: {
                },
            };
        }
    );

    return { results: data, error, isLoading: !error && !data };
};

// Hook to manage quiz leaderboard
export const useQuizLeaderboard = (quizId: string | undefined) => {
    const fetcher = async () => {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                score,
                start_time,
                end_time,
                user:user_id(
                    id,
                    firstname,
                    lastname,
                    image
                )
            `)
            .eq('quiz_id', quizId)
            .eq('status', 'completed')
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;

        return data.map(entry => ({
            ...entry,
            user: entry.user[0], // Ensure user is an object, not an array
            timeSpent: entry.end_time 
                ? Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000)
                : 0,
        }));
    };

    const { data, error, mutate } = useSWR<LeaderboardEntry[]>(
        quizId ? `quiz-leaderboard-${quizId}` : null,
        fetcher,
        {}
    );

    useEffect(() => {
        if (!quizId) return;

        const subscription = supabase
            .channel(`quiz-leaderboard-${quizId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_attempts',
                    filter: `quiz_id=eq.${quizId} AND status=eq.completed`,
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [quizId, mutate]);

    return { leaderboard: data, error, isLoading: !error && !data };
};