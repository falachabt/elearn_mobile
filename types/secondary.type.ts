import { Database } from "./supabase";


export type SecondaryClass = Database["public"]["Tables"]["secondary_classes"]["Row"];
export type SecondaryClassSerie = Database["public"]["Tables"]["secondary_series"]["Row"];

export type SecondaryProgram = Database["public"]["Tables"]["secondary_programs"]["Row"] & {
    document_count: number | null; // TODO update the database schema to include documents_count
    class?: SecondaryClass | null;
    serie?: SecondaryClassSerie | null;
};
export type SecondaryProgramCourse = Database["public"]["Tables"]["secondary_program_courses"]["Row"] & {
    course?: Database["public"]["Tables"]["courses"]["Row"] | null;
};

export type SecondaryProgramExercise = Database["public"]["Tables"]["secondary_program_exercises"]["Row"] & {
    exercise?: Database["public"]["Tables"]["exercices"]["Row"] | null;
}
export type SecondaryProgramQuiz = Database["public"]["Tables"]["secondary_program_quizzes"]["Row"] & {
    quiz?: Database["public"]["Tables"]["quiz"]["Row"] | null;
}

export interface SecondaryDailyCourseItem {
    dailyContentItemId: string;
    courseId: number;
    name: string;
    orderIndex: number;
    isCompleted: boolean;
    progressPercentage: number;
}

export interface SecondaryDailyQuizItem {
    dailyContentItemId: string;
    quizId: string;
    name: string;
    description?: string | null;
    orderIndex: number;
    questionCount: number;
    bestScore: number;
    isCompleted: boolean;
}

export interface SecondaryDailyExerciseItem {
    dailyContentItemId: string;
    exerciseId: string;
    title: string;
    description?: string | null;
    orderIndex: number;
    courseId: number | null;
    isCompleted: boolean;
}

export interface SecondaryDailyContent {
    id: string;
    programId: string;
    targetDate: string;
    selectionMode: "auto" | "manual";
    pendingCount: number;
    courses: SecondaryDailyCourseItem[];
    quizzes: SecondaryDailyQuizItem[];
    exercises: SecondaryDailyExerciseItem[];
}

export interface SecondaryDailyQuizLeaderboardEntry {
    rank: number;
    attemptId: number;
    userId: string;
    score: number;
    timeSpent: number;
    firstname: string | null;
    lastname: string | null;
    image: Database["public"]["Tables"]["accounts"]["Row"]["image"];
}

export interface SecondaryDailyQuizLeaderboard {
    dailyContentItemId: string | null;
    quizId: string | null;
    entries: SecondaryDailyQuizLeaderboardEntry[];
}
