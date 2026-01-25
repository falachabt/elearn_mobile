import useSWR from 'swr';

import {
  getSecondaryPrograms,
  getSecondaryProgramById,
  getSecondaryProgramCourses,
  getSecondaryProgramExercises,
  getSecondaryProgramQuizzes,
  getSecondaryProgramContent,
} from '@/services/secondary/program.service';
import { SecondaryProgram } from '@/types/secondary.type';

// Récupérer tous les programmes secondaires
export function useSecondaryPrograms() {
  const { data, error, isLoading } = useSWR<SecondaryProgram[] | null>('secondary-programs', getSecondaryPrograms);
  return {
    programs: data,
    isLoading,
    isError: !!error,
  };
}

// Récupérer un programme par son id
export function useSecondaryProgram(id: string) {
  const { data, error, isLoading } = useSWR<SecondaryProgram | null>(
    id ? ['secondary-program', id] : null,
    (args) => getSecondaryProgramById(args[1] as string)
  );
  return {
    program: data,
    isLoading,
    isError: !!error,
  };
}



// Récupérer les cours d'un programme
export function useSecondaryProgramCourses(programId: string) {
  const { data, error, isLoading } = useSWR(programId ? ['secondary-program-courses', programId] : null, ([, id]) => getSecondaryProgramCourses(id));
  return {
    courses: data,
    isLoading,
    isError: !!error,
  };
}

// Récupérer les exercices d'un programme avec pagination
export function useSecondaryProgramExercises(programId: string, userId?: string, page: number = 0, searchQuery: string = "") {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? ['secondary-program-exercises', programId, userId, page, searchQuery] : null, 
    ([, id, uid, p, search]) => getSecondaryProgramExercises(id, uid, p, 20, search),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  return {
    exercises: data?.data,
    count: data?.count,
    hasMore: data?.hasMore,
    isLoading,
    isError: !!error,
    mutate,
  };
}

// Récupérer les quiz d'un programme avec pagination
export function useSecondaryProgramQuizzes(programId: string, userId?: string, page: number = 0, searchQuery: string = "") {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? ['secondary-program-quizzes', programId, userId, page, searchQuery] : null,
    ([, id, uid, p, search]) => getSecondaryProgramQuizzes(id, uid, p, 20, search),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  return {
    quizzes: data?.data,
    count: data?.count,
    hasMore: data?.hasMore,
    isLoading,
    isError: !!error,
    mutate,
  };
}

// Récupérer toutes les ressources d'un programme (cours, exercices, quiz)
export function useSecondaryProgramResources(programId: string) {
  const { data, error, isLoading } = useSWR(programId ? ['secondary-program-resources', programId] : null, ([, id]) => getSecondaryProgramContent(id));
  return {
    resources: data,
    isLoading,
    isError: !!error,
  };
}



