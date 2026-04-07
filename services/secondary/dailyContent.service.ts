import { supabase } from "@/lib/supabase";
import {
  SecondaryDailyContent,
  SecondaryDailyQuizLeaderboardEntry,
  SecondaryDailyQuizLeaderboard,
} from "@/types/secondary.type";

type RpcClient = {
  rpc: (
    fn:
      | "get_secondary_daily_content"
      | "get_secondary_daily_content_for_programs"
      | "mark_secondary_daily_item_completed",
    params: Record<string, unknown>
  ) => Promise<{
    data: unknown;
    error: Error | null;
  }>;
};

const ensureDailyContent = (value: unknown): SecondaryDailyContent | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as SecondaryDailyContent;
  if (!candidate.id || !candidate.programId) {
    return null;
  }

  return {
    ...candidate,
    courses: Array.isArray(candidate.courses) ? candidate.courses : [],
    quizzes: Array.isArray(candidate.quizzes) ? candidate.quizzes : [],
    exercises: Array.isArray(candidate.exercises) ? candidate.exercises : [],
    pendingCount: Number(candidate.pendingCount ?? 0),
  };
};

type CourseProgressRow = {
  course_id: number;
  progress_percentage: number | null;
  is_completed: boolean | null;
};

type QuizAttemptRow = {
  id: number;
  quiz_id: string | null;
  user_id: string | null;
  score: number | null;
  timeSpent: number | null;
  start_time: string | null;
  end_time: string | null;
  daily_content_item_id?: string | null;
  user?: {
    id: string;
    firstname: string | null;
    lastname: string | null;
    image: SecondaryDailyQuizLeaderboardEntry["image"];
  } | null;
  status?: string | null;
};

type ExerciseCompletionRow = {
  exercice_id: string;
  is_completed: boolean | null;
};

export function getSecondaryDailyContentStats(
  dailyContent: Pick<
    SecondaryDailyContent,
    "courses" | "quizzes" | "exercises"
  >,
) {
  const total =
    dailyContent.courses.length +
    dailyContent.quizzes.length +
    dailyContent.exercises.length;
  const completed =
    dailyContent.courses.filter((item) => item.isCompleted).length +
    dailyContent.quizzes.filter((item) => item.isCompleted).length +
    dailyContent.exercises.filter((item) => item.isCompleted).length;

  return {
    total,
    completed,
    pending: Math.max(0, total - completed),
  };
}

const clampPercentage = (value: number | null | undefined): number => {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.min(100, normalized));
};

const getAttemptTimeSpent = (attempt: QuizAttemptRow): number => {
  if (typeof attempt.timeSpent === "number" && Number.isFinite(attempt.timeSpent)) {
    return attempt.timeSpent;
  }

  if (attempt.start_time && attempt.end_time) {
    return Math.max(
      0,
      Math.round(
        (new Date(attempt.end_time).getTime() -
          new Date(attempt.start_time).getTime()) /
          1000,
      ),
    );
  }

  return 0;
};

const shouldReplaceLeaderboardEntry = (
  currentEntry: SecondaryDailyQuizLeaderboardEntry | undefined,
  nextEntry: SecondaryDailyQuizLeaderboardEntry,
) => {
  if (!currentEntry) return true;
  if (nextEntry.score !== currentEntry.score) {
    return nextEntry.score > currentEntry.score;
  }
  if (nextEntry.timeSpent !== currentEntry.timeSpent) {
    return nextEntry.timeSpent < currentEntry.timeSpent;
  }
  return nextEntry.attemptId < currentEntry.attemptId;
};

