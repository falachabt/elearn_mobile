import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState, useCallback, useEffect } from "react";

import {
  useSecondaryProgram,
  useSecondaryProgramQuizzes,
} from "@/hooks/secondary/useSecondaryPrograms";
import { QuizListView } from "@/components/shared/learn/quiz/QuizListView";
import { useQuizPins, useQuizAttempts } from "@/hooks/useQuizData";
import { SecondaryProgramQuiz } from "@/types/secondary.type";

export default function QuizzesList() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const [page, setPage] = useState(0);
  const [allQuizzes, setAllQuizzes] = useState<SecondaryProgramQuiz[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch program and quizzes data
  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(programId);
  const { 
    quizzes, 
    count,
    hasMore,
    isLoading: isLoadingQuizzes,
    mutate
  } = useSecondaryProgramQuizzes(programId, page, searchQuery);

  const isLoading = isLoadingProgram || (isLoadingQuizzes && page === 0);

  // Append new quizzes when they load
  useEffect(() => {
    if (quizzes && quizzes.length > 0) {
      if (page === 0) {
        setAllQuizzes(quizzes);
      } else {
        setAllQuizzes(prev => [...prev, ...quizzes]);
      }
    } else if (page === 0) {
      // Handle empty results when searching or first load
      setAllQuizzes([]);
    }
  }, [quizzes, page]);

  // Get quiz IDs for fetching pins and attempts
  const quizIds = useMemo(
    () => allQuizzes?.map((item) => item.quiz_id).filter((id): id is string => Boolean(id)) || [],
    [allQuizzes]
  );

  // Use shared hooks for pins and attempts
  const { pinnedMap } = useQuizPins(quizIds);
  const { bestScoreMap } = useQuizAttempts(quizIds, "completed");

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoadingQuizzes && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoadingQuizzes, hasMore]);

  // Reset pagination when filter changes (will be called from child)
  const resetPagination = useCallback(() => {
    setPage(0);
  }, []);

  // Handle search query changes from child component
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(0);
  }, []);

  // Convert quizzes to the format expected by QuizListView
  const quizzesWithProgress = useMemo(() => {
    if (!allQuizzes) return [];

    return allQuizzes.map((item) => {
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
  }, [allQuizzes, programId, pinnedMap, bestScoreMap]);

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
      isLoadingMore={isLoadingQuizzes && page > 0}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onFilterChange={resetPagination}
      onSearchChange={handleSearchChange}
      totalCount={count}
      programTitle={programTitle}
      programId={programId}
      baseRoute={`/(app)/secondary/program/${programId}/quizzes`}
    />
  );
}
