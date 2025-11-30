import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import {
  useSecondaryProgram,
  useSecondaryProgramExercises,
} from "@/hooks/secondary/useSecondaryPrograms";
import { useCategories } from "@/hooks/global/useCategories";
import { ExerciseListView } from "@/components/shared/learn/exercices/ExerciseListView";

export default function ExercisesList() {
  const { programId } = useLocalSearchParams<{ programId: string }>();

  // Fetch data
  const { program, isLoading: isLoadingProgram } = useSecondaryProgram(programId);
  const { exercises, isLoading: isLoadingExercises } =
    useSecondaryProgramExercises(programId);
  const { categories: allCategories, isLoading: isLoadingCategories } =
    useCategories();

  const isLoading = isLoadingProgram || isLoadingExercises || isLoadingCategories;

  // Convert exercises to the format expected by ExerciseListView
  const exercisesWithDetails = useMemo(() => {
    if (!exercises) return [];

    return exercises.map((item) => {
      if (!item.exercise) return null;

      return {
        exerciseId: item.exercise.id,
        lpId: programId,
        exercise: {
          id: item.exercise.id,
          title: item.exercise.title,
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
        isPinned: false, // TODO: Implement pinning
        isCompleted: false, // TODO: Implement completion tracking
      };
    }).filter(Boolean);
  }, [exercises, programId]);

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
    const title = programClass?.name + " - " + serie?.name || "Programme";
    return { title };
  };

  const { title: programTitle } = getProgramInfo();

  return (
    <ExerciseListView
      exercises={exercisesWithDetails as never}
      categories={categories as never}
      isLoading={isLoading}
      programTitle={programTitle}
      programId={programId}
      baseRoute="/(app)/secondary/program/[programId]/exercices"
    />
  );
}