const hydrateDailyContents = async (
  dailyContents: SecondaryDailyContent[],
  userId?: string | null,
): Promise<SecondaryDailyContent[]> => {
  if (!dailyContents.length) return [];

  const normalizedDailyContents = dailyContents.map((item) => ({
    ...item,
    courses: [...item.courses],
    quizzes: [...item.quizzes],
    exercises: [...item.exercises],
  }));

  if (!userId) {
    return normalizedDailyContents.map((dailyContent) => ({
      ...dailyContent,
      pendingCount: getSecondaryDailyContentStats(dailyContent).pending,
    }));
  }

  const courseIds = Array.from(
    new Set(
      normalizedDailyContents.flatMap((dailyContent) =>
        dailyContent.courses.map((item) => item.courseId),
      ),
    ),
  );
  const quizIds = Array.from(
    new Set(
      normalizedDailyContents.flatMap((dailyContent) =>
        dailyContent.quizzes.map((item) => item.quizId),
      ),
    ),
  );
  const exerciseIds = Array.from(
    new Set(
      normalizedDailyContents.flatMap((dailyContent) =>
        dailyContent.exercises.map((item) => item.exerciseId),
      ),
    ),
  );

  const [courseProgressRows, quizAttemptsRows, exerciseCompletionRows] =
    await Promise.all([
      courseIds.length
        ? supabase
            .from("course_progress_summary")
            .select("course_id, progress_percentage, is_completed")
            .eq("user_id", userId)
            .in("course_id", courseIds)
        : Promise.resolve({ data: [], error: null }),
      quizIds.length
        ? supabase
            .from("quiz_attempts")
            .select("quiz_id, status, score")
            .eq("user_id", userId)
            .in("quiz_id", quizIds)
        : Promise.resolve({ data: [], error: null }),
      exerciseIds.length
        ? supabase
            .from("exercices_complete")
            .select("exercice_id, is_completed")
            .eq("user_id", userId)
            .in("exercice_id", exerciseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (courseProgressRows.error) throw courseProgressRows.error;
  if (quizAttemptsRows.error) throw quizAttemptsRows.error;
  if (exerciseCompletionRows.error) throw exerciseCompletionRows.error;

  const courseProgressMap = new Map<
    number,
    { progressPercentage: number; isCompleted: boolean }
  >(
    ((courseProgressRows.data ?? []) as CourseProgressRow[]).map((row) => [
      row.course_id,
      {
        progressPercentage: clampPercentage(row.progress_percentage),
        isCompleted:
          Boolean(row.is_completed) || clampPercentage(row.progress_percentage) >= 100,
      },
    ]),
  );

  const quizProgressMap = new Map<
    string,
    { bestScore: number; isCompleted: boolean }
  >();
  for (const row of (quizAttemptsRows.data ?? []) as QuizAttemptRow[]) {
    if (!row.quiz_id) continue;
    const current = quizProgressMap.get(String(row.quiz_id));
    const nextScore = clampPercentage(row.score);
    quizProgressMap.set(String(row.quiz_id), {
      bestScore: current ? Math.max(current.bestScore, nextScore) : nextScore,
      isCompleted: Boolean(current?.isCompleted) || row.status === "completed",
    });
  }

  const exerciseCompletionMap = new Map<string, boolean>(
    ((exerciseCompletionRows.data ?? []) as ExerciseCompletionRow[]).map((row) => [
      String(row.exercice_id),
      Boolean(row.is_completed),
    ]),
  );

  return normalizedDailyContents.map((dailyContent) => {
    const hydratedCourses = dailyContent.courses.map((item) => {
      const progress = courseProgressMap.get(item.courseId);
      const progressPercentage = progress
        ? progress.progressPercentage
        : clampPercentage(item.progressPercentage);
      const isCompleted =
        progress?.isCompleted ?? (item.isCompleted || progressPercentage >= 100);

      return {
        ...item,
        progressPercentage,
        isCompleted,
      };
    });

    const hydratedQuizzes = dailyContent.quizzes.map((item) => {
      const progress = quizProgressMap.get(String(item.quizId));
      return {
        ...item,
        bestScore: progress ? progress.bestScore : clampPercentage(item.bestScore),
        isCompleted: progress?.isCompleted ?? item.isCompleted,
      };
    });

    const hydratedExercises = dailyContent.exercises.map((item) => ({
      ...item,
      isCompleted:
        exerciseCompletionMap.get(String(item.exerciseId)) ?? item.isCompleted,
    }));

    return {
      ...dailyContent,
      courses: hydratedCourses,
      quizzes: hydratedQuizzes,
      exercises: hydratedExercises,
      pendingCount: getSecondaryDailyContentStats({
        courses: hydratedCourses,
        quizzes: hydratedQuizzes,
        exercises: hydratedExercises,
      }).pending,
    };
  });
};

export async function getSecondaryDailyContent(
  programId: string,
  userId?: string | null,
  targetDate?: string
): Promise<SecondaryDailyContent | null> {
  const params: Record<string, unknown> = {
    p_program_id: programId,
    p_auto_create: true,
  };

  if (userId) params.p_user_id = userId;
  if (targetDate) params.p_target_date = targetDate;

  const rpcClient = supabase as unknown as RpcClient;

  const { data, error } = await rpcClient.rpc(
    "get_secondary_daily_content",
    params
  );

  if (error) throw error;
  const dailyContent = ensureDailyContent(data);
  if (!dailyContent) return null;

  const [hydratedDailyContent] = await hydrateDailyContents([dailyContent], userId);
  return hydratedDailyContent ?? dailyContent;
}

export async function getSecondaryDailyContentForPrograms(
  programIds: string[],
  userId?: string | null,
  targetDate?: string
): Promise<SecondaryDailyContent[]> {
  if (!programIds.length) return [];

  const params: Record<string, unknown> = {
    p_program_ids: programIds,
  };

  if (userId) params.p_user_id = userId;
  if (targetDate) params.p_target_date = targetDate;

  const rpcClient = supabase as unknown as RpcClient;

  const { data, error } = await rpcClient.rpc(
    "get_secondary_daily_content_for_programs",
    params
  );

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  const normalizedContents = data
    .map((item) => ensureDailyContent(item))
    .filter((item): item is SecondaryDailyContent => item !== null);

  return hydrateDailyContents(normalizedContents, userId);
}

export async function getSecondaryDailyQuizLeaderboard(
  programId: string,
  options?: {
    dailyContentItemId?: string | null;
    quizId?: string | null;
    targetDate?: string;
    limit?: number;
  }
): Promise<SecondaryDailyQuizLeaderboard | null> {
  let query = supabase
    .from("quiz_attempts")
    .select(
      `
      id,
      quiz_id,
      user_id,
      score,
      timeSpent,
      start_time,
      end_time,
      daily_content_item_id,
      user:user_id(
        id,
        firstname,
        lastname,
        image
      )
    `,
    )
    .eq("status", "completed")
    .eq("program_id", programId);

  if (options?.dailyContentItemId) {
    query = query.eq("daily_content_item_id", options.dailyContentItemId);
  } else if (options?.quizId) {
    query = query.eq("quiz_id", options.quizId);
  }

  const { data, error } = await query.order("score", { ascending: false }).limit(200);

  if (error) throw error;

  const bestAttemptsByUser = new Map<string, SecondaryDailyQuizLeaderboardEntry>();

  for (const row of (data ?? []) as QuizAttemptRow[]) {
    if (!row.user_id) continue;

    const nextEntry: SecondaryDailyQuizLeaderboardEntry = {
      rank: 0,
      attemptId: row.id,
      userId: row.user_id,
      score: clampPercentage(row.score),
      timeSpent: getAttemptTimeSpent(row),
      firstname: row.user?.firstname ?? null,
      lastname: row.user?.lastname ?? null,
      image: row.user?.image ?? null,
    };

    if (shouldReplaceLeaderboardEntry(bestAttemptsByUser.get(row.user_id), nextEntry)) {
      bestAttemptsByUser.set(row.user_id, nextEntry);
    }
  }

  const entries = Array.from(bestAttemptsByUser.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.timeSpent !== right.timeSpent) {
        return left.timeSpent - right.timeSpent;
      }
      return left.attemptId - right.attemptId;
    })
    .slice(0, options?.limit ?? 10)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    dailyContentItemId: options?.dailyContentItemId ?? null,
    quizId: options?.quizId ?? null,
    entries,
  };
}

