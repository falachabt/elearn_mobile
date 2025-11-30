import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import {
  useSecondaryProgram,
  useSecondaryProgramQuizzes,
} from "@/hooks/secondary/useSecondaryPrograms";
import { QuizListView } from "@/components/shared/learn/quiz/QuizListView";

export default function QuizzesList() {
  const { programId } = useLocalSearchParams<{ programId: string }>();

  // Fetch data
  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(programId);
  const { quizzes, isLoading: isLoadingQuizzes } =
    useSecondaryProgramQuizzes(programId);

  const isLoading = isLoadingProgram || isLoadingQuizzes;

  // Convert quizzes to the format expected by QuizListView
  const quizzesWithProgress = useMemo(() => {
    if (!quizzes) return [];

    return quizzes.map((item) => {
      if (!item.quiz) return null;

      return {
        quizId: parseInt(item.quiz.id),
        lpId: programId,
        quiz: {
          id: parseInt(item.quiz.id),
          name: item.quiz.name || "Quiz sans titre",
          description: item.quiz.description,
          category: item.quiz.course?.courses_categories
            ? {
                id: parseInt(item.quiz.course.courses_categories.id),
                name: item.quiz.course.courses_categories.name || "",
              }
            : undefined,
          quiz_questions: [], // TODO: Add quiz questions if needed
          course: item.quiz.course
            ? {
                id: item.quiz.course.id,
                name: item.quiz.course.name || "",
              }
            : undefined,
        },
        isPinned: false, // TODO: Implement pinning
        progress: 0, // TODO: Implement progress tracking
      };
    }).filter(Boolean);
  }, [quizzes, programId]);

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
      baseRoute="/(app)/secondary/program/[programId]/quizzes"
    />
  );
}
