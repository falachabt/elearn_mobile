import useSWR from "swr";

import { useAuth } from "@/contexts/auth";
import { getMyGroupForContext } from "@/services/discussion.service";

interface UseMyDiscussionGroupArgs {
  secondaryProgramId?: string | null;
  concoursId?: string | null;
}

/**
 * Resolve the discussion group the current user belongs to for a given
 * program/concours. `isMember` is false until the DB trigger has assigned the
 * user to a group (i.e. after enrollment).
 */
export function useMyDiscussionGroup({
  secondaryProgramId,
  concoursId,
}: UseMyDiscussionGroupArgs) {
  const { user } = useAuth();
  const context = secondaryProgramId ?? concoursId ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    user?.id && context ? ["discussion-group", user.id, context] : null,
    () =>
      getMyGroupForContext({
        userId: user!.id,
        secondaryProgramId,
        concoursId,
      }),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    group: data?.group ?? null,
    membershipId: data?.membershipId ?? null,
    isMember: !!data?.group,
    isLoading,
    error,
    mutate,
  };
}
