import useSWR from 'swr';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { Quiz, QuizAttempts, UserAnswers } from '@/types/type';
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
  } | null;
  timeSpent: number;
}

const subscribeToTable = (
  channelName: string,
  table: string,
  filter: string,
  onChange: () => void
) => {
  const channel = supabase.channel(channelName) as unknown as {
    on: (
      event: 'postgres_changes',
      config: { event: '*'; schema: 'public'; table: string; filter: string },
      callback: () => void
    ) => { subscribe: () => { unsubscribe: () => void } };
  };

  return channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      onChange
    )
    .subscribe();
};

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
        .eq('id', quizId as string)
        .single();

      if (error) throw error;
      return data as unknown as Quiz;
    }
  );

  useEffect(() => {
    if (!quizId) return;

    const subscription = subscribeToTable(
      `quiz-${quizId}`,
      'quiz',
      `id=eq.${quizId}`,
      () => {
        void mutate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [quizId, mutate]);

  return { quiz: data, error, isLoading: !error && !data };
};

export const useQuizQuestions = (quizId: string | undefined) => {
  const { data, error, mutate } = useSWR<QuizQuestion[]>(
    quizId ? `quiz-questions-${quizId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quizId', quizId as string)
        .order('order');

      if (error) throw error;
      return data as unknown as QuizQuestion[];
    }
  );

  useEffect(() => {
    if (!quizId) return;

    const subscription = subscribeToTable(
      `quiz-questions-${quizId}`,
      'quiz_questions',
      `quizId=eq.${quizId}`,
      () => {
        void mutate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [quizId, mutate]);

  return { questions: data, error, isLoading: !error && !data };
};

export const useQuizAttempt = (attemptId: string | undefined) => {
  const numericAttemptId = attemptId ? Number(attemptId) : null;

  const { data, error, mutate } = useSWR<Attempt>(
    numericAttemptId ? `quiz-attempt-${numericAttemptId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*, user_answers(*)')
        .eq('id', numericAttemptId as number)
        .single();

      if (error) throw error;
      return data as unknown as Attempt;
    }
  );

  useEffect(() => {
    if (!numericAttemptId) return;

    const subscription = subscribeToTable(
      `quiz-attempt-${numericAttemptId}`,
      'quiz_attempts',
      `id=eq.${numericAttemptId}`,
      () => {
        void mutate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [numericAttemptId, mutate]);

  return { attempt: data, error, isLoading: !error && !data };
};

export const useQuizProgress = (quizId: string | undefined, userId: string | undefined) => {
  const { data, error, mutate } = useSWR<QuizProgress>(
    quizId && userId ? `quiz-progress-${quizId}-${userId}` : null,
    async () => {
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId as string)
        .eq('user_id', userId as string)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      const allAttempts = (attempts ?? []) as unknown as QuizAttempts[];
      const completedAttempts = allAttempts.filter((attempt) => attempt.status === 'completed');
      const scores = completedAttempts.map((attempt) => attempt.score || 0);

      return {
        attempts: allAttempts,
        totalAttempts: allAttempts.length,
        bestScore: Math.max(0, ...scores),
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        lastAttempt: allAttempts[0] || null,
      };
    }
  );

  useEffect(() => {
    if (!quizId || !userId) return;

    const subscription = subscribeToTable(
      `quiz-progress-${quizId}-${userId}`,
      'quiz_attempts',
      `quiz_id=eq.${quizId}`,
      () => {
        void mutate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [quizId, userId, mutate]);

  return { progress: data, error, isLoading: !error && !data };
};

export const useQuizResults = (attemptId: string | undefined) => {
  const numericAttemptId = attemptId ? Number(attemptId) : null;

  const { data, error } = useSWR<QuizResults>(
    numericAttemptId ? `quiz-results-${numericAttemptId}` : null,
    async () => {
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
        .eq('id', numericAttemptId as number)
        .single();

      if (attemptError) throw attemptError;

      const typedAttempt = attempt as unknown as Attempt;
      const answers = typedAttempt.user_answers ?? [];
      const correctAnswers = answers.filter((answer) => Boolean(answer.is_correct)).length;
      const timeSpent =
        typedAttempt.end_time && typedAttempt.start_time
          ? Math.floor(
              (new Date(typedAttempt.end_time).getTime() -
                new Date(typedAttempt.start_time).getTime()) / 1000
            )
          : 0;

      const baseXP = 100;
      const scoreMultiplier = typedAttempt.score ? typedAttempt.score / 100 : 0;
      const timeBonus = Math.max(0, 1 - (timeSpent / Math.max(answers.length, 1) / 60));
      const xpGained = Math.round(baseXP * scoreMultiplier * (1 + timeBonus));
      const accuracy = answers.length > 0 ? (correctAnswers / answers.length) * 100 : 0;

      return {
        ...(typedAttempt as QuizAttempts),
        statistics: {
          totalQuestions: answers.length,
          correctAnswers,
          accuracy,
          timeSpent,
          averageTimePerQuestion: answers.length > 0 ? timeSpent / answers.length : 0,
          xpGained,
        },
      };
    }
  );

  return { results: data, error, isLoading: !error && !data };
};

export const useQuizLeaderboard = (quizId: string | undefined) => {
  const fetcher = async (): Promise<LeaderboardEntry[]> => {
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
      .eq('quiz_id', quizId as string)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data ?? []).map((entry) => {
      const leaderboardEntry = entry as unknown as {
        id: string;
        score: number | null;
        start_time: string | null;
        end_time: string | null;
        user: {
          id: string;
          firstname: string | null;
          lastname: string | null;
          image: string;
        } | null;
      };

      return {
        id: leaderboardEntry.id,
        score: leaderboardEntry.score ?? 0,
        start_time: leaderboardEntry.start_time ?? '',
        end_time: leaderboardEntry.end_time ?? '',
        user: leaderboardEntry.user
          ? {
              id: leaderboardEntry.user.id,
              firstname: leaderboardEntry.user.firstname ?? '',
              lastname: leaderboardEntry.user.lastname ?? '',
              image: leaderboardEntry.user.image,
            }
          : null,
        timeSpent:
          leaderboardEntry.end_time && leaderboardEntry.start_time
            ? Math.floor(
                (new Date(leaderboardEntry.end_time).getTime() -
                  new Date(leaderboardEntry.start_time).getTime()) / 1000
              )
            : 0,
      };
    });
  };

  const { data, error, mutate } = useSWR<LeaderboardEntry[]>(
    quizId ? `quiz-leaderboard-${quizId}` : null,
    fetcher
  );

  useEffect(() => {
    if (!quizId) return;

    const subscription = subscribeToTable(
      `quiz-leaderboard-${quizId}`,
      'quiz_attempts',
      `quiz_id=eq.${quizId}`,
      () => {
        void mutate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [quizId, mutate]);

  return { leaderboard: data, error, isLoading: !error && !data };
};
