import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState, useCallback, useRef } from "react";
import { mutate as swrGlobalMutate } from "swr";

const invalidateDailyContent = () =>
  void swrGlobalMutate(
    (key: unknown) =>
      Array.isArray(key) &&
      typeof key[0] === "string" &&
      (key[0] === "secondary-daily-content" ||
        key[0] === "secondary-daily-content-programs"),
    undefined,
    { revalidate: true }
  );

const invalidateExerciseLists = (
  programId: string,
  userId?: string | null
) =>
  void swrGlobalMutate(
    (key: unknown) =>
      Array.isArray(key) &&
      key[0] === "secondary-program-exercises" &&
      key[1] === programId &&
      key[2] === (userId ?? undefined),
    undefined,
    { revalidate: true }
  );

import { logger } from '@/utils/logger';
import {
  useSecondaryProgram,
  useSecondaryProgramExercises,
} from "@/hooks/secondary/useSecondaryPrograms";
import { useSecondaryDailyContent } from "@/hooks/secondary/useSecondaryDailyContent";
import { useCategories } from "@/hooks/global/useCategories";
import { ExerciseListView } from "@/components/shared/learn/exercices/ExerciseListView";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { markSecondaryDailyItemCompleted } from "@/services/secondary/dailyContent.service";

interface ExerciseRow {
  exercise: {
    id: string;
    title: string | null;
    description: string | null;
    course: {
      id: number;
      name: string | null;
      category: string | null;
      courses_categories: {
        id: string;
        name: string;
        description: string | null;
      } | null;
    } | null;
    exercices_pin?: Array<{ is_pinned?: boolean | null }>;
    exercices_complete?: Array<{ is_completed?: boolean | null }>;
  } | null;
}

