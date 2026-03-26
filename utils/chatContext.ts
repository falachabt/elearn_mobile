import { unstable_serialize } from "swr";

import { logger } from "@/utils/logger";

export type ContextElementType =
  | "program"
  | "course"
  | "lesson"
  | "exercise"
  | "quiz"
  | "archive"
  | "video"
  | "document";

export interface ProgramCourseSummary {
  name?: string | null;
  title?: string | null;
}

export interface LessonSummary {
  name?: string | null;
}

export interface ResourceSummary {
  title?: string | null;
  name?: string | null;
}

export interface HintSummary {
  text?: string | null;
}

export interface QuizQuestionSummary {
  question_text?: string | null;
  question_type?: string | null;
}

export interface VideoChapterSummary {
  title?: string | null;
  start_time?: number | null;
}

export interface ContextElementData {
  title?: string | null;
  name?: string | null;
  description?: string | null;
  course_count?: number | null;
  course_learningpath?: ProgramCourseSummary[] | null;
  concours_learningpaths?: {
    concour?: {
      name?: string | null;
      school?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
  class?: {
    name?: string | null;
  } | null;
  serie?: {
    name?: string | null;
  } | null;
  level?: string | null;
  duration?: number | string | null;
  category?: {
    name?: string | null;
  } | null;
  courses_categories?: {
    name?: string | null;
  } | null;
  goals?: string[] | string | null;
  courses_content?: LessonSummary[] | null;
  prerequisites?: string | null;
  quiz_count?: number | null;
  exercise_count?: number | null;
  order?: number | null;
  courses?: {
    name?: string | null;
  } | null;
  content?: string | null;
  has_quiz?: boolean | null;
  has_exercises?: boolean | null;
  keywords?: string[] | null;
  resources?: ResourceSummary[] | null;
  course?: {
    name?: string | null;
  } | null;
  lesson?: {
    name?: string | null;
  } | null;
  instructions?: string | null;
  difficulty?: string | null;
  points?: number | null;
  tags?: string[] | null;
  hints?: Array<HintSummary | string> | null;
  solution?: unknown;
  quiz_questions?: QuizQuestionSummary[] | null;
  passing_score?: number | null;
  time_limit?: number | null;
  session?: string | null;
  file_type?: string | null;
  year?: number | string | null;
  subject?: string | null;
  school?: string | null;
  concours?: string | null;
  author?: string | null;
  size?: number | null;
  file_size?: number | null;
  download_count?: number | null;
  transcript?: string | null;
  view_count?: number | null;
  quality?: string | null;
  chapters?: VideoChapterSummary[] | null;
  related_resources?: ResourceSummary[] | null;
  download_url?: string | null;
  file_url?: string | null;
  local_path?: string | null;
  storage_path?: string | null;
  is_correction?: boolean | null;
}

export interface ContextElement {
  id: string;
  type: ContextElementType;
  title: string;
  data: ContextElementData | null;
}

type CacheKey = string | readonly unknown[];

interface ParsedRoute {
  area: "learn" | "secondary" | "manual" | "unknown";
  pathname: string;
  segments: string[];
  programId: string | null;
  courseId: string | null;
  lessonId: string | null;
  exerciseId: string | null;
  quizId: string | null;
  videoId: string | null;
  documentId: string | null;
  archiveRouteId: string | null;
  competitionId: string | null;
  isCourseList: boolean;
  isQuizList: boolean;
  isExerciseList: boolean;
  isDocumentList: boolean;
}

interface ContextCandidate {
  id: string;
  type: ContextElementType;
  cacheKeys?: CacheKey[];
  title?: string;
  data?: ContextElementData | null;
}

const TYPE_LABELS: Record<ContextElementType, string> = {
  program: "Programme",
  course: "Cours",
  lesson: "Leçon",
  exercise: "Exercice",
  quiz: "Quiz",
  archive: "Archive",
  video: "Vidéo",
  document: "Document",
};

export const getContextElementIconName = (type: ContextElementType) => {
  switch (type) {
    case "program":
      return "book-open-variant";
    case "course":
      return "book-open-page-variant";
    case "lesson":
      return "file-document-outline";
    case "exercise":
      return "pencil-outline";
    case "quiz":
      return "help-circle-outline";
    case "video":
      return "play-circle-outline";
    case "document":
    case "archive":
    default:
      return "file-outline";
  }
};

const getSegmentAfter = (segments: string[], segment: string): string | null => {
  const index = segments.findIndex((value) => value === segment);
  if (index === -1) {
    return null;
  }

  return index + 1 < segments.length ? segments[index + 1] : null;
};

const parseRoute = (pathname: string): ParsedRoute => {
  const segments = pathname.split("/").filter(Boolean);
  const area =
    segments[0] === "learn"
      ? "learn"
      : segments[0] === "secondary"
        ? "secondary"
        : segments[0] === "manuel"
          ? "manual"
          : "unknown";

  const programId =
    area === "learn"
      ? segments[1] || null
      : area === "secondary" && segments[1] === "program"
        ? segments[2] || null
        : null;

  const courseId = getSegmentAfter(segments, "courses");
  const lessonId = getSegmentAfter(segments, "lessons");
  const exerciseId = getSegmentAfter(segments, "exercices");
  const quizId = getSegmentAfter(segments, "quizzes");
  const videoId = getSegmentAfter(segments, "videos");
  const documentId = getSegmentAfter(segments, "documents");

  let archiveRouteId: string | null = null;
  let competitionId: string | null = null;

  if (area === "learn") {
    const analesIndex = segments.findIndex((value) => value === "anales");
    if (analesIndex !== -1 && analesIndex + 2 < segments.length) {
      archiveRouteId = segments[analesIndex + 2];
    }
  }

  if (area === "manual") {
    const anciensIndex = segments.findIndex((value) => value === "anciens-sujets");
    if (anciensIndex !== -1) {
      competitionId = segments[anciensIndex + 1] || null;
      if (anciensIndex + 3 < segments.length) {
        archiveRouteId = segments[anciensIndex + 3];
      }
    }
  }

  const isManualQuiz = area === "manual" && segments[1] === "quiz";
  const isManualExercise = area === "manual" && segments[1] === "exercices";

  return {
    area,
    pathname,
    segments,
    programId,
    courseId,
    lessonId,
    exerciseId,
    quizId,
    videoId,
    documentId,
    archiveRouteId,
    competitionId,
    isCourseList: segments.includes("courses") && !courseId,
    isQuizList: (segments.includes("quizzes") && !quizId) || isManualQuiz,
    isExerciseList:
      (segments.includes("exercices") && !exerciseId) || isManualExercise,
    isDocumentList: segments.includes("documents") && !documentId,
  };
};

const getCacheData = (cache: any, key: CacheKey | null | undefined) => {
  if (!key) {
    return null;
  }

  const serializedKey = Array.isArray(key) ? unstable_serialize(key) : key;
  return cache.get(serializedKey)?.data ?? null;
};

const getFirstCacheData = (cache: any, keys: CacheKey[] = []) => {
  for (const key of keys) {
    const data = getCacheData(cache, key);
    if (data) {
      return data;
    }
  }

  return null;
};

const buildElementTitle = (
  type: ContextElementType,
  data: ContextElementData | null | undefined,
  fallback: string
) => {
  const label = TYPE_LABELS[type];
  const name =
    data?.title ||
    data?.name ||
    (data?.course?.name && type === "course" ? data.course.name : null);

  return `${label}: ${name || fallback}`;
};

const resolveCandidate = (cache: any, candidate: ContextCandidate): ContextElement | null => {
  const cachedData = getFirstCacheData(cache, candidate.cacheKeys);
  if (cachedData) {
    return {
      id: candidate.id,
      type: candidate.type,
      title:
        candidate.title ||
        buildElementTitle(candidate.type, cachedData, TYPE_LABELS[candidate.type]),
      data: cachedData,
    };
  }

  if (candidate.title || candidate.data) {
    return {
      id: candidate.id,
      type: candidate.type,
      title: candidate.title || TYPE_LABELS[candidate.type],
      data: candidate.data ?? null,
    };
  }

  return null;
};

const buildPrimaryCandidates = (route: ParsedRoute): ContextCandidate[] => {
  const candidates: ContextCandidate[] = [];

  if (route.documentId) {
    candidates.push({
      id: `document-${route.documentId}`,
      type: "document",
      cacheKeys: [`secondary-document-${route.documentId}`],
    });
  }

  if (route.lessonId) {
    candidates.push({
      id: `lesson-${route.lessonId}`,
      type: "lesson",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-content-${route.lessonId}`
          : `content-${route.lessonId}`,
        `content-${route.lessonId}`,
      ],
    });
  }

  if (route.videoId) {
    candidates.push({
      id: `video-${route.videoId}`,
      type: "video",
      cacheKeys: [`video-${route.videoId}`],
    });
  }

  if (route.exerciseId) {
    candidates.push({
      id: `exercise-${route.exerciseId}`,
      type: "exercise",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-exercise-${route.exerciseId}`
          : `exercise-${route.exerciseId}`,
        `exercise-${route.exerciseId}`,
      ],
    });
  }

  if (route.quizId) {
    candidates.push({
      id: `quiz-${route.quizId}`,
      type: "quiz",
      cacheKeys: [`quiz-${route.quizId}`, `quiz-details-${route.quizId}`],
    });
  }

  if (route.courseId) {
    candidates.push({
      id: `course-${route.courseId}`,
      type: "course",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-course-${route.courseId}`
          : `course-${route.courseId}`,
        `course-${route.courseId}`,
      ],
    });
  }

  if (route.archiveRouteId) {
    candidates.push({
      id: `archive-${route.archiveRouteId}`,
      type: "archive",
      cacheKeys: [
        `archive-${route.archiveRouteId}`,
        `archives/${route.archiveRouteId}`,
        route.archiveRouteId,
      ],
    });
  }

  if (route.isDocumentList && route.programId) {
    candidates.push({
      id: `document-list-${route.programId}`,
      type: "document",
      title: "Document: Documents du programme",
      data: {
        name: "Documents du programme",
        description: "Liste des documents du programme courant.",
      },
    });
  }

  if (route.isExerciseList) {
    const scopeId = route.programId || route.competitionId || route.area;
    candidates.push({
      id: `exercise-list-${scopeId}`,
      type: "exercise",
      title:
        route.area === "manual"
          ? "Exercice: Exercices manuels"
          : "Exercice: Exercices disponibles",
      data: {
        title:
          route.area === "manual" ? "Exercices manuels" : "Exercices disponibles",
        description:
          route.area === "manual"
            ? "Section exercices du manuel. Fonctionnalité en cours de développement."
            : "Liste des exercices disponibles dans ce contexte.",
      },
    });
  }

  if (route.isQuizList) {
    const scopeId = route.programId || route.competitionId || route.area;
    candidates.push({
      id: `quiz-list-${scopeId}`,
      type: "quiz",
      title: route.area === "manual" ? "Quiz: Quiz manuel" : "Quiz: Quiz disponibles",
      data: {
        name: route.area === "manual" ? "Quiz manuel" : "Quiz disponibles",
        description:
          route.area === "manual"
            ? "Section quiz du manuel. Fonctionnalité en cours de développement."
            : "Liste des quiz disponibles dans ce contexte.",
      },
    });
  }

  if (route.isCourseList && route.programId) {
    candidates.push({
      id: `course-list-${route.programId}`,
      type: "course",
      title: "Cours: Cours du programme",
      data: {
        name: "Cours du programme",
        description: "Liste des cours du programme courant.",
      },
    });
  }

  if (route.programId) {
    candidates.push({
      id: `program-${route.programId}`,
      type: "program",
      cacheKeys: [
        route.area === "secondary"
          ? ["secondary-program", route.programId]
          : `program-index-${route.programId}`,
        `program-index-${route.programId}`,
      ],
    });
  }

  if (route.area === "manual" && route.competitionId) {
    candidates.push({
      id: `archive-competition-${route.competitionId}`,
      type: "archive",
      cacheKeys: [
        `/competition/${route.competitionId}`,
        `/archives/competition/${route.competitionId}`,
      ],
      title: "Archive: Archives du concours",
      data: {
        name: "Archives du concours",
      },
    });
  }

  return candidates;
};

const buildSuggestionCandidates = (route: ParsedRoute): ContextCandidate[] => {
  const candidates: ContextCandidate[] = [];

  if (route.programId) {
    candidates.push({
      id: `program-${route.programId}`,
      type: "program",
      cacheKeys: [
        route.area === "secondary"
          ? ["secondary-program", route.programId]
          : `program-index-${route.programId}`,
        `program-index-${route.programId}`,
      ],
    });
  }

  if (route.isCourseList && route.programId) {
    candidates.push({
      id: `course-list-${route.programId}`,
      type: "course",
      title: "Cours: Cours du programme",
      data: {
        name: "Cours du programme",
        description: "Liste des cours du programme courant.",
      },
    });
  }

  if (route.courseId) {
    candidates.push({
      id: `course-${route.courseId}`,
      type: "course",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-course-${route.courseId}`
          : `course-${route.courseId}`,
        `course-${route.courseId}`,
      ],
    });
  }

