import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
import { QuizAttempt, QuizResults, type QuizAnswerState } from '@/types/quiz.type';

type QuizRecord = Database['public']['Tables']['quiz']['Row'];
type QuizAttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];
type QuizAttemptContext = {
  programId?: string | null;
  dailyContentItemId?: string | null;
};
type QuizAttemptInsertClient = {
  from: (table: 'quiz_attempts') => {
    insert: (values: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{
          data: QuizAttemptRow | null;
          error: Error | null;
        }>;
      };
    };
  };
};

const isQuizAnswerState = (value: unknown): value is QuizAnswerState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, Json | undefined>;
  return (
    Array.isArray(candidate.selectedOptions) &&
    typeof candidate.isCorrect === 'boolean' &&
    typeof candidate.timeSpent === 'number'
  );
};

const parseAnswers = (
  answers: Json | null
): Record<string, QuizAnswerState> | null => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return null;
  }

  const entries = Object.entries(answers);
  const parsed = entries.reduce<Record<string, QuizAnswerState>>((acc, [key, value]) => {
    if (isQuizAnswerState(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return Object.keys(parsed).length > 0 ? parsed : {};
};

const mapAttempt = (attempt: QuizAttemptRow): QuizAttempt => ({
  id: attempt.id,
  user_id: attempt.user_id,
  quiz_id: attempt.quiz_id,
  program_id: (attempt as QuizAttemptRow & { program_id?: string | null }).program_id ?? null,
  daily_content_item_id:
    (attempt as QuizAttemptRow & { daily_content_item_id?: string | null }).daily_content_item_id ?? null,
  start_time: attempt.start_time,
  end_time: attempt.end_time,
  score: attempt.score,
  status: attempt.status,
  answers: parseAnswers(attempt.answers),
  current_question_index: attempt.current_question_index,
  timeSpent: attempt.timeSpent,
});

// TODO - on database increment the user total_xp
export class QuizService {
  static async getQuizById(quizId: string): Promise<QuizRecord | null> {
    if (!quizId) {
      return null;
    }

    const { data, error } = await supabase
      .from('quiz')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data;
  }

  static async createAttempt(
    quizId: string,
    userId: string,
    context?: QuizAttemptContext
  ): Promise<QuizAttempt> {
    const quizAttemptClient = supabase as unknown as QuizAttemptInsertClient;

    const { data, error } = await quizAttemptClient
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        program_id: context?.programId ?? null,
        daily_content_item_id: context?.dailyContentItemId ?? null,
        user_id: userId,
        start_time: new Date().toISOString(),
        status: 'in_progress',
        timeSpent: 0,
        current_question_index: 0,
        selected_answers: [],
        answers: {},
      })
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('Failed to create quiz attempt');
    }
    return mapAttempt(data);
  }

  static async saveAnswer(
    attemptId: number,
    questionId: number,
    selectedOptions: string[],
    _correctOptions: string[],
    timeSpent: number,
    isCorrect: boolean
  ) {
    try {
      const { error: answerError } = await supabase
        .from('user_answers')
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_options: selectedOptions,
          is_correct: isCorrect,
          time_taken: timeSpent,
        });

      if (answerError) throw answerError;

      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('answers, current_question_index')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        throw attemptError ?? new Error('Attempt not found');
      }

      const updatedAnswers: Record<string, QuizAnswerState> = {
        ...(parseAnswers(attempt.answers) ?? {}),
        [String(questionId)]: {
          selectedOptions,
          isCorrect,
          timeSpent,
        },
      };

      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          answers: updatedAnswers as unknown as Json,
          current_question_index: (attempt.current_question_index ?? 0) + 1,
          timeSpent,
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      return isCorrect;
    } catch (error) {
      logger.error('Error saving answer:', error);
      throw error;
    }
  }

  static async updateAttemptProgress(
    attemptId: number,
    timeSpent: number,
    currentQuestionIndex: number
  ) {
    const { error } = await supabase
      .from('quiz_attempts')
      .update({
        timeSpent,
        current_question_index: currentQuestionIndex,
      })
      .eq('id', attemptId);

    if (error) throw error;
  }

  static async finishQuiz(attemptId: string): Promise<QuizResults> {
    try {
      const numericAttemptId = Number(attemptId);
      if (Number.isNaN(numericAttemptId)) {
        throw new Error('Invalid attempt ID');
      }

      const { data: attemptRow, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', numericAttemptId)
        .single();

      if (attemptError || !attemptRow) {
        throw attemptError ?? new Error('Attempt not found');
      }

      const attempt = mapAttempt(attemptRow);
      const answers = Object.values(attempt.answers ?? {});
      const totalQuestions = answers.length;
      const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      const baseXP = 100;
      const scoreMultiplier = score / 100;
      const timeBonus = Math.max(0, 1 - ((attempt.timeSpent ?? 0) / Math.max(totalQuestions, 1) / 60));
      const xpGained = Math.round(baseXP * scoreMultiplier * (1 + timeBonus));

      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          status: 'completed',
          score,
          end_time: new Date().toISOString(),
        })
        .eq('id', numericAttemptId);

      if (updateError) throw updateError;

      if (attempt.user_id && attempt.quiz_id) {
        const { error: xpError } = await supabase
          .from('xp_history')
          .insert({
            userid: attempt.user_id,
            xp_gained: xpGained,
            source_type: 'quiz',
            source_id: attempt.quiz_id,
            quiz_id: attempt.quiz_id,
          });

        if (xpError) throw xpError;
      }

      return {
        attemptId,
        attempt: {
          ...attempt,
          end_time: new Date().toISOString(),
          score,
          status: 'completed',
        },
        quizId: attempt.quiz_id,
        userId: attempt.user_id,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent: attempt.timeSpent ?? 0,
        xpGained,
        status: score >= 70 ? 'passed' : 'failed',
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error finishing quiz:', error);
      throw error;
    }
  }

  static async getAttemptStatus(attemptId: number) {
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, status, score, timeSpent, current_question_index')
      .eq('id', attemptId)
      .single();

    if (error || !attempt) throw error ?? new Error('Attempt not found');

    const [{ count: answeredQuestions, error: answersError }, { count: totalQuestions, error: questionsError }] =
      await Promise.all([
        supabase
          .from('user_answers')
          .select('*', { count: 'exact', head: true })
          .eq('attempt_id', attemptId),
        supabase
          .from('quiz_questions')
          .select('*', { count: 'exact', head: true })
          .eq('quizId', attempt.quiz_id ?? ''),
      ]);

    if (answersError) throw answersError;
    if (questionsError) throw questionsError;

    const total = totalQuestions ?? 0;
    const answered = answeredQuestions ?? 0;

    return {
      attemptId: attempt.id,
      status: attempt.status,
      progress: total > 0 ? (answered / total) * 100 : 0,
      timeSpent: attempt.timeSpent ?? 0,
      currentQuestionIndex: attempt.current_question_index,
      score: attempt.score,
      isCompleted: attempt.status === 'completed',
    };
  }

  static async resetAttempt(
    quizId: string,
    userId: string,
    context?: QuizAttemptContext
  ) {
    try {
      const { data: previousAttempt } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .single();

      if (previousAttempt) {
        await supabase
          .from('quiz_attempts')
          .delete()
          .eq('id', previousAttempt.id);
      }

      return await this.createAttempt(quizId, userId, context);
    } catch (error) {
      logger.error('Error resetting attempt:', error);
      throw error;
    }
  }

  static async saveJustification(questionId: number, justification: string) {
    const { error } = await supabase
      .from('quiz_questions')
      .update({
        justificatif: justification,
      })
      .eq('id', questionId);

    if (error) throw error;
  }
}
