-- ============================================================================
-- Fix discussion-group uniqueness bug + backfill missing groups/members
-- ----------------------------------------------------------------------------
-- BUG: the original constraint
--     unique_group_per_context UNIQUE NULLS NOT DISTINCT (concours_id, group_number)
-- omitted secondary_program_id. Because every secondary program has
-- concours_id = NULL and NULLS NOT DISTINCT treats those NULLs as equal, all
-- secondary programs shared a single (NULL, group_number) namespace. Result:
-- only the FIRST secondary program (Série A) could ever own groups; Série C and
-- Série D could not get a group #1, so their enrolled users were never assigned
-- to a discussion group and the in-app chat card never appeared.
--
-- This migration:
--   1. Replaces the constraint with one scoped per concours AND per program.
--   2. Rewrites the enrollment trigger functions so they auto-create group #1
--      when a context has no group yet (instead of silently exiting).
--   3. Backfills group #1 for every concours/secondary program missing one.
--   4. Assigns every enrolled user lacking a membership to a group (capacity 30,
--      overflow to new groups), then recomputes member counts.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix the unique constraint
-- ----------------------------------------------------------------------------
ALTER TABLE public.discussion_groups
    DROP CONSTRAINT IF EXISTS unique_group_per_context;

ALTER TABLE public.discussion_groups
    ADD CONSTRAINT unique_group_per_context
    UNIQUE NULLS NOT DISTINCT (concours_id, secondary_program_id, group_number);

-- ----------------------------------------------------------------------------
-- 2. Rewrite enrollment trigger functions to auto-create the first group
-- ----------------------------------------------------------------------------

-- Secondary programs ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_secondary_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_id UUID;
    v_count INTEGER;
    v_maxnum INTEGER;
BEGIN
    -- Latest group for this program that still has room.
    SELECT g.id, g.current_member_count
      INTO v_group_id, v_count
    FROM public.discussion_groups g
    WHERE g.secondary_program_id = NEW.program_id
      AND g.current_member_count < g.capacity
    ORDER BY g.group_number ASC
    LIMIT 1;

    -- No group (or all full): create the next one.
    IF v_group_id IS NULL THEN
        SELECT COALESCE(MAX(group_number), 0) + 1 INTO v_maxnum
        FROM public.discussion_groups
        WHERE secondary_program_id = NEW.program_id;

        INSERT INTO public.discussion_groups (secondary_program_id, group_number)
        VALUES (NEW.program_id, v_maxnum)
        RETURNING id INTO v_group_id;
    END IF;

    -- Already a member? nothing to do.
    IF EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = v_group_id AND user_id = NEW.user_id
    ) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.discussion_group_members (group_id, user_id)
    VALUES (v_group_id, NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;

    UPDATE public.discussion_groups
    SET current_member_count = current_member_count + 1
    WHERE id = v_group_id;

    RETURN NEW;
END;
$$;

-- Concours / learning paths --------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_program_enrollment_fixed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_concours_id UUID;
    v_group_id UUID;
    v_count INTEGER;
    v_maxnum INTEGER;
BEGIN
    -- NEW.program_id (BIGINT) references concours_learningpaths.
    SELECT clp."concourId" INTO v_concours_id
    FROM public.concours_learningpaths clp
    WHERE clp.id = NEW.program_id
    LIMIT 1;

    IF v_concours_id IS NULL THEN
        RETURN NEW;  -- not a concours-backed program
    END IF;

    SELECT g.id, g.current_member_count
      INTO v_group_id, v_count
    FROM public.discussion_groups g
    WHERE g.concours_id = v_concours_id
      AND g.current_member_count < g.capacity
    ORDER BY g.group_number ASC
    LIMIT 1;

    IF v_group_id IS NULL THEN
        SELECT COALESCE(MAX(group_number), 0) + 1 INTO v_maxnum
        FROM public.discussion_groups
        WHERE concours_id = v_concours_id;

        INSERT INTO public.discussion_groups (concours_id, group_number)
        VALUES (v_concours_id, v_maxnum)
        RETURNING id INTO v_group_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = v_group_id AND user_id = NEW.user_id
    ) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.discussion_group_members (group_id, user_id)
    VALUES (v_group_id, NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;

    UPDATE public.discussion_groups
    SET current_member_count = current_member_count + 1
    WHERE id = v_group_id;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Backfill group #1 for any context missing one
-- ----------------------------------------------------------------------------
INSERT INTO public.discussion_groups (secondary_program_id, group_number)
SELECT sp.id, 1
FROM public.secondary_programs sp
WHERE NOT EXISTS (
    SELECT 1 FROM public.discussion_groups g WHERE g.secondary_program_id = sp.id
);

INSERT INTO public.discussion_groups (concours_id, group_number)
SELECT c.id, 1
FROM public.concours c
WHERE NOT EXISTS (
    SELECT 1 FROM public.discussion_groups g WHERE g.concours_id = c.id
);

-- ----------------------------------------------------------------------------
-- 4. Assign enrolled users that have no membership yet (capacity-aware)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_prog UUID;
    v_user UUID;
    v_group_id UUID;
    v_maxnum INTEGER;
BEGIN
    -- Secondary enrollments
    FOR v_prog IN
        SELECT DISTINCT program_id FROM public.user_secondary_enrollments WHERE program_id IS NOT NULL
    LOOP
        FOR v_user IN
            SELECT e.user_id
            FROM public.user_secondary_enrollments e
            WHERE e.program_id = v_prog
              AND e.user_id IS NOT NULL
              AND COALESCE(e.status, 'active') <> 'cancelled'
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.discussion_group_members m
                  JOIN public.discussion_groups g ON g.id = m.group_id
                  WHERE g.secondary_program_id = v_prog AND m.user_id = e.user_id
              )
        LOOP
            SELECT g.id INTO v_group_id
            FROM public.discussion_groups g
            WHERE g.secondary_program_id = v_prog AND g.current_member_count < g.capacity
            ORDER BY g.group_number ASC
            LIMIT 1;

            IF v_group_id IS NULL THEN
                SELECT COALESCE(MAX(group_number), 0) + 1 INTO v_maxnum
                FROM public.discussion_groups WHERE secondary_program_id = v_prog;
                INSERT INTO public.discussion_groups (secondary_program_id, group_number)
                VALUES (v_prog, v_maxnum) RETURNING id INTO v_group_id;
            END IF;

            INSERT INTO public.discussion_group_members (group_id, user_id)
            VALUES (v_group_id, v_user) ON CONFLICT (group_id, user_id) DO NOTHING;

            UPDATE public.discussion_groups
            SET current_member_count = current_member_count + 1
            WHERE id = v_group_id;
        END LOOP;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Recompute member counts from the source of truth
-- ----------------------------------------------------------------------------
UPDATE public.discussion_groups g
SET current_member_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM public.discussion_group_members
    GROUP BY group_id
) sub
WHERE g.id = sub.group_id;

UPDATE public.discussion_groups g
SET current_member_count = 0
WHERE NOT EXISTS (
    SELECT 1 FROM public.discussion_group_members m WHERE m.group_id = g.id
);
