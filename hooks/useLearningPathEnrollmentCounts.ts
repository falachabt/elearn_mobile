import { useMemo } from "react";
import useSWR from "swr";

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

/**
 * Number of distinct users enrolled per learning path (all users). Enrollments
 * live on `concours_learningpaths`; the RPC aggregates them to learningPathId
 * and bypasses RLS so we can count rows that aren't the current user's.
 */
async function fetchLearningPathEnrollmentCounts(): Promise<Map<string, number>> {
  // RPC not in generated types yet (added by migration 20260603); cast the name.
  const { data, error } = await supabase.rpc(
    "get_learningpath_enrollment_counts" as never
  );

  if (error) {
    logger.error("[learn] getLearningPathEnrollmentCounts error:", error);
    throw error;
  }

  const rows = (data ?? []) as {
    learning_path_id: string | null;
    enrolled_count: number;
  }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.learning_path_id) {
      counts.set(row.learning_path_id, Number(row.enrolled_count));
    }
  }
  return counts;
}

/**
 * Map of learning path id -> enrolled user count. Shared across every learning
 * path card via a single SWR key.
 */
export function useLearningPathEnrollmentCounts() {
  const { data, error, isLoading } = useSWR(
    "learningpath-enrollment-counts",
    fetchLearningPathEnrollmentCounts,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  // Persistent SWR cache (AsyncStorage + JSON) can't serialize a Map: it comes
  // back as a plain object on relaunch. Normalize to a Map (else: crash).
  const counts = useMemo<Map<string, number>>(() => {
    if (data instanceof Map) return data;
    if (data && typeof data === "object") {
      return new Map(Object.entries(data as Record<string, number>));
    }
    return new Map<string, number>();
  }, [data]);

  return {
    counts,
    countFor: (learningPathId: string) => counts.get(learningPathId) ?? 0,
    isLoading,
    error,
  };
}
