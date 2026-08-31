-- ============================================================================
-- Backfill concours discussion-group members and harden assignment triggers
-- ----------------------------------------------------------------------------
-- Previous discussion-group migrations fixed secondary memberships, but existing
-- concours enrollments in user_program_enrollments were never assigned to
-- concours discussion groups. Result: concours groups existed but stayed empty,
-- so enrolled mobile users could not see their discussion group.
--
-- This migration:
--   1. Makes assignment triggers idempotent per context, not just per group.
--   2. Backfills missing concours memberships from user_program_enrollments.
--   3. Removes stale concours memberships no longer backed by an enrollment.
--   4. Recomputes current_member_count from discussion_group_members.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_program_enrollment_fixed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_concours_id UUID;
    v_group_id UUID;
    v_maxnum INTEGER;
    v_inserted INTEGER := 0;
BEGIN
    SELECT clp."concourId" INTO v_concours_id
    FROM public.concours_learningpaths clp
    WHERE clp.id = NEW.program_id
    LIMIT 1;

    IF v_concours_id IS NULL OR NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- A user should belong to only one discussion group per concours context.
    IF EXISTS (
        SELECT 1
        FROM public.discussion_group_members m
        JOIN public.discussion_groups g ON g.id = m.group_id
        WHERE g.concours_id = v_concours_id
          AND m.user_id = NEW.user_id
    ) THEN
        RETURN NEW;
    END IF;

    SELECT g.id INTO v_group_id
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

    WITH inserted AS (
        INSERT INTO public.discussion_group_members (group_id, user_id)
        VALUES (v_group_id, NEW.user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*)::int INTO v_inserted FROM inserted;

    IF v_inserted > 0 THEN
        UPDATE public.discussion_groups
        SET current_member_count = current_member_count + v_inserted,
            updated_at = NOW()
        WHERE id = v_group_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_secondary_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_id UUID;
    v_maxnum INTEGER;
    v_inserted INTEGER := 0;
BEGIN
    IF NEW.program_id IS NULL OR NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- A user should belong to only one discussion group per secondary program.
    IF EXISTS (
        SELECT 1
        FROM public.discussion_group_members m
        JOIN public.discussion_groups g ON g.id = m.group_id
        WHERE g.secondary_program_id = NEW.program_id
          AND m.user_id = NEW.user_id
    ) THEN
        RETURN NEW;
    END IF;

    SELECT g.id INTO v_group_id
    FROM public.discussion_groups g
    WHERE g.secondary_program_id = NEW.program_id
      AND g.current_member_count < g.capacity
    ORDER BY g.group_number ASC
    LIMIT 1;

    IF v_group_id IS NULL THEN
        SELECT COALESCE(MAX(group_number), 0) + 1 INTO v_maxnum
        FROM public.discussion_groups
        WHERE secondary_program_id = NEW.program_id;

        INSERT INTO public.discussion_groups (secondary_program_id, group_number)
        VALUES (NEW.program_id, v_maxnum)
        RETURNING id INTO v_group_id;
    END IF;

    WITH inserted AS (
        INSERT INTO public.discussion_group_members (group_id, user_id)
        VALUES (v_group_id, NEW.user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*)::int INTO v_inserted FROM inserted;

    IF v_inserted > 0 THEN
        UPDATE public.discussion_groups
        SET current_member_count = current_member_count + v_inserted,
            updated_at = NOW()
        WHERE id = v_group_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Make sure every concours has at least one group.
INSERT INTO public.discussion_groups (concours_id, group_number)
SELECT c.id, 1
FROM public.concours c
WHERE NOT EXISTS (
    SELECT 1 FROM public.discussion_groups g WHERE g.concours_id = c.id
);

-- Drop stale concours memberships that are not backed by any enrollment.
DELETE FROM public.discussion_group_members m
USING public.discussion_groups g
WHERE m.group_id = g.id
  AND g.concours_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.user_program_enrollments upe
      JOIN public.concours_learningpaths clp ON clp.id = upe.program_id
      WHERE clp."concourId" = g.concours_id
        AND upe.user_id = m.user_id
  );

-- Assign every enrolled concours user that is missing a membership.
DO $$
DECLARE
    v_concours UUID;
    v_user UUID;
    v_group_id UUID;
    v_maxnum INTEGER;
    v_inserted INTEGER;
BEGIN
    FOR v_concours, v_user IN
        SELECT DISTINCT clp."concourId", upe.user_id
        FROM public.user_program_enrollments upe
        JOIN public.concours_learningpaths clp ON clp.id = upe.program_id
        WHERE clp."concourId" IS NOT NULL
          AND upe.user_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.discussion_group_members m
              JOIN public.discussion_groups g ON g.id = m.group_id
              WHERE g.concours_id = clp."concourId"
                AND m.user_id = upe.user_id
          )
    LOOP
        SELECT g.id INTO v_group_id
        FROM public.discussion_groups g
        WHERE g.concours_id = v_concours
          AND g.current_member_count < g.capacity
        ORDER BY g.group_number ASC
        LIMIT 1;

        IF v_group_id IS NULL THEN
            SELECT COALESCE(MAX(group_number), 0) + 1 INTO v_maxnum
            FROM public.discussion_groups
            WHERE concours_id = v_concours;

            INSERT INTO public.discussion_groups (concours_id, group_number)
            VALUES (v_concours, v_maxnum)
            RETURNING id INTO v_group_id;
        END IF;

        WITH inserted AS (
            INSERT INTO public.discussion_group_members (group_id, user_id)
            VALUES (v_group_id, v_user)
            ON CONFLICT (group_id, user_id) DO NOTHING
            RETURNING 1
        )
        SELECT COUNT(*)::int INTO v_inserted FROM inserted;

        IF v_inserted > 0 THEN
            UPDATE public.discussion_groups
            SET current_member_count = current_member_count + v_inserted,
                updated_at = NOW()
            WHERE id = v_group_id;
        END IF;
    END LOOP;
END $$;

-- Recompute counts from the source of truth.
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
