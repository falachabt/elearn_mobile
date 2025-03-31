// src/constants/swr-path.ts
import { mutate as swrMutate } from 'swr';

// ====== PROGRAM PROGRESS KEYS ====== //
export const programProgressKeys = {
    // Key generators
    all: () => 'program-progress',
    detail: (lpId: string, userId: string) => `program-progress-${lpId}-${userId}`,

    // Array-based keys (for consistency with your other code)
    allArray: () => ['program-progress'] as const,
    detailArray: (lpId: string, userId: string) =>
        ['program-progress', lpId, userId] as const,

    // Mutation helpers
    mutateAll: () => swrMutate('program-progress'),
    mutateDetail: (lpId: string, userId: string) =>
        swrMutate(`program-progress-${lpId}-${userId}`),

    // Array-based mutations
    mutateAllArray: () => swrMutate(['program-progress']),
    mutateDetailArray: (lpId: string, userId: string) =>
        swrMutate(['program-progress', lpId, userId])
};

// ====== COURSE PROGRESS KEYS ====== //
export const courseProgressKeys = {
    // String-based keys
    all: () => 'course-progress',
    list: (userId: string) => `course-progress-list-${userId}`,
    detail: (courseId: string, userId: string) =>
        `course-progress-${courseId}-${userId}`,

    // Array-based keys (matching your existing implementation)
    summary: (userId: string, courseId: number | string) =>
        ['courseProgress', userId, courseId] as const,
    sections: (userId: string, courseId: number | string) =>
        ['sectionsProgress', userId, courseId] as const,
    section: (userId: string, courseId: number | string, sectionId: number | string) =>
        ['sectionProgress', userId, courseId, sectionId] as const,

    // Mutation helpers for string-based keys
    mutateAll: () => swrMutate('course-progress'),
    mutateList: (userId: string) =>
        swrMutate(`course-progress-list-${userId}`),
    mutateDetail: (courseId: string, userId: string) =>
        swrMutate(`course-progress-${courseId}-${userId}`),

    // Mutation helpers for array-based keys
    mutateSummary: (userId: string, courseId: number | string) =>
        swrMutate(['courseProgress', userId, courseId]),
    mutateSections: (userId: string, courseId: number | string) =>
        swrMutate(['sectionsProgress', userId, courseId]),
    mutateSection: (userId: string, courseId: number | string, sectionId: number | string) =>
        swrMutate(['sectionProgress', userId, courseId, sectionId]),

    // Batch mutation helpers
    mutateAllForUser: (userId: string) => {
        swrMutate(`course-progress-list-${userId}`);
    },
    mutateAllForCourse: (userId: string, courseId: number | string) => {
        swrMutate(['courseProgress', userId, courseId]);
        swrMutate(['sectionsProgress', userId, courseId]);
    }
};

// ====== QUIZ PROGRESS KEYS ====== //
export const quizProgressKeys = {
    all: () => 'quiz-progress',
    list: (userId: string) => `quiz-progress-list-${userId}`,
    detail: (quizId: string, userId: string) =>
        `quiz-progress-${quizId}-${userId}`,

    // Array-based keys
    allArray: (userId: string) => ['quizProgress', userId] as const,
    detailArray: (userId: string, quizId: string) =>
        ['quizProgress', userId, quizId] as const,

    // Mutation helpers
    mutateAll: () => swrMutate('quiz-progress'),
    mutateList: (userId: string) =>
        swrMutate(`quiz-progress-list-${userId}`),
    mutateDetail: (quizId: string, userId: string) =>
        swrMutate(`quiz-progress-${quizId}-${userId}`),

    // Array-based mutations
    mutateAllArray: (userId: string) => swrMutate(['quizProgress', userId]),
    mutateDetailArray: (userId: string, quizId: string) =>
        swrMutate(['quizProgress', userId, quizId])
};

// ====== EXERCISE PROGRESS KEYS ====== //
export const exerciseProgressKeys = {
    all: () => 'exercise-progress',
    list: (userId: string) => `exercise-progress-list-${userId}`,
    detail: (exerciseId: string, userId: string) =>
        `exercise-progress-${exerciseId}-${userId}`,

    // Array-based
    allArray: (userId: string) => ['exerciseProgress', userId] as const,
    detailArray: (userId: string, exerciseId: string) =>
        ['exerciseProgress', userId, exerciseId] as const,

    // Mutations
    mutateAll: () => swrMutate('exercise-progress'),
    mutateList: (userId: string) =>
        swrMutate(`exercise-progress-list-${userId}`),
    mutateDetail: (exerciseId: string, userId: string) =>
        swrMutate(`exercise-progress-${exerciseId}-${userId}`),

    // Array-based mutations
    mutateAllArray: (userId: string) => swrMutate(['exerciseProgress', userId]),
    mutateDetailArray: (userId: string, exerciseId: string) =>
        swrMutate(['exerciseProgress', userId, exerciseId])
};

// ====== ARCHIVE PROGRESS KEYS ====== //
export const archiveProgressKeys = {
    all: () => 'archive-progress',
    list: (userId: string) => `archive-progress-list-${userId}`,
    detail: (archiveId: string, userId: string) =>
        `archive-progress-${archiveId}-${userId}`,

    // Mutations
    mutateAll: () => swrMutate('archive-progress'),
    mutateList: (userId: string) =>
        swrMutate(`archive-progress-list-${userId}`),
    mutateDetail: (archiveId: string, userId: string) =>
        swrMutate(`archive-progress-${archiveId}-${userId}`)
};

// Utility function to invalidate all progress for a user
export const invalidateAllUserProgress = (userId: string) => {
    // Invalidate all progress types for this user
    programProgressKeys.mutateAll();
    courseProgressKeys.mutateAll();
    quizProgressKeys.mutateList(userId);
    exerciseProgressKeys.mutateList(userId);
    archiveProgressKeys.mutateList(userId);

    // Also invalidate array-based keys if used
    quizProgressKeys.mutateAllArray(userId);
    exerciseProgressKeys.mutateAllArray(userId);
};