import { useMemo } from "react";
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

  // The persistent SWR cache (AsyncStorage + JSON) cannot serialize a Map: it is
  // restored as a plain object, so `data` may be `{}` instead of a Map on relaunch.
  // Normalize back to a Map to keep `.get()` available (else: crash).
  const counts = useMemo<Map<string, number>>(() => {
    if (data instanceof Map) return data;
    if (data && typeof data === "object") {
      return new Map(Object.entries(data as Record<string, number>));
    }
    return new Map<string, number>();
  }, [data]);

  return {
    counts,
    countFor: (programId: string) => counts.get(programId) ?? 0,
    isLoading,
    error,
  };
}
