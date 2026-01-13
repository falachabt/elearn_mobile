import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSegments, useGlobalSearchParams } from 'expo-router';

type NavigationType = 'learn' | 'secondary';

interface NavigationContextValue {
  // Type de navigation
  type: NavigationType;
  isSecondary: boolean;
  
  // Paramètres dynamiques
  programId: string;
  courseId?: string;
  sectionId?: string;
  exerciceId?: string;
  quizId?: string;
  attemptId?: string;
  
  // Fonctions helper pour construire les routes
  getBasePath: () => string;
  getQuizzesPath: () => string;
  getQuizPath: (quizId: string) => string;
  getQuizAttemptPath: (quizId: string, attemptId: string) => string;
  getCoursesPath: () => string;
  getCoursePath: (courseId: string) => string;
  getLessonPath: (courseId: string, sectionId: string) => string;
  getExercicesPath: () => string;
  getExercicePath: (exerciceId: string) => string;
  getDocumentsPath: () => string;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

// Helper functions to build routes statically (without context)
export const NavigationRoutes = {
  learn: {
    lesson: (pdId: string, courseId: string, sectionId: string) => 
      `/(app)/learn/${pdId}/courses/${courseId}/lessons/${sectionId}`,
    course: (pdId: string, courseId: string) => 
      `/(app)/learn/${pdId}/courses/${courseId}`,
    quizzes: (pdId: string) => 
      `/(app)/learn/${pdId}/quizzes`,
  },
  secondary: {
    lesson: (programId: string, courseId: string, sectionId: string) => 
      `/(app)/secondary/program/${programId}/courses/${courseId}/lessons/${sectionId}`,
    course: (programId: string, courseId: string) => 
      `/(app)/secondary/program/${programId}/courses/${courseId}`,
    quizzes: (programId: string) => 
      `/(app)/secondary/program/${programId}/quizzes`,
  }
};

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const segments = useSegments();
  // TODO: Optimiser en extrayant programId depuis segments au lieu de useGlobalSearchParams
  // pour éviter les re-renders en cascade (voir doc Expo Router sur useGlobalSearchParams vs useLocalSearchParams)
  const globalParams = useGlobalSearchParams();

  const navigationValue = useMemo(() => {
    // Déterminer le type de navigation basé sur les segments
    const isSecondary = (segments as string[]).includes('secondary');
    const type: NavigationType = isSecondary ? 'secondary' : 'learn';

    // Extraire les paramètres selon le contexte
    // Learn utilise pdId, Secondary utilise programId
    const programId = isSecondary 
      ? String(globalParams.programId || '')
      : String(globalParams.pdId || '');
    
    const courseId = globalParams.courseId ? String(globalParams.courseId) : undefined;
    const sectionId = globalParams.sectionId ? String(globalParams.sectionId) : undefined;
    const exerciceId = globalParams.exerciceId ? String(globalParams.exerciceId) : undefined;
    const quizId = globalParams.quizId ? String(globalParams.quizId) : undefined;
    const attemptId = globalParams.attemptId ? String(globalParams.attemptId) : undefined;

    // Construire le base path selon le contexte
    const basePath = isSecondary 
      ? `/(app)/secondary/program/${programId}`
      : `/(app)/learn/${programId}`;

    const getBasePath = () => basePath;

    const getQuizzesPath = () => `${basePath}/quizzes`;

    const getQuizPath = (qId: string) => `${basePath}/quizzes/${qId}`;

    const getQuizAttemptPath = (qId: string, aId: string) => 
      `${basePath}/quizzes/${qId}/${aId}`;

    const getCoursesPath = () => `${basePath}/courses`;

    const getCoursePath = (cId: string) => `${basePath}/courses/${cId}`;

    const getLessonPath = (cId: string, sId: string) => 
      `${basePath}/courses/${cId}/lessons/${sId}`;

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
      getLessonPath,
      getExercicesPath,
      getExercicePath,
      getDocumentsPath,
    };
  }, [
    segments.join('/'), // Convertir en string pour détecter les changements
    globalParams.programId,
    globalParams.pdId,
    globalParams.courseId,
    globalParams.sectionId,
    globalParams.exerciceId,
    globalParams.quizId,
    globalParams.attemptId,
  ]);

  return (
    <NavigationContext.Provider value={navigationValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
