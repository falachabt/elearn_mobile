import useSWR from "swr";

import { useAuth } from "@/contexts/auth";
import { getUnreadCount } from "@/services/discussion.service";

/** Unread-message count for a group, used for the chat card badge. */
export function useGroupUnread(groupId: string | null | undefined) {
  const { user } = useAuth();

  const { data, mutate, isLoading } = useSWR(
    user?.id && groupId ? ["group-unread", groupId, user.id] : null,
    () => getUnreadCount(groupId!),
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  return { unread: data ?? 0, mutate, isLoading };
}