  if (route.lessonId) {
    candidates.push({
      id: `lesson-${route.lessonId}`,
      type: "lesson",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-content-${route.lessonId}`
          : `content-${route.lessonId}`,
        `content-${route.lessonId}`,
      ],
    });
  }

  if (route.isExerciseList) {
    const scopeId = route.programId || route.competitionId || route.area;
    candidates.push({
      id: `exercise-list-${scopeId}`,
      type: "exercise",
      title:
        route.area === "manual"
          ? "Exercice: Exercices manuels"
          : "Exercice: Exercices disponibles",
      data: {
        title:
          route.area === "manual" ? "Exercices manuels" : "Exercices disponibles",
        description:
          route.area === "manual"
            ? "Section exercices du manuel. Fonctionnalité en cours de développement."
            : "Liste des exercices disponibles dans ce contexte.",
      },
    });
  }

  if (route.exerciseId) {
    candidates.push({
      id: `exercise-${route.exerciseId}`,
      type: "exercise",
      cacheKeys: [
        route.area === "secondary"
          ? `secondary-exercise-${route.exerciseId}`
          : `exercise-${route.exerciseId}`,
        `exercise-${route.exerciseId}`,
      ],
    });
  }

  if (route.isQuizList) {
    const scopeId = route.programId || route.competitionId || route.area;
    candidates.push({
      id: `quiz-list-${scopeId}`,
      type: "quiz",
      title: route.area === "manual" ? "Quiz: Quiz manuel" : "Quiz: Quiz disponibles",
      data: {
        name: route.area === "manual" ? "Quiz manuel" : "Quiz disponibles",
        description:
          route.area === "manual"
            ? "Section quiz du manuel. Fonctionnalité en cours de développement."
            : "Liste des quiz disponibles dans ce contexte.",
      },
    });
  }

  if (route.quizId) {
    candidates.push({
      id: `quiz-${route.quizId}`,
      type: "quiz",
      cacheKeys: [`quiz-${route.quizId}`, `quiz-details-${route.quizId}`],
    });
  }

  if (route.isDocumentList && route.programId) {
    candidates.push({
      id: `document-list-${route.programId}`,
      type: "document",
      title: "Document: Documents du programme",
      data: {
        name: "Documents du programme",
        description: "Liste des documents du programme courant.",
      },
    });
  }

  if (route.documentId) {
    candidates.push({
      id: `document-${route.documentId}`,
      type: "document",
      cacheKeys: [`secondary-document-${route.documentId}`],
    });
  }

  if (route.archiveRouteId) {
    candidates.push({
      id: `archive-${route.archiveRouteId}`,
      type: "archive",
      cacheKeys: [
        `archive-${route.archiveRouteId}`,
        `archives/${route.archiveRouteId}`,
        route.archiveRouteId,
      ],
    });
  } else if (route.area === "manual" && route.competitionId) {
    candidates.push({
      id: `archive-competition-${route.competitionId}`,
      type: "archive",
      cacheKeys: [
        `/competition/${route.competitionId}`,
        `/archives/competition/${route.competitionId}`,
      ],
      title: "Archive: Archives du concours",
      data: {
        name: "Archives du concours",
      },
    });
  }

  if (route.videoId) {
    candidates.push({
      id: `video-${route.videoId}`,
      type: "video",
      cacheKeys: [`video-${route.videoId}`],
    });
  }

  return candidates;
};

const dedupeContextElements = (elements: ContextElement[]) => {
  const seen = new Set<string>();

  return elements.filter((element) => {
    if (seen.has(element.id)) {
      return false;
    }

    seen.add(element.id);
    return true;
  });
};

const getSyntheticContextElementFromStoredId = (
  type: ContextElementType,
  rawId: string
): ContextElement | null => {
  if (rawId === "manual" && type === "quiz") {
    return {
      id: "quiz-manual",
      type,
      title: "Quiz: Quiz manuel",
      data: {
        name: "Quiz manuel",
        description: "Section quiz du manuel. Fonctionnalité en cours de développement.",
      },
    };
  }

  if (rawId === "manual" && type === "exercise") {
    return {
      id: "exercise-manual",
      type,
      title: "Exercice: Exercices manuels",
      data: {
        title: "Exercices manuels",
        description:
          "Section exercices du manuel. Fonctionnalité en cours de développement.",
      },
    };
  }

  if (rawId.startsWith("list-")) {
    const pluralLabel =
      type === "course"
        ? "Cours"
        : type === "quiz"
          ? "Quiz"
          : type === "exercise"
            ? "Exercices"
            : type === "document"
              ? "Documents"
              : `${TYPE_LABELS[type]}s`;

    return {
      id: `${type}-${rawId}`,
      type,
      title: `${TYPE_LABELS[type]}: ${pluralLabel} disponibles`,
      data: {
        title: `${pluralLabel} disponibles`,
        name: `${pluralLabel} disponibles`,
        description: `Liste des ${pluralLabel.toLowerCase()} disponibles dans ce contexte.`,
      },
    };
  }

  if (type === "archive" && rawId.startsWith("competition-")) {
    return {
      id: `archive-${rawId}`,
      type,
      title: "Archive: Archives du concours",
      data: {
        name: "Archives du concours",
      },
    };
  }

  return null;
};

const rehydrateRealContextElement = (
  cache: any,
  type: ContextElementType,
  rawId: string
): ContextElement | null => {
  const cacheKeys: Record<ContextElementType, CacheKey[]> = {
    program: [
      ["secondary-program", rawId],
      `program-index-${rawId}`,
    ],
    course: [`secondary-course-${rawId}`, `course-${rawId}`],
    lesson: [`secondary-content-${rawId}`, `content-${rawId}`],
    exercise: [`secondary-exercise-${rawId}`, `exercise-${rawId}`],
    quiz: [`quiz-${rawId}`, `quiz-details-${rawId}`],
    archive: [`archive-${rawId}`, `archives/${rawId}`, rawId],
    video: [`video-${rawId}`],
    document: [`secondary-document-${rawId}`],
  };

  const data = getFirstCacheData(cache, cacheKeys[type]);
  if (!data) {
    return {
      id: `${type}-${rawId}`,
      type,
      title: `${TYPE_LABELS[type]}: ${rawId}`,
      data: {},
    };
  }

  return {
    id: `${type}-${rawId}`,
    type,
    title: buildElementTitle(type, data, TYPE_LABELS[type]),
    data,
  };
};

export const getContextElementFromCache = (
  pathname: string,
  cache: any
): ContextElement | null => {
  try {
    const route = parseRoute(pathname);
    const candidates = buildPrimaryCandidates(route);

    for (const candidate of candidates) {
      const element = resolveCandidate(cache, candidate);
      if (element) {
        return element;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error getting context from cache:", error);
    return null;
  }
};

export const getSuggestedContextElementsFromCache = (
  pathname: string,
  cache: any,
  currentContextElements: ContextElement[] = []
): ContextElement[] => {
  try {
    const route = parseRoute(pathname);
    const elements = buildSuggestionCandidates(route)
      .map((candidate) => resolveCandidate(cache, candidate))
      .filter((element): element is ContextElement => element !== null);

    return dedupeContextElements(elements).filter(
      (element) => !currentContextElements.some((current) => current.id === element.id)
    );
  } catch (error) {
    logger.error("Error generating suggestions from cache:", error);
    return [];
  }
};

export const rehydrateContextElementsFromIds = (
  cache: any,
  elementIds: string[]
): ContextElement[] => {
  try {
    const elements = elementIds
      .map((elementId) => {
        const [type, ...rawParts] = elementId.split("-");
        const rawId = rawParts.join("-");

        if (!rawId) {
          return null;
        }

        if (!Object.keys(TYPE_LABELS).includes(type)) {
          return null;
        }

        const typedType = type as ContextElementType;

        return (
          getSyntheticContextElementFromStoredId(typedType, rawId) ||
          rehydrateRealContextElement(cache, typedType, rawId)
        );
      })
      .filter((element): element is ContextElement => element !== null);

    return dedupeContextElements(elements);
  } catch (error) {
    logger.error("Error rehydrating context elements:", error);
    return [];
  }
};
