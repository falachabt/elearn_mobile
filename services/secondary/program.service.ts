import { supabase } from "@/lib/supabase";
import { SecondaryProgram } from "@/types/secondary.type";

export async function getSecondaryPrograms(): Promise<SecondaryProgram[]> {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*, class:secondary_classes(*), serie:secondary_series(*)")
    .filter("is_active", "eq", true);
  console.log("Fetched secondary programs:", data, error);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramById(
  id: string
): Promise<SecondaryProgram> {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*, class:secondary_classes(*), serie:secondary_series(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramsByClass(classId: string) {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*")
    .eq("class_id", classId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramsBySerie(serieId: string) {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*")
    .eq("serie_id", serieId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramCourses(programId: string) {
  const { data, error } = await supabase
    .from("secondary_program_courses")
    .select("*")
    .eq("program_id", programId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramExercises(programId: string) {
  const { data, error } = await supabase
    .from("secondary_program_exercises")
    .select("*")
    .eq("program_id", programId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramQuizzes(programId: string) {
  const { data, error } = await supabase
    .from("secondary_program_quizzes")
    .select("*")
    .eq("program_id", programId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramContent(programId: string) {
  const coursesPromise = getSecondaryProgramCourses(programId);
  const exercisesPromise = getSecondaryProgramExercises(programId);
  const quizzesPromise = getSecondaryProgramQuizzes(programId);

  const [courses, exercises, quizzes] = await Promise.all([
    coursesPromise,
    exercisesPromise,
    quizzesPromise,
  ]);

  return {
    courses,
    exercises,
    quizzes,
  };
}
