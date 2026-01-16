import useSWR from 'swr';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

/**
 * Hook to fetch pinned status for a single quiz or multiple quizzes
 * @param quizIds - Single quiz ID or array of quiz IDs
 * @returns Pinned quizzes data with loading and error states
 */
export const useQuizPins = (quizIds: string | string[] | undefined) => {
  const { user } = useAuth();
  
  const normalizedIds = Array.isArray(quizIds) ? quizIds : quizIds ? [quizIds] : [];
  const cacheKey = normalizedIds.length > 0 ? `quiz-pins-${normalizedIds.sort().join('-')}` : null;

  const { data, error, mutate } = useSWR(
    user?.id && cacheKey ? cacheKey : null,
    async () => {
      if (normalizedIds.length === 0) return [];

      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("quiz_pin")
        .select("*")
        .in("quiz_id", normalizedIds)
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    }
  );

  // Create a map for easy lookup
  const pinnedMap = new Map(data?.map((pin) => [pin.quiz_id, pin]) || []);

  return {
    pinnedQuizzes: data || [],
    pinnedMap,
    isPinned: (quizId: string) => pinnedMap.has(quizId),
    isLoading: !error && !data,
    error,
    mutate,
  };
};

/**
 * Hook to fetch quiz attempts for a single quiz or multiple quizzes
 * @param quizIds - Single quiz ID or array of quiz IDs
 * @param status - Filter by attempt status (optional)
 * @returns Quiz attempts data with loading and error states
 */
export const useQuizAttempts = (
  quizIds: string | string[] | undefined,
  status?: 'in_progress' | 'completed' | 'abandoned'
) => {
  const { user } = useAuth();
  
  const normalizedIds = Array.isArray(quizIds) ? quizIds : quizIds ? [quizIds] : [];
  const cacheKey = normalizedIds.length > 0 
    ? `quiz-attempts-${normalizedIds.sort().join('-')}${status ? `-${status}` : ''}`
    : null;

  const { data, error, mutate } = useSWR(
    user?.id && cacheKey ? cacheKey : null,
    async () => {
      if (normalizedIds.length === 0) return [];
      if (!user?.id) return [];

      let query = supabase
        .from("quiz_attempts")
        .select("*")
        .in("quiz_id", normalizedIds)
        .eq("user_id", user.id);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  );

  // Create a map for best scores per quiz
  const bestScoreMap = new Map<string, number>();
  data?.forEach((attempt) => {
    if (!attempt.quiz_id) return;
    const currentMax = bestScoreMap.get(attempt.quiz_id) || 0;
    bestScoreMap.set(attempt.quiz_id, Math.max(currentMax, attempt.score || 0));
  });

  // Create a map for attempt counts per quiz
  const attemptCountMap = new Map<string, number>();
  data?.forEach((attempt) => {
    if (!attempt.quiz_id) return;
    const currentCount = attemptCountMap.get(attempt.quiz_id) || 0;
    attemptCountMap.set(attempt.quiz_id, currentCount + 1);
  });

  return {
    attempts: data || [],
    bestScoreMap,
    attemptCountMap,
    getBestScore: (quizId: string) => bestScoreMap.get(quizId) || 0,
    getAttemptCount: (quizId: string) => attemptCountMap.get(quizId) || 0,
    isLoading: !error && !data,
    error,
    mutate,
  };
};

/**
 * Hook to fetch quiz details with support for secondary program context
 * @param quizId - Quiz ID
 * @param programId - Program ID (for secondary context)
 * @param isSecondaryContext - Whether this is a secondary program quiz
 * @returns Quiz details with loading and error states
 */
export const useQuizDetails = (
  quizId: string | undefined,
  programId: string | undefined,
  isSecondaryContext: boolean = false
) => {
  const { data, error, mutate } = useSWR(
    quizId ? `quiz-details-${quizId}` : null,
    async () => {
      if (!quizId) return null;

      if (isSecondaryContext && programId) {
        // For secondary programs, query through secondary_program_quizzes
        const { data, error } = await supabase
          .from("secondary_program_quizzes")
          .select(`
            quiz_id,
            quiz(
              *,
              quiz_questions(count),
              category(name),
              quiz_tags(tags(id,name)),
              quiz_courses(courses(id,name))
            )
          `)
          .eq("program_id", programId)
          .eq("quiz_id", quizId)
          .single();

        if (error) throw error;
        return data?.quiz || null;
      } else {
        // For primary learning paths, query directly
        const { data, error } = await supabase
          .from("quiz")
          .select(`
            *,
            quiz_questions(count),
            category(name),
            quiz_tags(tags(id,name)),
            quiz_courses(courses(id,name))
          `)
          .eq("id", quizId)
          .single();

        if (error) throw error;
        return data;
      }
    }
  );

  return {
    quiz: data,
    isLoading: !error && !data,
    error,
    mutate,
  };
};
