-- Complete setup: Create enrollments and fix triggers for discussion groups

-- ====================================================================
-- PART 1: FIX trigger for user_program_enrollments (concours + programs)
-- ====================================================================
-- The old trigger was trying to use program_id directly as secondary_program_id
-- But user_program_enrollments.program_id is a BIGINT that references concours_learningpaths
-- We need to find the concours associated and then find its discussion group

DROP TRIGGER IF EXISTS trigger_add_user_to_discussion_group_on_enrollment ON public.user_program_enrollments;

CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_program_enrollment_fixed()
RETURNS TRIGGER AS $$
DECLARE
    v_concours_id UUID;
    v_group_id UUID;
    v_group_count INTEGER;
    v_latest_group_id UUID;
    v_group_number INTEGER;
BEGIN
    -- NEW.program_id is BIGINT referencing concours_learningpaths
    -- First, find if this is linked to a concours via concours_learningpaths
    SELECT clp.concourId 
    INTO v_concours_id
    FROM public.concours_learningpaths clp
    WHERE clp.id = NEW.program_id
    LIMIT 1;
    
    -- If no concours found, this is likely a regular program, skip
    IF v_concours_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Find the discussion group for this concours
    SELECT g.id INTO v_group_id
    FROM public.discussion_groups g
    WHERE g.concours_id = v_concours_id
    ORDER BY g.group_number DESC
    LIMIT 1;
    
    IF v_group_id IS NULL THEN
        RETURN NEW;  -- No group found, exit
    END IF;
    
    -- Check if user is already in this group
    IF EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = v_group_id AND user_id = NEW.user_id
    ) THEN
        RETURN NEW;  -- User already in group
    END IF;
    
    -- Check current capacity of the latest group
    SELECT current_member_count INTO v_group_count
    FROM public.discussion_groups
    WHERE id = v_group_id;
    
    -- If group is at capacity, create a new group
    IF v_group_count >= 30 THEN
        SELECT g.group_number INTO v_group_number
        FROM public.discussion_groups g
        WHERE g.concours_id = v_concours_id
        ORDER BY g.group_number DESC
        LIMIT 1;
        
        INSERT INTO public.discussion_groups (concours_id, group_number)
        VALUES (v_concours_id, COALESCE(v_group_number, 0) + 1)
        RETURNING id INTO v_latest_group_id;
        
        v_group_id := v_latest_group_id;
    END IF;
    
    -- Add user to the discussion group
    INSERT INTO public.discussion_group_members (group_id, user_id)
    VALUES (v_group_id, NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    -- Update member count only if we actually inserted
    UPDATE public.discussion_groups
    SET current_member_count = current_member_count + 1
    WHERE id = v_group_id
    AND NOT EXISTS (
        SELECT 1 FROM public.discussion_group_members dgm2
        WHERE dgm2.group_id = v_group_id AND dgm2.user_id = NEW.user_id
        AND dgm2.joined_at < CURRENT_TIMESTAMP - INTERVAL '1 second'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_user_to_discussion_group_on_enrollment
AFTER INSERT ON public.user_program_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.add_user_to_discussion_group_on_program_enrollment_fixed();


-- ====================================================================
-- PART 2: POPULATE secondary enrollments for existing users
-- ====================================================================
-- For each account with schoollevel='secondary', create enrollment(s)
-- We need to:
-- 1. Find users with secondary preferences
-- 2. Get their preferred secondary programs
-- 3. Create enrollments (with expiry = now + 1 year)

-- The INSERT below relies on ON CONFLICT (user_id, program_id). This unique was
-- never declared in migrations (schema drift) and production accumulated
-- duplicate rows, so we dedupe first then add the constraint, idempotently.
DO $$
BEGIN
    -- Keep a single row per (user_id, program_id); drop the rest.
    DELETE FROM public.user_secondary_enrollments a
    USING public.user_secondary_enrollments b
    WHERE a.user_id = b.user_id
      AND a.program_id = b.program_id
      AND a.ctid > b.ctid;

    ALTER TABLE public.user_secondary_enrollments
        ADD CONSTRAINT user_secondary_enrollments_user_program_unique UNIQUE (user_id, program_id);
EXCEPTION
    WHEN duplicate_table THEN NULL; -- constraint/index name already exists
    WHEN duplicate_object THEN NULL; -- equivalent unique already present
END $$;

-- Disable the auto-group-assignment trigger during this bulk historical
-- backfill. The (buggy, pre-fix) trigger would create overflow groups under the
-- old constraint and can collide; clean assignment happens later in
-- 20260603130000 (PART 4) once the constraint and triggers are fixed.
ALTER TABLE public.user_secondary_enrollments
    DISABLE TRIGGER trigger_add_user_to_discussion_group_on_secondary_enrollment;

-- Find accounts with secondary preferences and create enrollments
INSERT INTO public.user_secondary_enrollments (user_id, program_id, expiry_date, status)
SELECT
    a.id as user_id,
    sp.id as program_id,
    CURRENT_TIMESTAMP + INTERVAL '1 year' as expiry_date,
    'active' as status
FROM public.accounts a
CROSS JOIN public.secondary_programs sp
WHERE
    -- User has secondary level
    a.schoollevel = 'secondary'
    -- User hasn't already enrolled
    AND NOT EXISTS (
        SELECT 1 FROM public.user_secondary_enrollments use2
        WHERE use2.user_id = a.id AND use2.program_id = sp.id
    )
    -- User's gradelevel matches the program's class/series (if metadata exists)
    -- OR just enroll everyone with secondary for now
ON CONFLICT (user_id, program_id) DO NOTHING;

ALTER TABLE public.user_secondary_enrollments
    ENABLE TRIGGER trigger_add_user_to_discussion_group_on_secondary_enrollment;

-- Log how many were created
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.user_secondary_enrollments;
    RAISE NOTICE 'Total secondary enrollments after migration: %', v_count;
END $$;


-- ====================================================================
-- PART 3: Verify discussion group assignments
-- ====================================================================
-- Check how many members are in each group now
CREATE TEMPORARY TABLE temp_group_stats AS
SELECT 
    dg.id,
    dg.concours_id,
    dg.secondary_program_id,
    dg.group_number,
    COUNT(dgm.user_id) as member_count
FROM public.discussion_groups dg
LEFT JOIN public.discussion_group_members dgm ON dg.id = dgm.group_id
GROUP BY dg.id, dg.concours_id, dg.secondary_program_id, dg.group_number;

-- Report: groups with members
SELECT 
    CASE 
        WHEN concours_id IS NOT NULL THEN 'CONCOURS'
        ELSE 'SECONDARY'
    END as type,
    group_number,
    member_count,
    COUNT(*) as num_groups
FROM temp_group_stats
WHERE member_count > 0
GROUP BY type, group_number, member_count;

DROP TABLE temp_group_stats;
