import type { Json } from "./supabase";

export interface QuizQuestion {
    justificatif: string;
    id: number;
    title: string;
    content: Json;
    last_modify_at: string | null;
    name: string | null;
    order: number | null;
    quizId: string;
    type: string | null;
    options: QuizOption[];
    correct: string[];
    isMultiple: boolean;
    hasImg: boolean;
    hasEditor: boolean;
    hasDetails: boolean;
    image: Json | null;
    details: Json[] | null;
  }
  
  export interface QuizOption {
      isCorrect: boolean | null;
    id: string;
    value: string;
  }
  
  export interface QuizAnswerState {
    selectedOptions: string[];
    isCorrect: boolean;
    timeSpent: number;
  }

  export interface QuizAttempt {
    id: number;
    user_id: string | null;
    quiz_id: string | null;
    start_time: string | null;
    end_time?: string | null;
    score?: number | null;
    status: 'in_progress' | 'completed' | string | null;
    answers?: Record<string, QuizAnswerState> | null;
    current_question_index?: number | null;
    timeSpent?: number | null;
  }
  
  export interface UserAnswer {
    id?: number;
    attempt_id: number;
    question_id: number;
    selected_option: string[];
    is_correct: boolean;
  }
  
  export interface QuizProgress {
    currentQuestionIndex: number;
    timeSpent: number;
    answers: Record<number, {
      questionId: number;
      selectedOptions: string[];
      isCorrect: boolean;
      timeSpent: number;
    }>;
  }
  
  export interface QuizResults {
    attemptId: string;
    attempt: QuizAttempt;
    totalQuestions: number;
    correctAnswers: number;
    quizId: string | null;
    userId: string | null;
    score: number;
    status: 'failed' | 'passed' | 'completed' | 'in_progress';
    completedAt: string;
    timeSpent: number;
    xpGained: number;
  }
