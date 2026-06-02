import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

export interface SecondaryEnrollment {
  id: string;
  user_id: string | null;
  program_id: string | null;
  enrollment_date: string | null;
  expiry_date: string | null;
  status: string | null;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** All secondary enrollments for a user (source of truth for "enrolled"). */
export async function getMySecondaryEnrollments(
  userId: string
): Promise<SecondaryEnrollment[]> {
  const { data, error } = await supabase
    .from("user_secondary_enrollments")
    .select("id, user_id, program_id, enrollment_date, expiry_date, status")
    .eq("user_id", userId);

  if (error) {
    logger.error("[enrollment] getMySecondaryEnrollments error:", error);
    throw error;
  }
  return (data ?? []) as SecondaryEnrollment[];
}

/**
 * Number of distinct users enrolled in each secondary program (all users, not
 * just the current one). Backed by the `get_secondary_enrollment_counts` RPC
 * because RLS hides other users' enrollment rows from a direct query.
 */
export async function getSecondaryEnrollmentCounts(): Promise<Map<string, number>> {
  // RPC not in generated types yet (added by migration 20260603); cast the name.
  const { data, error } = await supabase.rpc(
    "get_secondary_enrollment_counts" as never
  );

  if (error) {
    logger.error("[enrollment] getSecondaryEnrollmentCounts error:", error);
    throw error;
  }

  const rows = (data ?? []) as {
    program_id: string | null;
    enrolled_count: number;
  }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.program_id) counts.set(row.program_id, Number(row.enrolled_count));
  }
  return counts;
}

/** Set of program ids the user is actively enrolled in. */
export async function getEnrolledProgramIds(userId: string): Promise<Set<string>> {
  const enrollments = await getMySecondaryEnrollments(userId);
  return new Set(
    enrollments
      .filter((e) => e.status !== "cancelled" && e.program_id)
      .map((e) => e.program_id as string)
  );
}

/**
 * Enroll the user in a secondary program. The DB trigger auto-adds them to the
 * matching discussion group. Idempotent: a duplicate enrollment is treated as
 * success.
 */
export async function enrollSecondary(
  userId: string,
  programId: string
): Promise<void> {
  const expiry = new Date(Date.now() + ONE_YEAR_MS).toISOString();

  const { error } = await supabase.from("user_secondary_enrollments").insert({
    user_id: userId,
    program_id: programId,
    expiry_date: expiry,
    status: "active",
  });

  // 23505 = unique violation -> already enrolled, which is fine.
  if (error && error.code !== "23505") {
    logger.error("[enrollment] enrollSecondary error:", error);
    throw error;
  }
}

/** Remove the user's enrollment from a secondary program. */
export async function unenrollSecondary(
  userId: string,
  programId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_secondary_enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("program_id", programId);

  if (error) {
    logger.error("[enrollment] unenrollSecondary error:", error);
    throw error;
  }
}
