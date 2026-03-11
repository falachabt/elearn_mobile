import useSWR from 'swr';

import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase';

interface ProgressData {
  completed: number;
  total: number;
  percentage: number;
}

export interface SecondaryProgramProgress {
  courseProgress: ProgressData;
  quizProgress: ProgressData;
  exercisesProgress: ProgressData;
  documentsProgress: ProgressData;
  totalProgress: number;
  isLoading: boolean;
  error: Error | null;
}

const capPercentage = (value: number): number => {
  return Math.min(Math.max(0, value), 100);
};

// Function to chunk arrays into smaller groups
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const fetchSecondaryProgramProgress = async (programId: string, userId: string) => {
  try {
    // 1. Récupérer le programme avec ses compteurs
    const { data: program, error: programError } = await supabase
      .from('secondary_programs')
      .select('id, course_count, quiz_count, exercise_count, document_count')
      .eq('id', programId)
      .single();

    if (programError) {
      logger.error('Error fetching program:', programError);
      throw programError;
    }

    if (!program) {
      throw new Error('Program not found');
    }

    // 2. Récupérer les IDs des cours via la table de jonction
    const { data: programCourses, error: coursesLinkError } = await supabase
      .from('secondary_program_courses')
      .select('course_id')
      .eq('program_id', programId);

    if (coursesLinkError) {
      logger.error('Error fetching program courses:', coursesLinkError);
    }

    const courseIds = programCourses?.map(pc => pc.course_id).filter(id => id != null) || [];

    // 3. Récupérer les IDs des quiz via la table de jonction
    const { data: programQuizzes, error: quizzesLinkError } = await supabase
      .from('secondary_program_quizzes')
      .select('quiz_id')
      .eq('program_id', programId);

    if (quizzesLinkError) {
      logger.error('Error fetching program quizzes:', quizzesLinkError);
    }

    const quizIds = programQuizzes?.map(pq => pq.quiz_id).filter(id => id != null) || [];

    // 4. Récupérer les IDs des exercices via la table de jonction
    const { data: programExercises, error: exercisesLinkError } = await supabase
      .from('secondary_program_exercises')
      .select('exercise_id')
      .eq('program_id', programId);

    if (exercisesLinkError) {
      logger.error('Error fetching program exercises:', exercisesLinkError);
    }

    const exerciseIds = programExercises?.map(pe => pe.exercise_id).filter(id => id != null) || [];

    // 5. Récupérer la progression des cours (table partagée avec Learn)
    const { data: courseProgressData, error: coursesError } = await supabase
      .from('course_progress_summary')
      .select('course_id, progress_percentage')
      .eq('user_id', userId)
      .in('course_id', courseIds.length > 0 ? courseIds.map(id => Number(id)) : []);

    if (coursesError) {
      logger.error('Error fetching course progress:', coursesError);
    }

    // Compter les cours complétés (progression >= 100%)
    const completedCourses = courseProgressData?.filter(
      course => (course.progress_percentage ?? 0) >= 100
    ) || [];

    // 6. Récupérer les quiz complétés (table partagée avec Learn)
    const { data: completedQuizzes, error: quizzesError } = await supabase
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('score', 70)
      .in('quiz_id', quizIds.length > 0 ? quizIds : []);

    if (quizzesError) {
      logger.error('Error fetching completed quizzes:', quizzesError);
    }

    // Dédupliquer les quiz_id (un utilisateur peut avoir plusieurs tentatives réussies du même quiz)
    const uniqueCompletedQuizIds = [...new Set(completedQuizzes?.map(q => q.quiz_id) || [])];

    // 7. Récupérer les exercices complétés avec chunking (table partagée avec Learn)
    let completedExercises: { exercice_id: string }[] = [];
    if (exerciseIds.length > 0) {
      const exerciseChunks = chunkArray(exerciseIds, 100);
      const exercisePromises = exerciseChunks.map(chunk =>
        supabase
          .from('exercices_complete')
          .select('exercice_id')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .in('exercice_id', chunk)
      );

      const exerciseResults = await Promise.all(exercisePromises);
      completedExercises = exerciseResults
        .filter(result => !result.error)
        .flatMap(result =>
          (result.data ?? []).filter(
            (exercise): exercise is { exercice_id: string } =>
              typeof exercise.exercice_id === 'string'
          )
        );
    }

    // Dédupliquer les exercice_id (même logique que pour les quiz)
    const uniqueCompletedExerciseIds = [...new Set(completedExercises.map(e => e.exercice_id))];

    // 8. Compter les documents complétés à partir des documents réellement rattachés au programme.
    const [
      programFoldersResult,
      rootProgramDocumentsResult,
    ] = await Promise.all([
      supabase
        .from('secondary_document_folders')
        .select('id')
        .eq('program_id', programId),
      supabase
        .from('secondary_program_documents')
        .select('document_id')
        .eq('program_id', programId)
        .eq('is_active', true),
    ]);

    if (programFoldersResult.error) {
      logger.error('Error fetching secondary document folders:', programFoldersResult.error);
    }

    if (rootProgramDocumentsResult.error) {
      logger.error('Error fetching root program documents:', rootProgramDocumentsResult.error);
    }

    const folderIds = (programFoldersResult.data ?? [])
      .map((folder) => folder.id)
      .filter((id) => id != null);
    const rootDocumentIds = (rootProgramDocumentsResult.data ?? [])
      .map((document) => document.document_id)
      .filter((id) => id != null);

    let programDocumentIds: string[] = [...new Set(rootDocumentIds)];

    if (folderIds.length > 0) {
      const { data: folderDocuments, error: folderDocumentsError } = await supabase
        .from('secondary_documents')
        .select('id')
        .in('folder_id', folderIds)
        .eq('is_correction', false);

      if (folderDocumentsError) {
        logger.error('Error fetching folder documents:', folderDocumentsError);
      } else {
        programDocumentIds = [
          ...new Set([
            ...programDocumentIds,
            ...(folderDocuments ?? []).map((document) => document.id).filter((id) => id != null),
          ]),
        ];
      }
    }

    let completedDocumentsCount = 0;

    if (programDocumentIds.length > 0) {
      const { count, error: documentsError } = await supabase
        .from('secondary_documents_complete')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true)
        .in('document_id', programDocumentIds);

      if (documentsError) {
        logger.error('Error fetching completed documents count:', documentsError);
      } else {
        completedDocumentsCount = count ?? 0;
      }
    }

    // Calculer les progressions
    const courseTotal = courseIds.length;
    const courseCompleted = completedCourses?.length || 0;
    const coursePercentage = courseTotal > 0 ? capPercentage((courseCompleted / courseTotal) * 100) : 0;

    const quizTotal = quizIds.length;
    const quizCompleted = uniqueCompletedQuizIds.length;
    const quizPercentage = quizTotal > 0 ? capPercentage((quizCompleted / quizTotal) * 100) : 0;

    const exerciseTotal = exerciseIds.length;
    const exerciseCompleted = uniqueCompletedExerciseIds.length;
    const exercisePercentage = exerciseTotal > 0 ? capPercentage((exerciseCompleted / exerciseTotal) * 100) : 0;

    // Utiliser le compteur de la base de données (fiable et stable)
    const documentTotal = program.document_count ?? 0;
    const documentCompleted = completedDocumentsCount;
    const documentPercentage = documentTotal > 0 ? capPercentage((documentCompleted / documentTotal) * 100) : 0;

    // Progression totale
    const totalItems = courseTotal + quizTotal + exerciseTotal + documentTotal;
    const totalCompleted = courseCompleted + quizCompleted + exerciseCompleted + documentCompleted;
    const totalProgress = totalItems > 0 ? capPercentage((totalCompleted / totalItems) * 100) : 0;

    const result = {
      courseProgress: {
        completed: courseCompleted,
        total: courseTotal,
        percentage: coursePercentage,
      },
      quizProgress: {
        completed: quizCompleted,
        total: quizTotal,
        percentage: quizPercentage,
      },
      exercisesProgress: {
        completed: exerciseCompleted,
        total: exerciseTotal,
        percentage: exercisePercentage,
      },
      documentsProgress: {
        completed: documentCompleted,
        total: documentTotal,
        percentage: documentPercentage,
      },
      totalProgress,
    };

    return result;
  } catch (error) {
    logger.error('Error in fetchSecondaryProgramProgress:', error);
    throw error;
  }
};

export const useSecondaryProgramProgress = (
  programId: string | undefined,
  userId: string | undefined
): SecondaryProgramProgress => {
  const shouldFetch = !!programId && !!userId;

  const { data, error, isLoading } = useSWR(
    shouldFetch ? ['secondary-program-progress', programId, userId] : null,
    () => fetchSecondaryProgramProgress(programId!, userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      keepPreviousData: false, // Ne pas garder les anciennes données
    }
  );

  return {
    courseProgress: data?.courseProgress || { completed: 0, total: 0, percentage: 0 },
    quizProgress: data?.quizProgress || { completed: 0, total: 0, percentage: 0 },
    exercisesProgress: data?.exercisesProgress || { completed: 0, total: 0, percentage: 0 },
    documentsProgress: data?.documentsProgress || { completed: 0, total: 0, percentage: 0 },
    totalProgress: data?.totalProgress || 0,
    isLoading,
    error: error || null,
  };
};
