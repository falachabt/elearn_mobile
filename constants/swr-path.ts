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
        swrMutate(`course-progress-list-${userId}`, undefined, { revalidate: true });
    },
    mutateAllForCourse: async (userId: string, courseId: number | string) => {
        await swrMutate(['courseProgress', userId, courseId], undefined, { revalidate: true });
        await swrMutate(['sectionsProgress', userId, courseId], undefined, { revalidate: true });
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

// ====== PROGRAM KEYS ====== //
export const programKeys = {
    // String-based keys
    program: (pdId: string) => `program-${pdId}`,
    index: (pdId: string) => `program-index-${pdId}`,
    courses: (pdId: string) => `program-courses-${pdId}`,

    // Mutation helpers
    mutateProgram: (pdId: string) => swrMutate(`program-${pdId}`),
    mutateIndex: (pdId: string) => swrMutate(`program-index-${pdId}`),
    mutateCourses: (pdId: string) => swrMutate(`program-courses-${pdId}`),

    // Batch mutation helpers
    mutateAllForProgram: (pdId: string) => {
        swrMutate(`program-${pdId}`);
        swrMutate(`program-index-${pdId}`);
        swrMutate(`program-courses-${pdId}`);
    }
};

// ====== PROGRAM PAYMENT KEYS ====== //
export const programPaymentKeys = {
    // String-based keys
    all: () => 'program-payment',
    list: (userId: string) => `program-payment-list-${userId}`,
    detail: (programId: string) => `program-payment-${programId}`,
    access: (programId: string) => `program-payment-access-${programId}`,
    latest: (programId: string) => `program-payment-latest-${programId}`,
    active: (programId: string) => `program-payment-active-${programId}`,
    allPayments: (programId: string) => `program-payment-all-${programId}`,

    // Array-based keys
    allArray: () => ['program-payment'] as const,
    listArray: (userId: string) => ['program-payment', 'list', userId] as const,
    detailArray: (programId: string) => ['program-payment', 'detail', programId] as const,
    accessArray: (programId: string) => ['program-payment', 'access', programId] as const,
    latestArray: (programId: string) => ['program-payment', 'latest', programId] as const,
    activeArray: (programId: string) => ['program-payment', 'active', programId] as const,
    allPaymentsArray: (programId: string) => ['program-payment', 'all', programId] as const,

    // Mutation helpers for string-based keys
    mutateAll: () => swrMutate('program-payment'),
    mutateList: (userId: string) => swrMutate(`program-payment-list-${userId}`),
    mutateDetail: (programId: string) => swrMutate(`program-payment-${programId}`),
    mutateAccess: (programId: string) => swrMutate(`program-payment-access-${programId}`),
    mutateLatest: (programId: string) => swrMutate(`program-payment-latest-${programId}`),
    mutateActive: (programId: string) => swrMutate(`program-payment-active-${programId}`),
    mutateAllPayments: (programId: string) => swrMutate(`program-payment-all-${programId}`),

    // Mutation helpers for array-based keys
    mutateAllArray: () => swrMutate(['program-payment']),
    mutateListArray: (userId: string) => swrMutate(['program-payment', 'list', userId]),
    mutateDetailArray: (programId: string) => swrMutate(['program-payment', 'detail', programId]),
    mutateAccessArray: (programId: string) => swrMutate(['program-payment', 'access', programId]),
    mutateLatestArray: (programId: string) => swrMutate(['program-payment', 'latest', programId]),
    mutateActiveArray: (programId: string) => swrMutate(['program-payment', 'active', programId]),
    mutateAllPaymentsArray: (programId: string) => swrMutate(['program-payment', 'all', programId]),

    // Batch mutation helpers
    mutateAllForProgram: (programId: string) => {
        swrMutate(`program-payment-${programId}`);
        swrMutate(`program-payment-access-${programId}`);
        swrMutate(`program-payment-latest-${programId}`);
        swrMutate(`program-payment-active-${programId}`);
        swrMutate(`program-payment-all-${programId}`);
        swrMutate(['program-payment', 'detail', programId]);
        swrMutate(['program-payment', 'access', programId]);
        swrMutate(['program-payment', 'latest', programId]);
        swrMutate(['program-payment', 'active', programId]);
        swrMutate(['program-payment', 'all', programId]);

        // Also mutate program data
        programKeys.mutateProgram(programId);
    }
};

// Utility function to invalidate all progress for a user
export const invalidateAllUserProgress = (userId: string) => {
    // Invalidate all progress types for this user
    programProgressKeys.mutateAll();
    courseProgressKeys.mutateAll();
    quizProgressKeys.mutateList(userId);
    exerciseProgressKeys.mutateList(userId);
    archiveProgressKeys.mutateList(userId);
    programPaymentKeys.mutateList(userId);

    // Also invalidate array-based keys if used
    quizProgressKeys.mutateAllArray(userId);
    exerciseProgressKeys.mutateAllArray(userId);
    programPaymentKeys.mutateListArray(userId);
};
