-- ----------------------------------------------------------------------------
-- Enrollment count RPCs (for program cards: "X inscrits").
--
-- RLS on the enrollment tables only lets a user SELECT their own rows, so a
-- client cannot count how many people are enrolled. These SECURITY DEFINER
-- functions return aggregate counts only (no per-user data leaks), grouped by
-- program, and are safe to expose to authenticated/anon.
--   - Secondary: counts ALL enrollments per secondary_programs.id (expired and
--     cancelled included — this is social-proof "total ever enrolled").
--   - Learn: enrollments live on concours_learningpaths; cards are grouped by
--     learning_path, so we aggregate to learningPathId and count DISTINCT users
--     (a user enrolled in 2 concours sharing a path counts once). Expired
--     enrollments are included.
-- ----------------------------------------------------------------------------

-- Secondary programs ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_secondary_enrollment_counts()
RETURNS TABLE (program_id uuid, enrolled_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT program_id, COUNT(DISTINCT user_id)::bigint AS enrolled_count
  FROM public.user_secondary_enrollments
  WHERE program_id IS NOT NULL
    AND user_id IS NOT NULL
  GROUP BY program_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_secondary_enrollment_counts() TO authenticated, anon;

-- Learning paths -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learningpath_enrollment_counts()
RETURNS TABLE (learning_path_id uuid, enrolled_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clp."learningPathId" AS learning_path_id,
         COUNT(DISTINCT upe.user_id)::bigint AS enrolled_count
  FROM public.user_program_enrollments upe
  JOIN public.concours_learningpaths clp ON clp.id = upe.program_id
  WHERE clp."learningPathId" IS NOT NULL
    AND upe.user_id IS NOT NULL
  GROUP BY clp."learningPathId";
$$;

GRANT EXECUTE ON FUNCTION public.get_learningpath_enrollment_counts() TO authenticated, anon;
