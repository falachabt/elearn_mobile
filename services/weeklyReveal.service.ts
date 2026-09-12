// services/weeklyReveal.service.ts
// Révélation hebdo du classement (top 3 + likes de profil) -- voir
// supabase/schemas/4_post.sql pour les RPC/tables correspondantes.
//
// La fenêtre "dernière semaine complète" est FIGÉE : [boundary-7j, boundary),
// où boundary = même frontière que get_weekly_leaderboard côté serveur
// (date_trunc('week', now()) + 6 jours 14h, en UTC -- soit dimanche 14h UTC).
// getWeeklyRevealState() ci-dessous reproduit exactement ce calcul en JS pour
// que l'état affiché (label/visibilité) soit toujours synchro avec les
// données réellement disponibles côté serveur.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { WeeklyLeaderboardEntry } from '@/services/feed.service';

const SEEN_KEY_PREFIX = 'weekly-reveal-seen:';

/** A-t-on déjà auto-affiché le bottom sheet pour cette semaine révélée ? */
export async function hasSeenWeeklyReveal(weekBoundaryKey: string): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(`${SEEN_KEY_PREFIX}${weekBoundaryKey}`));
  } catch (err) {
    logger.error('hasSeenWeeklyReveal error:', err);
    return false;
  }
}

export async function markWeeklyRevealSeen(weekBoundaryKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${SEEN_KEY_PREFIX}${weekBoundaryKey}`, '1');
  } catch (err) {
    logger.error('markWeeklyRevealSeen error:', err);
  }
}

export type WeeklyRevealMode = 'reveal' | 'last_week' | 'countdown';

function lastPassedSundayBoundaryUTC(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(14, 0, 0, 0);
  const day = d.getUTCDay();
  let daysSinceSunday = day;
  if (day === 0 && now.getTime() < d.getTime()) {
    daysSinceSunday = 7;
  }
  d.setUTCDate(d.getUTCDate() - daysSinceSunday);
  return d;
}

/**
 * État d'affichage de la page classement :
 * - 'reveal' : dimanche, juste après la frontière -> label "Cette semaine"
 * - 'last_week' : lundi à vendredi 12h -> label "Semaine dernière"
 * - 'countdown' : vendredi 12h à dimanche 14h -> caché, countdown affiché
 * Les 3 régimes pointent vers la MÊME donnée (dernière semaine complète) --
 * seuls le label et la visibilité changent.
 */
export function getWeeklyRevealState(): {
  mode: WeeklyRevealMode;
  nextRevealAt: Date;
  weekBoundaryKey: string;
} {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  let mode: WeeklyRevealMode;
  if (day === 0 && hour >= 14) {
    mode = 'reveal';
  } else if ((day === 5 && hour >= 12) || day === 6 || (day === 0 && hour < 14)) {
    mode = 'countdown';
  } else {
    mode = 'last_week';
  }

  const lastBoundary = lastPassedSundayBoundaryUTC(now);
  const nextRevealAt = new Date(lastBoundary.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { mode, nextRevealAt, weekBoundaryKey: lastBoundary.toISOString() };
}

export async function getLastCompletedWeekLeaderboard(options?: {
  gradelevel?: string | null;
  countryId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<WeeklyLeaderboardEntry[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_last_completed_week_leaderboard', {
      p_gradelevel: options?.gradelevel ?? null,
      p_country_id: options?.countryId ?? null,
      p_limit: options?.limit ?? 30,
      p_offset: options?.offset ?? 0,
    });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    logger.error('getLastCompletedWeekLeaderboard error:', err);
    return [];
  }
}

export async function getMyLastCompletedWeekRank(options?: {
  gradelevel?: string | null;
  countryId?: string | null;
}): Promise<WeeklyLeaderboardEntry | null> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_my_last_completed_week_rank', {
      p_gradelevel: options?.gradelevel ?? null,
      p_country_id: options?.countryId ?? null,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (err) {
    logger.error('getMyLastCompletedWeekRank error:', err);
    return null;
  }
}

export async function getMyWeeklyLikeCooldownSeconds(): Promise<number> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_my_weekly_like_cooldown_seconds');
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (err) {
    logger.error('getMyWeeklyLikeCooldownSeconds error:', err);
    return 0;
  }
}

export const LIKE_COOLDOWN_ERROR = 'like_cooldown_active';

/**
 * Envoie un like à un profil du top 3 révélé. Lève une erreur dont le
 * message contient LIKE_COOLDOWN_ERROR si le cooldown de 24h est actif
 * (le trigger DB enforce_weekly_top3_like_cooldown le refuse alors).
 */
export async function likeProfile(targetId: string, weekBoundaryKey: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const likerId = auth?.user?.id;
  if (!likerId) throw new Error('Not authenticated');

  const { error } = await (supabase as any).from('weekly_top3_likes').insert({
    liker_id: likerId,
    target_id: targetId,
    week_boundary: weekBoundaryKey,
  });

  if (error) {
    if (error.message?.includes(LIKE_COOLDOWN_ERROR)) {
      throw new Error(LIKE_COOLDOWN_ERROR);
    }
    throw error;
  }
}
