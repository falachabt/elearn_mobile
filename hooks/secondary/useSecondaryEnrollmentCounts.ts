import useSWR from "swr";

import { getSecondaryEnrollmentCounts } from "@/services/secondary/enrollment.service";

/**
 * Map of secondary program id -> number of enrolled users (all users).
 * Shared across every program card via a single SWR key.
 */
export function useSecondaryEnrollmentCounts() {
  const { data, error, isLoading } = useSWR(
    "secondary-enrollment-counts",
    getSecondaryEnrollmentCounts,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const counts = data ?? new Map<string, number>();

  return {
    counts,
    countFor: (programId: string) => counts.get(programId) ?? 0,
    isLoading,
    error,
  };
}
