import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";

/**
 * Tracks who is currently online in a discussion group via Supabase Realtime
 * Presence. Each open chat screen `track()`s the current user on a presence
 * channel keyed by the group; the channel is left on unmount.
 */
export function useGroupPresence(groupId: string | undefined) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!groupId || !user?.id) return;

    const channel = supabase.channel(`presence-group-${groupId}`, {
      config: { presence: { key: user.id } },
    });

    const syncOnline = () => {
      const state = channel.presenceState<{ user_id: string }>();
      const ids = new Set<string>();
      Object.values(state).forEach((entries) => {
        entries.forEach((e) => e.user_id && ids.add(e.user_id));
      });
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .on("presence", { event: "join" }, syncOnline)
      .on("presence", { event: "leave" }, syncOnline)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user?.id]);

  return { onlineUserIds, onlineCount: onlineUserIds.size };
}