export default function ExercisesList() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [allExercises, setAllExercises] = useState<ExerciseRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch data
  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(programId);
  const { dailyContent, mutate: mutateDailyContent } = useSecondaryDailyContent(
    programId,
    user?.id
  );
  const { 
    exercises, 
    count,
    hasMore,
    isLoading: isLoadingExercises, 
    mutate 
  } = useSecondaryProgramExercises(programId, user?.id, page, searchQuery);
  
  const { categories: allCategories, isLoading: isLoadingCategories } =
    useCategories();

  const isLoading = isLoadingProgram || isLoadingCategories || (isLoadingExercises && page === 0);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Append new exercises when they load
  React.useEffect(() => {
    if (exercises && exercises.length > 0) {
      if (page === 0) {
        setAllExercises(exercises as ExerciseRow[]);
      } else {
        setAllExercises(prev => [...prev, ...(exercises as ExerciseRow[])]);
      }
    }
  }, [exercises, page]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoadingExercises && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoadingExercises, hasMore]);

  // Reset pagination when filter changes (will be called from child)
  const resetPagination = useCallback(() => {
    setPage(0);
    // Don't call mutate() - changing page will automatically trigger SWR refetch
    // since page is part of the SWR key
  }, []);

  // Handle search query changes from child component with debounce
  const handleSearchChange = useCallback((query: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Wait 500ms before updating the state to avoid excessive re-renders
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
      setPage(0);
    }, 500);
  }, []);

  // Convert exercises to the format expected by ExerciseListView
  const exercisesWithDetails = useMemo(() => {
    if (!allExercises || allExercises.length === 0) return [];

    return allExercises.map((item) => {
      if (!item.exercise) return null;

      const isPinned = item.exercise.exercices_pin?.[0]?.is_pinned || false;
      const isCompleted = item.exercise.exercices_complete?.[0]?.is_completed || false;

      return {
        exerciseId: item.exercise.id as unknown as number,
        lpId: programId,
        dailyContentItemId:
          dailyContent?.exercises.find(
            (dailyExercise) => dailyExercise.exerciseId === item.exercise?.id
          )?.dailyContentItemId,
        exercise: {
          id: item.exercise.id as unknown as number,
          title: item.exercise.title ?? "Exercice sans titre",
          description: item.exercise.description,
          course: item.exercise.course
            ? {
                id: item.exercise.course.id,
                name: item.exercise.course.name || "",
                category: item.exercise.course.category,
                courses_categories: item.exercise.course.courses_categories,
              }
            : undefined,
          document_count: 0, // TODO: Add document count to exercise type
        },
        isPinned,
        isCompleted,
      };
    }).filter(Boolean);
  }, [allExercises, dailyContent?.exercises, programId]);

  const dailyExercise = useMemo(() => {
    const primaryDailyExercise = dailyContent?.exercises?.[0];
    if (!primaryDailyExercise) return undefined;

    return (
      exercisesWithDetails as NonNullable<typeof exercisesWithDetails>
    ).find(
      (item) =>
        String(item?.exercise?.id) === primaryDailyExercise.exerciseId
    );
  }, [dailyContent?.exercises, exercisesWithDetails]);

  // Extract unique categories from exercises
  const categories = useMemo(() => {
    if (!exercisesWithDetails || !allCategories) return [];

    const categoryIds = new Set(
      exercisesWithDetails.map((item) => item?.exercise?.course?.category).filter(Boolean)
    );

    return allCategories.filter((cat) => categoryIds.has(cat.id));
  }, [exercisesWithDetails, allCategories]);

  // Get program info
  const getProgramInfo = () => {
    const programClass = program?.class;
    const serie = program?.serie;
    const title =
      programClass?.name && serie?.name
        ? `${programClass.name} - ${serie.name}`
        : "Programme";
    return { title };
  };

  const { title: programTitle } = getProgramInfo();

  // Handle pin toggle
  const handlePinToggle = async (exerciseId: number) => {
    if (!user?.id) return;

    try {
      const exercise = exercisesWithDetails.find((ex) => ex?.exercise?.id === exerciseId);
      const currentPinState = exercise?.isPinned || false;
      const newPinState = !currentPinState;

      // Update database
      const { error } = await supabase
        .from("exercices_pin")
        .upsert(
          [{
            user_id: user.id,
            exercice_id: String(exerciseId),
            is_pinned: newPinState,
          }],
          { onConflict: "user_id,exercice_id" }
        );

      if (error) {
        logger.error("Error updating pin state:", error);
        // Revert on error - reload from page 0
        setPage(0);
        mutate();
      }
    } catch (error) {
      logger.error("Unexpected error updating pin state:", error);
      setPage(0);
      mutate();
    }
  };

  // Handle completion toggle
  const handleCompletionToggle = async (exerciseId: number) => {
    if (!user?.id) return;

    try {
      const exercise = exercisesWithDetails.find((ex) => ex?.exercise?.id === exerciseId);
      const currentCompletionState = exercise?.isCompleted || false;
      const newCompletionState = !currentCompletionState;

      setAllExercises((prev) =>
        prev.map((item) =>
          item.exercise?.id === String(exerciseId)
            ? {
                ...item,
                exercise: {
                  ...item.exercise,
                  exercices_complete: [{ is_completed: newCompletionState }],
                },
              }
            : item
        )
      );

      // Update database
      const { error } = await supabase
        .from("exercices_complete")
        .upsert(
          [{
            user_id: user.id,
            exercice_id: String(exerciseId),
            is_completed: newCompletionState,
          }],
          { onConflict: "user_id,exercice_id" }
        );

      if (error) {
        logger.error("Error updating completion state:", error);
        // Revert on error - reload from page 0
        setPage(0);
        mutate();
      } else {
        if (newCompletionState) {
          const dailyItem = dailyContent?.exercises.find(
            (item) => item.exerciseId === String(exerciseId)
          );

          if (dailyItem) {
            await markSecondaryDailyItemCompleted(
              dailyItem.dailyContentItemId,
              user.id,
              "exercise",
              { exerciseId: String(exerciseId), programId }
            );
          }
        }

        await mutateDailyContent();
        invalidateDailyContent();
        invalidateExerciseLists(programId, user.id);
      }
    } catch (error) {
      logger.error("Unexpected error updating completion state:", error);
      setPage(0);
      mutate();
    }
  };

  return (
    <ExerciseListView
      exercises={exercisesWithDetails as never}
      categories={categories as never}
      isLoading={isLoading}
      isLoadingMore={isLoadingExercises && page > 0}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onFilterChange={resetPagination}
      onSearchChange={handleSearchChange}
      totalCount={count}
      programTitle={programTitle}
      programId={programId}
      baseRoute={`/(app)/secondary/program/${programId}/exercices`}
      featuredExercise={dailyExercise ?? undefined}
      onPinToggle={handlePinToggle}
      onCompletionToggle={handleCompletionToggle}
    />
  );
}
