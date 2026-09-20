import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

// Generic "seen once" tracking, per USER (not per device) so an
// announcement/onboarding sheet isn't shown again after a reinstall or a new
// phone. Keyed by an arbitrary string -- reusable for any future intro sheet.

export async function hasSeenAnnouncement(userId: string, announcementKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_seen_announcements')
    .select('id')
    .eq('user_id', userId)
    .eq('announcement_key', announcementKey)
    .maybeSingle();

  if (error) {
    logger.error('Error checking seen announcement:', error);
    return false;
  }

  return !!data;
}

export async function markAnnouncementSeen(userId: string, announcementKey: string): Promise<void> {
  const { error } = await supabase
    .from('user_seen_announcements')
    .upsert(
      { user_id: userId, announcement_key: announcementKey, seen_at: new Date().toISOString() },
      { onConflict: 'user_id,announcement_key' }
    );

  if (error) {
    logger.error('Error marking announcement as seen:', error);
  }
}
