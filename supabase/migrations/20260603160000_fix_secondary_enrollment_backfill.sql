-- ----------------------------------------------------------------------------
-- Fix the over-eager secondary enrollment backfill.
--
-- Migration 20260601000000 backfilled enrollments with:
--     FROM accounts a CROSS JOIN secondary_programs sp
--     WHERE a.schoollevel = 'secondary'
-- with the gradelevel matching COMMENTED OUT ("just enroll everyone for now").
-- Result: every secondary user is enrolled in EVERY secondary program, so all
-- programs report the same enrolled count (= total secondary users, e.g. 1756).
--
-- This migration deletes the bogus blanket enrollments, keeping only rows that
-- are either:
--   1. backed by a completed payment (real purchases), or
--   2. matching the user's own track(s), derived from their gradelevel and
--      secondaryPreferences (preferredTrack + selectedTracks).
--
-- Matching mirrors the app's toTrackKey(): unaccent + lowercase + strip the
-- word "serie" + strip everything non-alphanumeric. So "Terminale A" and a
-- program (class "Terminale", serie "A") both normalize to "terminalea".
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Normalize a track/label string the same way the mobile app's toTrackKey does.
CREATE OR REPLACE FUNCTION public.secondary_track_key(p text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT regexp_replace(
           replace(lower(extensions.unaccent(coalesce(p, ''))), 'serie', ''),
           '[^a-z0-9]', '', 'g'
         );
$$;

WITH wanted AS (
    -- Every track key a user actually wants (gradelevel + preferences).
    SELECT a.id AS user_id, public.secondary_track_key(t.track) AS tk
    FROM public.accounts a
    CROSS JOIN LATERAL (
        SELECT a.gradelevel AS track
        UNION ALL
        SELECT a.metadata -> 'secondaryPreferences' ->> 'preferredTrack'
        UNION ALL
        SELECT jsonb_array_elements_text(
                   CASE
                       WHEN jsonb_typeof(a.metadata -> 'secondaryPreferences' -> 'selectedTracks') = 'array'
                           THEN a.metadata -> 'secondaryPreferences' -> 'selectedTracks'
                       ELSE '[]'::jsonb
                   END
               )
    ) t
    WHERE t.track IS NOT NULL
      AND length(public.secondary_track_key(t.track)) > 0
),
prog AS (
    SELECT sp.id AS program_id,
           public.secondary_track_key(coalesce(sc.name, '') || ' ' || coalesce(ss.name, '')) AS tk
    FROM public.secondary_programs sp
    LEFT JOIN public.secondary_classes sc ON sc.id = sp.class_id
    LEFT JOIN public.secondary_series ss ON ss.id = sp.series_id
)
DELETE FROM public.user_secondary_enrollments e
WHERE
    -- not a real purchase
    NOT EXISTS (
        SELECT 1
        FROM public.user_secondary_payments p
        WHERE p.user_id = e.user_id
          AND p.program_id = e.program_id
          AND p.payment_status = 'completed'
    )
    -- and the program's track is not one this user actually wants
    AND NOT EXISTS (
        SELECT 1
        FROM prog
        JOIN wanted w ON w.tk = prog.tk AND w.user_id = e.user_id
        WHERE prog.program_id = e.program_id
    );

-- ----------------------------------------------------------------------------
-- Clean discussion-group memberships left over from the bogus enrollments.
-- The same backfill added every secondary user to every secondary program's
-- discussion group. Drop secondary memberships whose user is no longer enrolled
-- in that group's program, then recompute member counts. Concours groups are
-- untouched (driven by user_program_enrollments, not affected by this bug).
-- ----------------------------------------------------------------------------
DELETE FROM public.discussion_group_members m
USING public.discussion_groups g
WHERE m.group_id = g.id
  AND g.secondary_program_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.user_secondary_enrollments e
      WHERE e.user_id = m.user_id
        AND e.program_id = g.secondary_program_id
        AND COALESCE(e.status, 'active') <> 'cancelled'
  );

-- Resync current_member_count on every group.
UPDATE public.discussion_groups g
SET current_member_count = COALESCE(c.cnt, 0),
    updated_at = NOW()
FROM (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM public.discussion_group_members
    GROUP BY group_id
) c
WHERE c.group_id = g.id;

UPDATE public.discussion_groups g
SET current_member_count = 0,
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.discussion_group_members m WHERE m.group_id = g.id
);

-- Report remaining counts for a quick sanity check in the logs.
DO $$
DECLARE
    v_enr INTEGER;
    v_mem INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_enr FROM public.user_secondary_enrollments;
    SELECT COUNT(*) INTO v_mem FROM public.discussion_group_members;
    RAISE NOTICE 'After cleanup: % secondary enrollments, % group memberships', v_enr, v_mem;
END $$;
