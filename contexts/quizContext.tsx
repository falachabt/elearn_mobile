// contexts/QuizContext.tsx
import React, {createContext, useContext, useReducer, useEffect, useRef} from 'react';
import {useQuizQuestions, useQuizAttempt, Attempt} from '@/hooks/useQuiz';
import {QuizAttempt, QuizOption, QuizProgress, QuizQuestion, QuizResults} from '@/types/quiz.type';
import {Alert} from 'react-native';
import {QuizService} from '@/services/quiz.service';
import {useRouter} from "expo-router";
import pdId from "@/app/(app)/learn/[pdId]";

type QuizAction =
    | { type: 'SELECT_ANSWER'; payload: string }
    | { type: 'NEXT_QUESTION' }
    | { type: 'PREVIOUS_QUESTION' }
    | { type: 'SET_TIME'; payload: number }
    | { type: 'SET_QUESTIONS'; payload: QuizQuestion[] }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | {
    type: 'SAVE_ANSWER';
    payload: { questionId: number; selectedOptions: string[]; isCorrect: boolean; timeSpent: number }
}
    | { type: 'UPDATE_ATTEMPT_STATUS'; payload: 'in_progress' | 'completed' }
    | { type: 'SET_RESULTS'; payload: Attempt }
    | {
    type: 'LOAD_SAVED_ANSWERS';
    payload: Record<string, { selectedOptions: string[]; isCorrect: boolean; timeSpent: number }>
}
    | { type: 'RESET_SELECTED_ANSWERS' }
    | { type: 'MARK_NEWLY_COMPLETED' }
    | { type: 'RESET_STATE' };

export interface QuizAttemptState {
    currentQuestionIndex: number;
    selectedAnswers: string[];
    questions: QuizQuestion[];
    timeSpent: number;
    // Use question ID (string) as key to match database structure
    answers: Record<string, { selectedOptions: string[]; isCorrect: boolean; timeSpent: number }>;
    status: 'in_progress' | 'completed';
    isSubmitting: boolean;
    newlyCompleted: boolean; // Track if the quiz was just completed
}

interface QuizContextType {
    attempt: QuizAttemptState;
    currentQuestion: QuizQuestion | undefined;
    totalQuestions: number;
    handleAnswerSelect: (answer: string) => void;
    handleNextQuestion: () => Promise<QuizResults | void>;
    handlePreviousQuestion: () => void;
    isLastQuestion: boolean;
    isFirstQuestion: boolean;
    progress: number;
    results: Attempt | undefined,
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
    status: 'in_progress',
    isSubmitting: false,
    newlyCompleted: false,
};

