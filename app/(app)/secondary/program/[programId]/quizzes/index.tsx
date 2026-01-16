import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import {
  useSecondaryProgram,
  useSecondaryProgramQuizzes,
} from "@/hooks/secondary/useSecondaryPrograms";
import { QuizListView } from "@/components/shared/learn/quiz/QuizListView";
import { useQuizPins, useQuizAttempts } from "@/hooks/useQuizData";

export default function QuizzesList() {
  const { programId } = useLocalSearchParams<{ programId: string }>();

  // Fetch program and quizzes data
  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(programId);
  const { quizzes, isLoading: isLoadingQuizzes } =
    useSecondaryProgramQuizzes(programId);

  // Get quiz IDs for fetching pins and attempts
  const quizIds = useMemo(
    () => quizzes?.map((item) => item.quiz_id).filter((id): id is string => Boolean(id)) || [],
    [quizzes]
  );

  // Use shared hooks for pins and attempts
  const { pinnedMap } = useQuizPins(quizIds);
  const { bestScoreMap } = useQuizAttempts(quizIds, "completed");

  const isLoading = isLoadingProgram || isLoadingQuizzes;

  // Convert quizzes to the format expected by QuizListView
  const quizzesWithProgress = useMemo(() => {
    if (!quizzes) return [];

    return quizzes.map((item) => {
      if (!item.quiz) return null;

      const quizId = item.quiz.id;
      const isPinned = pinnedMap.has(quizId);
      const progress = bestScoreMap.get(quizId) || 0;

      return {
        quizId: quizId,
        lpId: programId,
        quiz: {
          id: item.quiz.id,
          name: item.quiz.name || "Quiz sans titre",
          description: item.quiz.description,
          category: item.quiz.course?.courses_categories
            ? {
                id: parseInt(item.quiz.course.courses_categories.id),
                name: item.quiz.course.courses_categories.name || "",
              }
            : undefined,
          quiz_questions: item.quiz.quiz_questions || [],
          course: item.quiz.course
            ? {
                id: item.quiz.course.id,
                name: item.quiz.course.name || "",
              }
            : undefined,
        },
        isPinned: isPinned,
        progress: progress,
      };
    }).filter(Boolean);
  }, [quizzes, programId, pinnedMap, bestScoreMap]);

  // Get program info
  const getProgramInfo = () => {
    const programClass = program?.class;
    const serie = program?.serie;
    const title = programClass?.name + " - " + serie?.name || "Programme";
    return { title };
  };

  const { title: programTitle } = getProgramInfo();

  return (
    <QuizListView
      quizzes={quizzesWithProgress as never}
      isLoading={isLoading}
      programTitle={programTitle}
      programId={programId}
      baseRoute={`/(app)/secondary/program/${programId}/quizzes`}
    />
  );
}
