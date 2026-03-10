import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSegments, useGlobalSearchParams } from 'expo-router';

type NavigationType = 'learn' | 'secondary';

interface NavigationContextValue {
  type: NavigationType;
  isSecondary: boolean;
  programId: string;
  courseId?: string;
  sectionId?: string;
  exerciceId?: string;
  quizId?: string;
  attemptId?: string;
  getBasePath: () => string;
  getQuizzesPath: () => string;
  getQuizPath: (quizId: string) => string;
  getQuizAttemptPath: (quizId: string, attemptId: string) => string;
  getCoursesPath: () => string;
  getCoursePath: (courseId: string) => string;
  getCourseSummaryPath: (courseId: string) => string;
  getLessonPath: (courseId: string, sectionId: string) => string;
  getExercicesPath: () => string;
  getExercicePath: (exerciceId: string) => string;
  getDocumentsPath: () => string;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const NavigationRoutes = {
  learn: {
    lesson: (pdId: string, courseId: string, sectionId: string) =>
      `/(app)/learn/${pdId}/courses/${courseId}/lessons/${sectionId}`,
    course: (pdId: string, courseId: string) =>
      `/(app)/learn/${pdId}/courses/${courseId}`,
    courseSummary: (pdId: string, courseId: string) =>
      `/(app)/learn/${pdId}/courses/${courseId}/summary`,
    quizzes: (pdId: string) => `/(app)/learn/${pdId}/quizzes`,
  },
  secondary: {
    lesson: (programId: string, courseId: string, sectionId: string) =>
      `/(app)/secondary/program/${programId}/courses/${courseId}/lessons/${sectionId}`,
    course: (programId: string, courseId: string) =>
      `/(app)/secondary/program/${programId}/courses/${courseId}`,
    courseSummary: (programId: string, courseId: string) =>
      `/(app)/secondary/program/${programId}/courses/${courseId}/summary`,
    quizzes: (programId: string) => `/(app)/secondary/program/${programId}/quizzes`,
  },
};

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const segments = useSegments();
  const globalParams = useGlobalSearchParams();

  const navigationValue = useMemo(() => {
    const isSecondary = (segments as string[]).includes('secondary');
    const type: NavigationType = isSecondary ? 'secondary' : 'learn';

    const programId = isSecondary
      ? String(globalParams.programId || '')
      : String(globalParams.pdId || '');

    const courseId = globalParams.courseId ? String(globalParams.courseId) : undefined;
    const sectionId = globalParams.sectionId ? String(globalParams.sectionId) : undefined;
    const exerciceId = globalParams.exerciceId ? String(globalParams.exerciceId) : undefined;
    const quizId = globalParams.quizId ? String(globalParams.quizId) : undefined;
    const attemptId = globalParams.attemptId ? String(globalParams.attemptId) : undefined;

    const basePath = isSecondary
      ? `/(app)/secondary/program/${programId}`
      : `/(app)/learn/${programId}`;

    const getBasePath = () => basePath;
    const getQuizzesPath = () => `${basePath}/quizzes`;
    const getQuizPath = (qId: string) => `${basePath}/quizzes/${qId}`;
    const getQuizAttemptPath = (qId: string, aId: string) => `${basePath}/quizzes/${qId}/${aId}`;
    const getCoursesPath = () => `${basePath}/courses`;
    const getCoursePath = (cId: string) => `${basePath}/courses/${cId}`;
    const getCourseSummaryPath = (cId: string) => `${basePath}/courses/${cId}/summary`;
    const getLessonPath = (cId: string, sId: string) => `${basePath}/courses/${cId}/lessons/${sId}`;
    const getExercicesPath = () => `${basePath}/exercices`;
    const getExercicePath = (eId: string) => `${basePath}/exercices/${eId}`;
    const getDocumentsPath = () => `${basePath}/documents`;

    return {
      type,
      isSecondary,
      programId,
      courseId,
      sectionId,
      exerciceId,
      quizId,
      attemptId,
      getBasePath,
      getQuizzesPath,
      getQuizPath,
      getQuizAttemptPath,
      getCoursesPath,
      getCoursePath,
      getCourseSummaryPath,
      getLessonPath,
      getExercicesPath,
      getExercicePath,
      getDocumentsPath,
    };
  }, [
    segments.join('/'),
    globalParams.programId,
    globalParams.pdId,
    globalParams.courseId,
    globalParams.sectionId,
    globalParams.exerciceId,
    globalParams.quizId,
    globalParams.attemptId,
  ]);

  return <NavigationContext.Provider value={navigationValue}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