function quizReducer(state: QuizAttemptState, action: QuizAction): QuizAttemptState {
    switch (action.type) {
        case 'SELECT_ANSWER':
            // Don't allow selecting answers if the quiz is completed
            if (state.status === 'completed') {
                return state;
            }

            const currentQuestion = state.questions[state.currentQuestionIndex];
            const isMultipleChoice = currentQuestion?.isMultiple || false;

            const newSelectedAnswers = isMultipleChoice
                ? state.selectedAnswers.includes(action.payload)
                    ? state.selectedAnswers.filter(a => a !== action.payload)
                    : [...state.selectedAnswers, action.payload]
                : [action.payload];

            return {
                ...state,
                selectedAnswers: newSelectedAnswers,
            };

        case 'SET_QUESTIONS':
            return {
                ...state,
                questions: action.payload,
            };

        case 'NEXT_QUESTION':
            const nextQuestion = state.questions[state.currentQuestionIndex + 1];
            const nextQuestionId = nextQuestion?.id.toString();

            // Load saved answers if we have them for the next question and are in review mode
            const nextAnswers = state.status === 'completed' && nextQuestionId && state.answers[nextQuestionId]
                ? state.answers[nextQuestionId].selectedOptions
                : [];

            return {
                ...state,
                currentQuestionIndex: state.currentQuestionIndex + 1,
                selectedAnswers: nextAnswers,
            };

        case 'PREVIOUS_QUESTION':
            const prevQuestion = state.questions[state.currentQuestionIndex - 1];
            const prevQuestionId = prevQuestion?.id.toString();

            // Load saved answers if we have them for the previous question and are in review mode
            const prevAnswers = state.status === 'completed' && prevQuestionId && state.answers[prevQuestionId]
                ? state.answers[prevQuestionId].selectedOptions
                : [];

            return {
                ...state,
                currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
                selectedAnswers: prevAnswers,
            };

        case 'SET_TIME':
            return {
                ...state,
                timeSpent: action.payload,
            };

        case 'SET_SUBMITTING':
            return {
                ...state,
                isSubmitting: action.payload,
            };

        case 'SAVE_ANSWER':
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

        case 'LOAD_SAVED_ANSWERS':
            return {
                ...state,
                answers: action.payload,
            };

        case 'UPDATE_ATTEMPT_STATUS':
            // If transitioning from in_progress to completed, set newlyCompleted to true
            const newlyCompleted = state.status === 'in_progress' && action.payload === 'completed';

            return {
                ...state,
                status: action.payload,
                newlyCompleted: newlyCompleted ? true : state.newlyCompleted,
            };

        case 'MARK_NEWLY_COMPLETED':
            return {
                ...state,
                newlyCompleted: true,
            };

        case 'SET_RESULTS':
            return {
                ...state,
                status: 'completed',
                newlyCompleted: true, // Mark as newly completed when setting results
            };

        case 'RESET_SELECTED_ANSWERS':
            return {
                ...state,
                selectedAnswers: [],
            };

        case 'RESET_STATE':
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
                                 quizId,
                                 attemptId,
                             }: {
    children: React.ReactNode;
    quizId: string;
    attemptId: string;
}) {
    const [state, dispatch] = useReducer(quizReducer, initialState);
    const {questions, isLoading: questionsLoading} = useQuizQuestions(quizId);
    const {attempt, isLoading: attemptLoading} = useQuizAttempt(attemptId);
    const prevAttemptStatus = useRef<'in_progress' | 'completed' | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (attempt) {
            // Check if status changed from in_progress to completed
            const statusChanged = prevAttemptStatus.current === 'in_progress' &&
                attempt.status === 'completed';

            if (statusChanged) {
                dispatch({type: 'MARK_NEWLY_COMPLETED'});
            }

            dispatch({type: 'UPDATE_ATTEMPT_STATUS', payload: attempt.status as 'in_progress' | 'completed'});
            prevAttemptStatus.current = attempt.status as 'in_progress' | 'completed';

            // Load saved answers from attempt for reviewing completed quiz
            if (attempt.status === 'completed' && attempt.answers) {
                try {
                    // Convert to our expected format if needed
                    dispatch({
                        type: 'LOAD_SAVED_ANSWERS',
                        payload: attempt.answers
                    });

                    // If there's a current question, load its saved answers
                    if (state.currentQuestionIndex >= 0 && questions && questions[state.currentQuestionIndex]) {
                        const currentQuestionId = questions[state.currentQuestionIndex].id.toString();
                        if (attempt.answers[currentQuestionId]) {
                            state.selectedAnswers = attempt.answers[currentQuestionId].selectedOptions || [];
                        }
                    }
                } catch (error) {
                    console.error('Error loading saved answers:', error);
                }
            }
        }
    }, [attempt?.status, attempt?.answers, questions]);

    // Timer effect - only run if status is in_progress
    useEffect(() => {
        if (state.status === 'completed' || attempt?.status === 'completed') {
            return;
        }

        const timer = setInterval(() => {
            dispatch({type: 'SET_TIME', payload: state.timeSpent + 1});
        }, 1000);

        return () => clearInterval(timer);
    }, [state.timeSpent, state.status, attempt?.status]);

    // Load questions effect
    useEffect(() => {
        if (questions) {
            dispatch({type: 'SET_QUESTIONS', payload: questions});

            // If there are questions and we're in completed state, load the answers for the current question
            if (state.status === 'completed' && attempt?.answers && questions.length > 0) {
                const currentQuestion = questions[state.currentQuestionIndex];
                if (currentQuestion) {
                    const questionId = currentQuestion.id.toString();
                    if (attempt.answers[questionId]) {
                        state.selectedAnswers = attempt.answers[questionId].selectedOptions || [];
                    }
                }
            }
        }
    }, [questions]);

    // Update progress in database effect
    useEffect(() => {
        const updateProgress = async () => {
            if (state.status !== "in_progress" || attempt?.status !== "in_progress") {
                return;
            }

            if (state.timeSpent % 10 === 0) { // Update every 10 seconds
                try {
                    await QuizService.updateAttemptProgress(
                        Number(attemptId),
                        state.timeSpent,
                        state.currentQuestionIndex
                    );
                } catch (error) {
                    console.error('Error updating progress:', error);
                }
            }
        };

        updateProgress();
    }, [state.timeSpent, attemptId, state.currentQuestionIndex, state.status, attempt?.status]);

    const currentQuestion = state.questions[state.currentQuestionIndex];
    const totalQuestions = state.questions.length;
    const isCompleted = state.status === 'completed' || attempt?.status === 'completed';
    const isNewlyCompleted = state.newlyCompleted;

    const handleAnswerSelect = (answer: string) => {
        if (isCompleted) return;
        dispatch({type: 'SELECT_ANSWER', payload: answer});
    };

    const handleNextQuestion = async () => {
        // Allow navigation through questions when completed
        if (isCompleted) {
            if (state.currentQuestionIndex == totalQuestions - 1) {
                // router.reload()
                router.replace(`/(app)/learn/${pdId}/quizzes/${quizId}`);
            } else {

                dispatch({type: 'NEXT_QUESTION'});
            }
            return;
        }

        if (attempt?.status !== "in_progress") {
            dispatch({type: 'NEXT_QUESTION'});
            return;
        }

        if (!currentQuestion) {
            dispatch({type: 'NEXT_QUESTION'});
            return;
        }

        try {
            // Mark as submitting but allow UI to continue
            dispatch({type: 'SET_SUBMITTING', payload: true});

            const isCorrect = currentQuestion.correct.every(c =>
                state.selectedAnswers.map(i => String(i)).includes(c)
            ) && state.selectedAnswers.length === currentQuestion.correct.length;

            // Save answer in state - using question ID as key
            dispatch({
                type: 'SAVE_ANSWER',
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
                dispatch({type: 'NEXT_QUESTION'});
                // Reset selected answers for the next question
                dispatch({type: 'RESET_SELECTED_ANSWERS'});
            }

            // Save to database in background
            try {
                await QuizService.saveAnswer(
                    Number(attemptId),
                    currentQuestion.id,
                    state.selectedAnswers,
                    currentQuestion.correct,
                    state.timeSpent,
                    isCorrect
                );
            } catch (error) {
                console.error('Error saving answer:', error);
                // Don't block UI even if save fails
            }

            // If this is the last question, finish the quiz
            if (isFinishing) {
                try {
                    const results = await QuizService.finishQuiz(attemptId);
                    dispatch({type: 'UPDATE_ATTEMPT_STATUS', payload: 'completed'});
                    dispatch({type: 'SET_RESULTS', payload: results});
                    return results;
                } catch (error) {
                    console.error('Error finishing quiz:', error);
                    Alert.alert('Error', 'Failed to submit quiz. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error handling next question:', error);
            Alert.alert('Error', 'Failed to process answer. Please try again.');
        } finally {
            dispatch({type: 'SET_SUBMITTING', payload: false});
        }
    };

    const handlePreviousQuestion = () => {
        dispatch({type: 'PREVIOUS_QUESTION'});
    };

    const resetQuiz = async () => {
        try {
            dispatch({type: 'SET_SUBMITTING', payload: true});

            try {
                await QuizService.resetAttempt(quizId, attempt?.user_id || '');
            } catch (error) {
                console.error('Error resetting quiz on server:', error);
                Alert.alert('Error', 'Failed to reset quiz on server. Please try again.');
                return;
            }

            // Reset state completely to ensure all old data is cleared
            dispatch({type: 'RESET_STATE'});
        } catch (error) {
            console.error('Error resetting quiz:', error);
            Alert.alert('Error', 'Failed to reset quiz. Please try again.');
        } finally {
            dispatch({type: 'SET_SUBMITTING', payload: false});
        }
    };

    const value = {
        attempt: state,
        currentQuestion,
        totalQuestions,
        handleAnswerSelect,
        handleNextQuestion,
        handlePreviousQuestion,
        isLastQuestion: state.currentQuestionIndex === totalQuestions - 1,
        isFirstQuestion: state.currentQuestionIndex === 0,
        progress: ((state.currentQuestionIndex + 1) / totalQuestions) * 100,
        results: attempt,
        resetQuiz,
        isCompleted,
        isNewlyCompleted,
    };

    if (questionsLoading || attemptLoading) {
        return null;
    }

    return (
        <QuizContext.Provider value={value}>
            {children}
        </QuizContext.Provider>
    );
}

export function useQuizContext() {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error('useQuizContext must be used within a QuizProvider');
    }
    return context;
}