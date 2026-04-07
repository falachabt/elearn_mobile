// contexts/QuizContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Alert } from "react-native";
import {
  Href,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import useSWR from "swr";
import { mutate as swrGlobalMutate } from "swr";

import { useQuizQuestions, useQuizAttempt, Attempt } from "@/hooks/useQuiz";
import { QuizAnswerState, QuizQuestion, QuizResults } from "@/types/quiz.type";
import { QuizService } from "@/services/quiz.service";
import { Quiz } from "@/types/type";
import { useNavigation } from "@/contexts/NavigationContext";
import { posthogService } from "@/utils/posthogService";
import { logger } from "@/utils/logger";

type QuizAnswerMap = Record<string, QuizAnswerState>;

type QuizWithPassingScore = Quiz & {
  passing_score?: number | null;
};

const invalidateSecondaryDailyCaches = () =>
  void swrGlobalMutate(
    (key: unknown) =>
      Array.isArray(key) &&
      typeof key[0] === "string" &&
      (key[0] === "secondary-daily-content" ||
        key[0] === "secondary-daily-content-programs" ||
        key[0] === "secondary-daily-quiz-leaderboard"),
    undefined,
    { revalidate: true },
  );

const invalidateQuizAttemptCaches = () =>
  void swrGlobalMutate(
    (key: unknown) =>
      (typeof key === "string" &&
        (key.startsWith("quiz-attempts-") ||
          key.startsWith("quiz-pins-") ||
          key.startsWith("quiz-progress-") ||
          key.startsWith("secondary-quiz-progress-") ||
          key.startsWith("quiz-attempt-"))) ||
      (Array.isArray(key) &&
        typeof key[0] === "string" &&
        key[0] === "quiz-attempts"),
    undefined,
    { revalidate: true },
  );

const isQuizAnswerState = (value: unknown): value is QuizAnswerState => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<QuizAnswerState>;
  return (
    Array.isArray(candidate.selectedOptions) &&
    typeof candidate.isCorrect === "boolean" &&
    typeof candidate.timeSpent === "number"
  );
};

const parseAttemptAnswers = (value: unknown): QuizAnswerMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<QuizAnswerMap>(
    (acc, [questionId, answer]) => {
      if (isQuizAnswerState(answer)) {
        acc[questionId] = answer;
      }
      return acc;
    },
    {},
  );
};

type QuizAction =
  | { type: "SELECT_ANSWER"; payload: string }
  | { type: "NEXT_QUESTION" }
  | { type: "PREVIOUS_QUESTION" }
  | { type: "SET_TIME"; payload: number }
  | { type: "SET_QUESTIONS"; payload: QuizQuestion[] }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | {
      type: "SAVE_ANSWER";
      payload: {
        questionId: number;
        selectedOptions: string[];
        isCorrect: boolean;
        timeSpent: number;
      };
    }
  | { type: "UPDATE_ATTEMPT_STATUS"; payload: "in_progress" | "completed" }
  | { type: "SET_RESULTS"; payload: Attempt }
  | {
      type: "LOAD_SAVED_ANSWERS";
      payload: QuizAnswerMap;
    }
  | { type: "SET_SELECTED_ANSWERS"; payload: string[] }
  | { type: "RESET_SELECTED_ANSWERS" }
  | { type: "MARK_NEWLY_COMPLETED" }
  | { type: "RESET_STATE" }
  | {
      type: "RESTORE_PROGRESS";
      payload: {
        questionIndex: number;
        timeSpent: number;
        answers: QuizAnswerMap;
      };
    };

export interface QuizAttemptState {
  currentQuestionIndex: number;
  selectedAnswers: string[];
  questions: QuizQuestion[];
  timeSpent: number;
  // Use question ID (string) as key to match database structure
  answers: QuizAnswerMap;
  status: "in_progress" | "completed";
  isSubmitting: boolean;
  newlyCompleted: boolean; // Track if the quiz was just completed
}

