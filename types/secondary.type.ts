import { Database } from "./supabase";


export type SecondaryClass = Database["public"]["Tables"]["secondary_classes"]["Row"];
export type SecondaryClassSerie = Database["public"]["Tables"]["secondary_series"]["Row"];

export type SecondaryProgram = Database["public"]["Tables"]["secondary_programs"]["Row"] & {
    document_count: number; // TODO update the database schema to include documents_count
    class?: SecondaryClass | null;
    serie?: SecondaryClassSerie | null;
};
export type SecondaryProgramCourse = Database["public"]["Tables"]["secondary_program_courses"]["Row"];
export type SecondaryProgramExercise = Database["public"]["Tables"]["secondary_program_exercises"]["Row"];
export type SecondaryProgramQuiz = Database["public"]["Tables"]["secondary_program_quizzes"]["Row"];
