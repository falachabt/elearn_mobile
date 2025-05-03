// services/quizService.ts
import { supabase } from '@/lib/supabase';
import { QuizQuestion, QuizAttempt, QuizResults } from '@/types/quiz.type';



// TODO - on database increment the user total_xp
export class QuizService {
    /**
     * Create a new quiz attempt
     */
    static async createAttempt(quizId: string, userId: string): Promise<QuizAttempt> {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .insert({
                quiz_id: quizId,
                user_id: userId,
                start_time: new Date().toISOString(),
                status: 'in_progress',
                timeSpent: 0,
                current_question_index :0,
                selectedAnswers: [],
                answers: {}
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Save user's answer for current question
     */
    static async saveAnswer(
        attemptId: number,
        questionId: number,
        selectedOptions: string[],
        correctOptions: string[],
        timeSpent: number,
        isCorrect: boolean
    ) {
        try {

            // Save user answer
            const { error: answerError } = await supabase
                .from('user_answers')
                .insert({
                    attempt_id: attemptId,
                    question_id: questionId,
                    selected_options: selectedOptions,
                    is_correct: isCorrect,
                    time_taken: timeSpent
                });

            if (answerError) throw answerError;

            // Update attempt progress
            const { data: attempt } = await supabase
                .from('quiz_attempts')
                .select('answers, current_question_index')
                .eq('id', attemptId)
                .single();

            if (!attempt) {
                throw new Error('Attempt not found');
            }

            const updatedAnswers = {
                ...attempt.answers,
                [questionId]: {
                    selectedOptions,
                    isCorrect,
                    timeSpent
                }
            };

            const { error: updateError } = await supabase
                .from('quiz_attempts')
                .update({
                    answers: updatedAnswers,
                    current_question_index: attempt.current_question_index + 1,
                    timeSpent: timeSpent
                })
                .eq('id', attemptId);

            if (updateError) throw updateError;

            return isCorrect;
        } catch (error) {
            console.error('Error saving answer:', error);
            throw error;
        }
    }

    /**
     * Update attempt progress (time spent, current question)
     */
    static async updateAttemptProgress(
        attemptId: number,
        timeSpent: number,
        currentQuestionIndex: number
    ) {
        const { error } = await supabase
            .from('quiz_attempts')
            .update({
                timeSpent,
                current_question_index: currentQuestionIndex
            })
            .eq('id', attemptId);

        if (error) throw error;
    }

    /**
     * Complete quiz attempt and calculate results
     */
    static async finishQuiz(attemptId: string): Promise<QuizResults> {
        try {
            // Get attempt details
            const { data: attempt } = await supabase
                .from('quiz_attempts')
                .select('*, user_answers(*)')
                .eq('id', attemptId)
                .single();

            // Calculate results
            const answers = Object.values(attempt.answers);
            const totalQuestions = answers.length;
            const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
            const score = (correctAnswers / totalQuestions) * 100;

            // Calculate XP
            const baseXP = 100;
            const scoreMultiplier = score / 100;
            const timeBonus = Math.max(0, 1 - (attempt.timeSpent / (totalQuestions * 60)));
            const xpGained = Math.round(baseXP * scoreMultiplier * (1 + timeBonus));

            // Update attempt
            const { error: updateError } = await supabase
                .from('quiz_attempts')
                .update({
                    status: 'completed',
                    score,
                    end_time: new Date().toISOString()
                })
                .eq('id', attemptId);

            if (updateError) throw updateError;

            // Award XP
            const { error: xpError } = await supabase
                .from('xp_history')
                .insert({
                    userid: attempt.user_id,
                    xp_gained: xpGained,
                    source_type: 'quiz',
                    source_id: attempt.quiz_id,
                    quiz_id: attempt.quiz_id
                });

            if (xpError) throw xpError;

            return {
                attemptId,
                attempt,
                quizId: attempt.quiz_id,
                userId: attempt.user_id,
                score,
                totalQuestions,
                correctAnswers,
                timeSpent: attempt.timeSpent,
                xpGained,
                status: score >= 70 ? 'passed' : 'failed',
                completedAt: new Date()
            };
        } catch (error) {
            console.error('Error finishing quiz:', error);
            throw error;
        }
    }

    /**
     * Check if selected answer is correct
     */
    private static checkAnswer(selected: string[], correct: string[]): boolean {
        return (
            correct.every(c => selected.includes(c)) &&
            selected.length === correct.length
        );
    }

    /**
     * Get quiz attempt status
     */
    static async getAttemptStatus(attemptId: number) {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .select(`
                *,
                user_answers(count),
                quiz:quiz_id(quiz_questions(count))
            `)
            .eq('id', attemptId)
            .single();

        if (error) throw error;

        const totalQuestions = data.quiz.quiz_questions[0].count;
        const answeredQuestions = data.user_answers[0].count;

        return {
            attemptId: data.id,
            status: data.status,
            progress: (answeredQuestions / totalQuestions) * 100,
            timeSpent: data.timeSpent,
            currentQuestionIndex: data.current_question_index,
            score: data.score,
            isCompleted: data.status === 'completed'
        };
    }

    /**
     * Reset quiz attempt
     */
    static async resetAttempt(quizId: string, userId: string) {
        try {
            // Get previous attempt
            const { data: previousAttempt } = await supabase
                .from('quiz_attempts')
                .select('id')
                .eq('quiz_id', quizId)
                .eq('user_id', userId)
                .eq('status', 'in_progress')
                .single();

            if (previousAttempt) {
                // Delete previous attempt
                await supabase
                    .from('quiz_attempts')
                    .delete()
                    .eq('id', previousAttempt.id);
            }

            // Create new attempt
            return await this.createAttempt(quizId, userId);
        } catch (error) {
            console.error('Error resetting attempt:', error);
            throw error;
        }
    }

    /**
     * Get user's best attempt for a quiz
     */
    static async getBestAttempt(quizId: string, userId: string) {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quizId)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('score', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return data;
    }

    static async saveJustification(questionId : number, jusification : string) {
        const { data, error} = await  supabase.from("quiz_questions").update({justification: jusification}).eq('id', questionId).single();

        if(error) {
            throw error
        }
    }
}