interface QuizContextType {
  attempt: QuizAttemptState;
  currentQuestion: QuizQuestion | undefined;
  quizId: string;
  attemptId: string;
  pdId: string;
  quiz: QuizWithPassingScore | null | undefined;
  totalQuestions: number;
  handleAnswerSelect: (answer: string) => void;
  handleNextQuestion: () => Promise<QuizResults | void>;
  handlePreviousQuestion: () => void;
  handleSaveJustification: (justification: string) => Promise<void>;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
  progress: number;
  results: Attempt | undefined;
  resetQuiz: () => Promise<void>;
  isCompleted: boolean;
  isNewlyCompleted: boolean; // Expose the newly completed state
}

const initialState: QuizAttemptState = {
  currentQuestionIndex: 0,
  selectedAnswers: [],
  timeSpent: 0,
  questions: [],
  answers: {},
  status: "in_progress",
  isSubmitting: false,
  newlyCompleted: false,
};

function quizReducer(
  state: QuizAttemptState,
  action: QuizAction,
): QuizAttemptState {
  switch (action.type) {
    case "SELECT_ANSWER":
      // Don't allow selecting answers if the quiz is completed
      if (state.status === "completed") {
        return state;
      }

      const currentQuestion = state.questions[state.currentQuestionIndex];
      const isMultipleChoice = currentQuestion?.isMultiple || false;

      const newSelectedAnswers = isMultipleChoice
        ? state.selectedAnswers.includes(action.payload)
          ? state.selectedAnswers.filter((a) => a !== action.payload)
          : [...state.selectedAnswers, action.payload]
        : [action.payload];

      return {
        ...state,
        selectedAnswers: newSelectedAnswers,
      };

    case "SET_QUESTIONS":
      return {
        ...state,
        questions: action.payload,
      };

    case "NEXT_QUESTION":
      const nextQuestion = state.questions[state.currentQuestionIndex + 1];
      const nextQuestionId = nextQuestion?.id.toString();

      // Load saved answers if we have them for the next/prev question (review mode ou question déjà répondue)
      const nextAnswers =
        nextQuestionId && state.answers[nextQuestionId]
          ? state.answers[nextQuestionId].selectedOptions
          : [];

      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswers: nextAnswers,
      };

    case "PREVIOUS_QUESTION":
      const prevQuestion = state.questions[state.currentQuestionIndex - 1];
      const prevQuestionId = prevQuestion?.id.toString();

      // Load saved answers if we have them for the previous question (review mode ou question déjà répondue)
      const prevAnswers =
        prevQuestionId && state.answers[prevQuestionId]
          ? state.answers[prevQuestionId].selectedOptions
          : [];

      return {
        ...state,
        currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
        selectedAnswers: prevAnswers,
      };

    case "SET_TIME":
      return {
        ...state,
        // -1 = signal d'incrément (évite de capturer timeSpent dans le useEffect)
        timeSpent: action.payload === -1 ? state.timeSpent + 1 : action.payload,
      };

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case "SAVE_ANSWER":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId.toString()]: {
            selectedOptions: action.payload.selectedOptions,
            isCorrect: action.payload.isCorrect,
            timeSpent: action.payload.timeSpent,
          },
        },
      };

    case "LOAD_SAVED_ANSWERS":
      return {
        ...state,
        answers: action.payload,
      };

    case "SET_SELECTED_ANSWERS":
      return {
        ...state,
        selectedAnswers: action.payload,
      };

    case "UPDATE_ATTEMPT_STATUS":
      // If transitioning from in_progress to completed, set newlyCompleted to true
      const newlyCompleted =
        state.status === "in_progress" && action.payload === "completed";

      return {
        ...state,
        status: action.payload,
        newlyCompleted: newlyCompleted ? true : state.newlyCompleted,
      };

    case "MARK_NEWLY_COMPLETED":
      return {
        ...state,
        newlyCompleted: true,
      };

    case "SET_RESULTS":
      return {
        ...state,
        status: "completed",
        newlyCompleted: true, // Mark as newly completed when setting results
      };

    case "RESET_SELECTED_ANSWERS":
      return {
        ...state,
        selectedAnswers: [],
      };

    case "RESTORE_PROGRESS":
      return {
        ...state,
        currentQuestionIndex: action.payload.questionIndex,
        timeSpent: action.payload.timeSpent,
        answers: action.payload.answers,
      };

    case "RESET_STATE":
      return {
        ...initialState,
        questions: state.questions, // Keep loaded questions
      };

    default:
      return state;
  }
}

