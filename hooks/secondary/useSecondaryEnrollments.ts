import useSWR from "swr";

import { useAuth } from "@/contexts/auth";
import { getEnrolledProgramIds } from "@/services/secondary/enrollment.service";

/**
 * The set of secondary program ids the current user is enrolled in.
 * `user_secondary_enrollments` is the source of truth (replaces the old
 * account-preferences heuristic).
 */
export function useSecondaryEnrollments() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? ["secondary-enrollments", user.id] : null,
    async () => Array.from(await getEnrolledProgramIds(user!.id)),
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const enrolledIds = data ?? [];

  return {
    enrolledIds,
    isEnrolled: (programId: string) => enrolledIds.includes(programId),
    isLoading,
    error,
    mutate,
  };
}