export async function markSecondaryDailyItemCompleted(
  dailyContentItemId: string,
  userId?: string | null,
  completionSource: "course" | "quiz" | "exercise" | "manual" = "manual",
  metadata?: Record<string, unknown>
) {
  const rpcClient = supabase as unknown as RpcClient;

  const { data, error } = await rpcClient.rpc(
    "mark_secondary_daily_item_completed",
    {
      p_daily_content_item_id: dailyContentItemId,
      p_user_id: userId ?? null,
      p_completion_source: completionSource,
      p_metadata: metadata ?? {},
    }
  );

  if (error) throw error;
  return data;
}

export async function findSecondaryDailyItemId(
  programId: string,
  userId: string | null | undefined,
  resource: {
    courseId?: number | string | null;
    quizId?: number | string | null;
    exerciseId?: number | string | null;
  },
  targetDate?: string
): Promise<string | null> {
  const dailyContent = await getSecondaryDailyContent(
    programId,
    userId,
    targetDate
  );

  if (!dailyContent) return null;

  if (resource.courseId != null) {
    const match = dailyContent.courses.find(
      (item) => String(item.courseId) === String(resource.courseId)
    );
    if (match) return match.dailyContentItemId;
  }

  if (resource.quizId != null) {
    const match = dailyContent.quizzes.find(
      (item) => String(item.quizId) === String(resource.quizId)
    );
    if (match) return match.dailyContentItemId;
  }

  if (resource.exerciseId != null) {
    const match = dailyContent.exercises.find(
      (item) => String(item.exerciseId) === String(resource.exerciseId)
    );
    if (match) return match.dailyContentItemId;
  }

  return null;
}
