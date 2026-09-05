// services/learningPath.service.ts
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type LpMilestoneType = 'lesson' | 'practice' | 'checkpoint';
export type LpStepType = 'lesson' | 'quiz' | 'exercise';

export interface LpMilestone {
  id: string;
  title: string;
  order_index: number;
  type: LpMilestoneType;
  xp_reward: number;
  ref_course_id: number | null;
}

export interface LpUnit {
  id: string;
  title: string;
  order_index: number;
  milestones: LpMilestone[];
}

export interface LpStepWithLabel {
  id: string;
  order_index: number;
  step_type: LpStepType;
  ref_id: string;
  label: string;
}

export async function getLearningPathUnits(secondaryProgramId: string): Promise<LpUnit[]> {
  try {
    const { data: units, error: unitsError } = await supabase
      .from('lp_units')
      .select('id, title, order_index')
      .eq('secondary_program_id', secondaryProgramId)
      .order('order_index');

    if (unitsError) throw unitsError;
    if (!units || units.length === 0) return [];

    const { data: milestones, error: milestonesError } = await supabase
      .from('lp_milestones')
      .select('id, title, order_index, type, xp_reward, ref_course_id, unit_id')
      .in('unit_id', units.map((u) => u.id))
      .order('order_index');

    if (milestonesError) throw milestonesError;

    return units.map((unit) => ({
      ...unit,
      milestones: (milestones ?? [])
        .filter((m) => m.unit_id === unit.id)
        .map(({ unit_id: _unit_id, ...m }) => m as LpMilestone),
    }));
  } catch (error) {
    logger.error('Error fetching learning path units:', error);
    return [];
  }
}

export async function getMilestoneSteps(milestoneId: string): Promise<LpStepWithLabel[]> {
  try {
    const { data: steps, error } = await supabase
      .from('lp_steps')
      .select('id, order_index, step_type, ref_id')
      .eq('milestone_id', milestoneId)
      .order('order_index');

    if (error) throw error;
    if (!steps || steps.length === 0) return [];

    const quizIds = steps.filter((s) => s.step_type === 'quiz').map((s) => s.ref_id);
    const exerciseIds = steps.filter((s) => s.step_type === 'exercise').map((s) => s.ref_id);

    const [quizzesRes, exercisesRes] = await Promise.all([
      quizIds.length
        ? supabase.from('quiz').select('id, name').in('id', quizIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      exerciseIds.length
        ? supabase.from('exercices').select('id, title').in('id', exerciseIds)
        : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
    ]);

    const quizNames = new Map((quizzesRes.data ?? []).map((q) => [q.id, q.name || 'Quiz']));
    const exerciseNames = new Map((exercisesRes.data ?? []).map((e) => [e.id, e.title || 'Exercice']));

    return steps.map((s) => ({
      ...s,
      step_type: s.step_type as LpStepType,
      label:
        s.step_type === 'quiz'
          ? quizNames.get(s.ref_id) || 'Quiz'
          : s.step_type === 'exercise'
            ? exerciseNames.get(s.ref_id) || 'Exercice'
            : 'Leçon',
    }));
  } catch (error) {
    logger.error('Error fetching milestone steps:', error);
    return [];
  }
}

export async function getCompletedStepIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('user_step_progress')
      .select('step_id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;
    return new Set((data ?? []).map((r) => r.step_id));
  } catch (error) {
    logger.error('Error fetching completed steps:', error);
    return new Set();
  }
}

export interface CourseProgress {
  completedSections: number;
  totalSections: number;
  isCompleted: boolean;
}

// Réutilise le suivi de lecture de cours déjà en place (course_progress_summary,
// tenu à jour par un trigger sur usercourseprogress) plutôt que de réinventer
// un mécanisme de complétion pour les milestones "lesson".
export async function getCourseProgressMap(
  userId: string,
  courseIds: number[]
): Promise<Map<number, CourseProgress>> {
  if (courseIds.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from('course_progress_summary')
      .select('course_id, completed_sections, total_sections, is_completed')
      .eq('user_id', userId)
      .in('course_id', courseIds);

    if (error) throw error;

    return new Map(
      (data ?? []).map((row) => [
        row.course_id,
        {
          completedSections: row.completed_sections,
          totalSections: row.total_sections,
          isCompleted: !!row.is_completed,
        },
      ])
    );
  } catch (error) {
    logger.error('Error fetching course progress map:', error);
    return new Map();
  }
}

export async function markStepsCompleted(userId: string, stepIds: string[]): Promise<void> {
  if (stepIds.length === 0) return;
  try {
    const { error } = await supabase
      .from('user_step_progress')
      .upsert(
        stepIds.map((step_id) => ({
          user_id: userId,
          step_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,step_id' }
      );

    if (error) throw error;
  } catch (error) {
    logger.error('Error marking steps completed:', error);
  }
}
