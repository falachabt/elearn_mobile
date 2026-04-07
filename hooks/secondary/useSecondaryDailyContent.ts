import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import useSWR from "swr";

import {
  getSecondaryDailyContent,
  getSecondaryDailyContentForPrograms,
  getSecondaryDailyQuizLeaderboard,
} from "@/services/secondary/dailyContent.service";

export function useSecondaryDailyContent(
  programId?: string,
  userId?: string | null,
  targetDate?: string
) {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? ["secondary-daily-content", programId, userId ?? null, targetDate ?? null] : null,
    ([, currentProgramId, currentUserId, currentTargetDate]) =>
      getSecondaryDailyContent(
        currentProgramId as string,
        currentUserId as string | null,
        currentTargetDate as string | undefined
      )
  );

  useFocusEffect(
    useCallback(() => {
      if (!programId) {
        return;
      }

      void mutate();
    }, [mutate, programId])
  );

  return {
    dailyContent: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useSecondaryDailyContentForPrograms(
  programIds: string[],
  userId?: string | null,
  targetDate?: string
) {
  const normalizedProgramIds = [...programIds].sort();
  const key =
    normalizedProgramIds.length > 0
      ? [
          "secondary-daily-content-programs",
          normalizedProgramIds.join(","),
          userId ?? null,
          targetDate ?? null,
        ]
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () =>
      getSecondaryDailyContentForPrograms(
        normalizedProgramIds,
        userId,
        targetDate
      ),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  useFocusEffect(
    useCallback(() => {
      if (normalizedProgramIds.length === 0) {
        return;
      }

      void mutate();
    }, [mutate, normalizedProgramIds.length])
  );

  return {
    dailyContents: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useSecondaryDailyQuizLeaderboard(
  programId?: string,
  options?: {
    dailyContentItemId?: string | null;
    quizId?: string | null;
    targetDate?: string;
    limit?: number;
  }
) {
  const { data, error, isLoading, mutate } = useSWR(
    programId
      ? [
          "secondary-daily-quiz-leaderboard",
          programId,
          options?.dailyContentItemId ?? null,
          options?.quizId ?? null,
          options?.targetDate ?? null,
          options?.limit ?? 10,
        ]
      : null,
    ([, currentProgramId, dailyContentItemId, quizId, targetDate, limit]) =>
      getSecondaryDailyQuizLeaderboard(currentProgramId as string, {
        dailyContentItemId: dailyContentItemId as string | null,
        quizId: quizId as string | null,
        targetDate: targetDate as string | undefined,
        limit: limit as number,
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  useFocusEffect(
    useCallback(() => {
      if (!programId) {
        return;
      }

      void mutate();
    }, [mutate, programId])
  );

  return {
    leaderboard: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
