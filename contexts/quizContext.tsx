// contexts/QuizContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuizQuestions, useQuizAttempt, Attempt } from '@/hooks/useQuiz';
import { QuizAttempt, QuizOption, QuizProgress, QuizQuestion, QuizResults } from '@/types/quiz.type';
import { Alert } from 'react-native';
import { QuizService } from '@/services/quiz.service';

type QuizAction = 
    | { type: 'SELECT_ANSWER'; payload: string }
    | { type: 'NEXT_QUESTION' }
    | { type: 'PREVIOUS_QUESTION' }
    | { type: 'SET_TIME'; payload: number }
    | { type: 'SET_QUESTIONS'; payload: QuizQuestion[] }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'SAVE_ANSWER'; payload: { questionId: number; selectedOptions: string[]; isCorrect: boolean; timeSpent: number } }
    | { type: 'UPDATE_ATTEMPT_STATUS'; payload: 'in_progress' | 'completed' }
    | { type: 'RESET_STATE' };

export interface QuizAttemptState {
    currentQuestionIndex: number;
    selectedAnswers: string[];
    questions: QuizQuestion[];
    timeSpent: number;
    answers: Record<number, { selectedOptions: string[]; isCorrect: boolean; timeSpent: number }>;
    status: 'in_progress' | 'completed';
    isSubmitting: boolean;
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
}

const initialState: QuizAttemptState = {
    currentQuestionIndex: 0,
    selectedAnswers: [],
    timeSpent: 0,
    questions: [],
    answers: {},
    status: 'in_progress',
    isSubmitting: false,
};

function quizReducer(state: QuizAttemptState, action: QuizAction): QuizAttemptState {
    switch (action.type) {
        case 'SELECT_ANSWER':
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
            return {
                ...state,
                currentQuestionIndex: state.currentQuestionIndex + 1,
                selectedAnswers: [],
            };

        case 'PREVIOUS_QUESTION':
            return {
                ...state,
                currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
                selectedAnswers: 
                    state.answers[state.currentQuestionIndex - 1]?.selectedOptions || [],
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
                    [state.currentQuestionIndex]: {
                        selectedOptions: action.payload.selectedOptions,
                        isCorrect: action.payload.isCorrect,
                        timeSpent: action.payload.timeSpent,
                    },
                },
            };

        case 'UPDATE_ATTEMPT_STATUS':
            return {
                ...state,
                status: action.payload,
            };

        case 'RESET_STATE':
            return initialState;

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
    const { questions, isLoading: questionsLoading } = useQuizQuestions(quizId);
    const { attempt, isLoading: attemptLoading } = useQuizAttempt(attemptId);




    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            dispatch({ type: 'SET_TIME', payload: state.timeSpent + 1 });
        }, 1000);

        return () => clearInterval(timer);
    }, [state.timeSpent]);

    // Load questions effect
    useEffect(() => {
        if (questions) {
            dispatch({ type: 'SET_QUESTIONS', payload: questions });
        }
    }, [questions]);

    // Update progress in database effect
    useEffect(() => {
        const updateProgress = async () => {
                if(attempt?.status !== "in_progress") {
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
    }, [state.timeSpent, attemptId, state.currentQuestionIndex]);

    const currentQuestion = state.questions[state.currentQuestionIndex];
    const totalQuestions = state.questions.length;

    const handleAnswerSelect = (answer: string) => {
        dispatch({ type: 'SELECT_ANSWER', payload: answer });
    };

    const handleNextQuestion = async () => {
        if(attempt?.status !== "in_progress") { 
            dispatch({ type: 'NEXT_QUESTION' });
            return;
        }

        if (!currentQuestion){
            dispatch({ type: 'NEXT_QUESTION' });
            return;
        }
            

        try {
            dispatch({ type: 'SET_SUBMITTING', payload: true });

            const isCorrect = currentQuestion.correct.every(c => 
                state.selectedAnswers.map(i => String(i)).includes(c)
            ) && state.selectedAnswers.length === currentQuestion.correct.length;

           
            // Save answer in state
            dispatch({
                type: 'SAVE_ANSWER',
                payload: {
                    questionId: currentQuestion.id,
                    selectedOptions: state.selectedAnswers,
                    isCorrect,
                    timeSpent: state.timeSpent,
                },
            });

           

            if (state.currentQuestionIndex < totalQuestions - 1) {
                dispatch({ type: 'NEXT_QUESTION' });
                 // Save to database
            await QuizService.saveAnswer(
                Number(attemptId),
                currentQuestion.id,
                state.selectedAnswers,
                currentQuestion.correct,
                state.timeSpent,
                isCorrect
            );
            } else {
                 // Save to database
            await QuizService.saveAnswer(
                Number(attemptId),
                currentQuestion.id,
                state.selectedAnswers,
                currentQuestion.correct,
                state.timeSpent,
                isCorrect
            );
                // Finish quiz
                const results = await QuizService.finishQuiz(attemptId);
                dispatch({ type: 'UPDATE_ATTEMPT_STATUS', payload: 'completed' });
                return results;
            }
        } catch (error) {
            console.error('Error handling next question:', error);
            Alert.alert('Error', 'Failed to save answer. Please try again.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    };

    const handlePreviousQuestion = () => {
        dispatch({ type: 'PREVIOUS_QUESTION' });
    };

    const resetQuiz = async () => {
        try {
            dispatch({ type: 'SET_SUBMITTING', payload: true });
            await QuizService.resetAttempt(quizId, attempt?.user_id || '');
            dispatch({ type: 'RESET_STATE' });
        } catch (error) {
            console.error('Error resetting quiz:', error);
            Alert.alert('Error', 'Failed to reset quiz. Please try again.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
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