const QuizContext = createContext<QuizContextType | null>(null);

export function QuizProvider({
  children,
  attemptId,
}: {
  children: React.ReactNode;
  quizId: string;
  attemptId: string;
}) {
  const params = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const navigation = useNavigation();
  // Support both pdId (learn) and programId (secondary)
  const programId = String(globalParams.pdId || globalParams.programId || "");
  const pdId = programId; // Keep pdId as alias for backward compatibility
  const quizId = params.quizId ? String(params.quizId) : undefined;
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const [results, setResults] = React.useState<Attempt | undefined>(undefined);
  const { questions } = useQuizQuestions(quizId);
  const { attempt } = useQuizAttempt(attemptId);
  const prevAttemptStatus = useRef<"in_progress" | "completed" | null>(null);
  const progressRestoredRef = useRef(false);
  const selectedAnswersRestoredRef = useRef(false);
  const router = useRouter();
  const { data: quiz } = useSWR<QuizWithPassingScore | null>(
    `/api/quizzes/${quizId}`,
    async () => {
      return (await QuizService.getQuizById(
        String(quizId),
      )) as QuizWithPassingScore | null;
    },
  );
  const savedAnswers = useMemo(
    () => parseAttemptAnswers(attempt?.answers),
    [attempt?.answers],
  );

  useEffect(() => {
    if (attempt) {
      // Restaurer la progression une seule fois au chargement initial
      if (!progressRestoredRef.current && attempt.status === "in_progress") {
        progressRestoredRef.current = true;
        const restoredIndex = attempt.current_question_index ?? 0;
        const restoredTime = attempt.timeSpent ?? 0;
        if (
          restoredIndex > 0 ||
          restoredTime > 0 ||
          Object.keys(savedAnswers).length > 0
        ) {
          dispatch({
            type: "RESTORE_PROGRESS",
            payload: {
              questionIndex: restoredIndex,
              timeSpent: restoredTime,
              answers: savedAnswers,
            },
          });
          // Restaurer les réponses sélectionnées pour la question courante
          if (questions && questions[restoredIndex]) {
            selectedAnswersRestoredRef.current = true;
            const currentQId = questions[restoredIndex].id.toString();
            if (savedAnswers[currentQId]) {
              dispatch({
                type: "SET_SELECTED_ANSWERS",
                payload: savedAnswers[currentQId].selectedOptions || [],
              });
            }
          }
        }
      }

      // Check if status changed from in_progress to completed
      const statusChanged =
        prevAttemptStatus.current === "in_progress" &&
        attempt.status === "completed";

      if (statusChanged) {
        dispatch({ type: "MARK_NEWLY_COMPLETED" });
      }

      dispatch({
        type: "UPDATE_ATTEMPT_STATUS",
        payload: attempt.status as "in_progress" | "completed",
      });
      prevAttemptStatus.current = attempt.status as "in_progress" | "completed";

      // Load saved answers from attempt for reviewing completed quiz
      if (attempt.status === "completed") {
        try {
          setResults(attempt);
          dispatch({
            type: "LOAD_SAVED_ANSWERS",
            payload: savedAnswers,
          });

          // If there's a current question, load its saved answers
          if (
            state.currentQuestionIndex >= 0 &&
            questions &&
            questions[state.currentQuestionIndex]
          ) {
            const currentQuestionId =
              questions[state.currentQuestionIndex].id.toString();
            if (savedAnswers[currentQuestionId]) {
              dispatch({
                type: "SET_SELECTED_ANSWERS",
                payload: savedAnswers[currentQuestionId].selectedOptions || [],
              });
            }
          }
        } catch (error) {
          logger.error("Error loading saved answers:", error);
        }
      }
    }
  }, [attempt, questions, state.currentQuestionIndex]); 

  // Timer effect - only run if status is in_progress
  useEffect(() => {
    if (state.status === "completed" || attempt?.status === "completed") {
      return;
    }

    const timer = setInterval(() => {
      dispatch({ type: "SET_TIME", payload: -1 }); // -1 = signal d'incrément
    }, 1000);

    return () => clearInterval(timer);
  }, [state.status, attempt?.status]);

  // Load questions effect
  useEffect(() => {
    if (questions) {
      dispatch({ type: "SET_QUESTIONS", payload: questions });

      // Track quiz started when questions load and status is in_progress
      if (
        state.status === "in_progress" &&
        quiz &&
        questions.length > 0 &&
        state.currentQuestionIndex === 0
      ) {
        posthogService.trackQuizStarted(
          quizId ?? "",
          quiz.name || "Untitled Quiz",
          questions.length,
        );
      }

      // Restaurer selectedAnswers pour la question courante si les questions ont chargé après la progression
      if (
        state.status === "in_progress" &&
        questions.length > 0 &&
        progressRestoredRef.current &&
        !selectedAnswersRestoredRef.current
      ) {
        selectedAnswersRestoredRef.current = true;
        const currentQuestion = questions[state.currentQuestionIndex];
        if (currentQuestion) {
          const questionId = currentQuestion.id.toString();
          if (savedAnswers[questionId]) {
            dispatch({
              type: "SET_SELECTED_ANSWERS",
              payload: savedAnswers[questionId].selectedOptions || [],
            });
          }
        }
      }

      // If there are questions and we're in completed state, load the answers for the current question
      if (state.status === "completed" && questions.length > 0) {
        const currentQuestion = questions[state.currentQuestionIndex];
        if (currentQuestion) {
          const questionId = currentQuestion.id.toString();
          if (savedAnswers[questionId]) {
            dispatch({
              type: "SET_SELECTED_ANSWERS",
              payload: savedAnswers[questionId].selectedOptions || [],
            });
          }
        }
      }
    }
  }, [
    attempt?.status,
    questions,
    state.currentQuestionIndex,
    state.status,
    quiz,
    quizId,
  ]); 

  // Update progress in database effect
  useEffect(() => {
    const updateProgress = async () => {
      if (state.status !== "in_progress" || attempt?.status !== "in_progress") {
        return;
      }

      if (state.timeSpent % 10 === 0) {
        // Update every 10 seconds
        try {
          await QuizService.updateAttemptProgress(
            Number(attemptId),
            state.timeSpent,
            state.currentQuestionIndex,
          );
        } catch (error) {
          logger.error("Error updating progress:", error);
        }
      }
    };

    updateProgress();
  }, [
    state.timeSpent,
    attemptId,
    state.currentQuestionIndex,
    state.status,
    attempt?.status,
  ]);

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const totalQuestions = state.questions.length;
  const isCompleted =
    state.status === "completed" || attempt?.status === "completed";
  const isNewlyCompleted = state.newlyCompleted;

  const handleAnswerSelect = (answer: string) => {
    if (isCompleted) return;
    dispatch({ type: "SELECT_ANSWER", payload: answer });
  };

  const handleNextQuestion = async () => {
    // Allow navigation through questions when completed
    if (isCompleted) {
      if (state.currentQuestionIndex == totalQuestions - 1) {
        router.replace(navigation.getQuizPath(String(quizId)) as Href);
      } else {
        dispatch({ type: "NEXT_QUESTION" });
      }
      return;
    }

    if (attempt?.status !== "in_progress") {
      dispatch({ type: "NEXT_QUESTION" });
      return;
    }

    if (!currentQuestion) {
      dispatch({ type: "NEXT_QUESTION" });
      return;
    }

    try {
      // Mark as submitting but allow UI to continue
      dispatch({ type: "SET_SUBMITTING", payload: true });

      const isCorrect =
        currentQuestion.correct.every((c) =>
          state.selectedAnswers.map((i) => String(i)).includes(c),
        ) && state.selectedAnswers.length === currentQuestion.correct.length;

      // Save answer in state - using question ID as key
      dispatch({
        type: "SAVE_ANSWER",
        payload: {
          questionId: currentQuestion.id,
          selectedOptions: state.selectedAnswers,
          isCorrect,
          timeSpent: state.timeSpent,
        },
      });

      // If this is the last question and we're submitting, we'll finish the quiz
      const isFinishing = state.currentQuestionIndex === totalQuestions - 1;

      // Move to next question immediately for better UX
      if (!isFinishing) {
        dispatch({ type: "NEXT_QUESTION" });
        // Reset selected answers for the next question
        dispatch({ type: "RESET_SELECTED_ANSWERS" });
      }

      // Save to database in background
      try {
        await QuizService.saveAnswer(
          Number(attemptId),
          currentQuestion.id,
          state.selectedAnswers,
          currentQuestion.correct,
          state.timeSpent,
          isCorrect,
        );

        // Track question answered
        posthogService.trackQuizQuestionAnswered(
          quizId ?? "",
          String(currentQuestion.id),
          isCorrect,
          state.timeSpent,
        );
      } catch (error) {
        logger.error("Error saving answer:", error);
        // Don't block UI even if save fails
      }

      // If this is the last question, finish the quiz
      if (isFinishing) {
        try {
          const quizResults = await QuizService.finishQuiz(attemptId);
          const completedAttempt = attempt
            ? ({
                ...attempt,
                status: "completed",
                score: quizResults.score,
                end_time: quizResults.completedAt,
                timeSpent: quizResults.timeSpent,
                current_question_index: state.currentQuestionIndex,
                answers: state.answers,
              } as unknown as Attempt)
            : undefined;

          dispatch({ type: "UPDATE_ATTEMPT_STATUS", payload: "completed" });
          if (completedAttempt) {
            setResults(completedAttempt);
            dispatch({ type: "SET_RESULTS", payload: completedAttempt });
          }

          if (
            attempt?.program_id ||
            attempt?.daily_content_item_id
          ) {
            invalidateSecondaryDailyCaches();
          }
          invalidateQuizAttemptCaches();

          // Track quiz completed
          if (quiz) {
            const score = quizResults.score || 0;
            const passed = score >= (quiz.passing_score || 50);
            posthogService.trackQuizCompleted(
              quizId ?? "",
              score,
              totalQuestions,
              state.timeSpent,
              passed,
            );
          }

          return quizResults;
        } catch (error) {
          logger.error("Error finishing quiz:", error);
          Alert.alert("Error", "Failed to submit quiz. Please try again.");
        }
      }
    } catch (error) {
      logger.error("Error handling next question:", error);
      Alert.alert("Error", "Failed to process answer. Please try again.");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  const handlePreviousQuestion = () => {
    dispatch({ type: "PREVIOUS_QUESTION" });
  };

  const handleSaveJustification = async (justification: string) => {
    if (!currentQuestion) return;

    try {
      await QuizService.saveJustification(currentQuestion.id, justification);
    } catch (error) {
      logger.error("Error saving justification:", error);
      Alert.alert("Error", "Failed to save justification. Please try again.");
    }
  };

  const resetQuiz = async () => {
    try {
      dispatch({ type: "SET_SUBMITTING", payload: true });

      try {
        await QuizService.resetAttempt(quizId ?? "", attempt?.user_id || "", {
          programId: attempt?.program_id ?? null,
          dailyContentItemId: attempt?.daily_content_item_id ?? null,
        });
      } catch (error) {
        logger.error("Error resetting quiz on server:", error);
        Alert.alert(
          "Error",
          "Failed to reset quiz on server. Please try again.",
        );
        return;
      }

      // Reset state completely to ensure all old data is cleared
      dispatch({ type: "RESET_STATE" });
      invalidateQuizAttemptCaches();

      if (attempt?.program_id || attempt?.daily_content_item_id) {
        invalidateSecondaryDailyCaches();
      }
    } catch (error) {
      logger.error("Error resetting quiz:", error);
      Alert.alert("Error", "Failed to reset quiz. Please try again.");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  const value = {
    attempt: state,
    currentQuestion,
    totalQuestions,
    handleAnswerSelect,
    handleNextQuestion,
    handlePreviousQuestion,
    handleSaveJustification,
    isLastQuestion: state.currentQuestionIndex === totalQuestions - 1,
    isFirstQuestion: state.currentQuestionIndex === 0,
    progress: ((state.currentQuestionIndex + 1) / totalQuestions) * 100,
    results,
    resetQuiz,
    quizId: quizId ?? "",
    attemptId,
    pdId,
    quiz,
    isCompleted,
    isNewlyCompleted,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuizContext() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuizContext must be used within a QuizProvider");
  }
  return context;
}
