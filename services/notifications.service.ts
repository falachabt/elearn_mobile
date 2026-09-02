// services/notifications.service.ts
// Service de communication avec Supabase pour les notifications in-app du fil

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type NotificationType = 'post_comment' | 'post_reply' | 'post_like';

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    post_id?: string;
    comment_id?: string;
    actor_id?: string;
    screen?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  sent_push: boolean;
  created_at: string;
};

/**
 * Récupère les notifications de l'utilisateur connecté, les plus récentes en premier.
 */
export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as AppNotification[];
  } catch (err) {
    logger.error('getNotifications error:', err);
    return [];
  }
}

/**
 * Compte les notifications non lues de l'utilisateur connecté.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { count, error } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);

    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    logger.error('getUnreadNotificationCount error:', err);
    return 0;
  }
}

/**
 * Marque une notification comme lue (via RPC SECURITY DEFINER — read_at n'est
 * pas modifiable directement par une policy simple).
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const { error } = await (supabase.rpc as any)('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
  } catch (err) {
    logger.error('markNotificationRead error:', err);
  }
}
