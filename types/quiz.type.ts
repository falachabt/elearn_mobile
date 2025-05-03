// types/quiz.ts

export interface QuizQuestion {
    justificatif: string;
    id: number;
    title: string;
    content: any;
    last_modify_at: Date | null;
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
    image: any | null;
    details: any[] | null;
  }
  
  export interface QuizOption {
    id: string;
    value: string;
  }
  
  export interface QuizAttempt {
    id: number;
    user_id: string;
    quiz_id: string;
    start_time: Date;
    end_time?: Date;
    score?: number;
    status: 'in_progress' | 'completed';
    answers?: UserAnswer[];
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
    quizId: string;
    userId: string;
    score: number;
    status: 'failed' | 'passed' | 'completed' | 'in_progress';
    completedAt: Date;
    timeSpent: number;
    xpGained: number;
  }