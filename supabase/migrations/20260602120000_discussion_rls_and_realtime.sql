-- ============================================================================
-- Discussion Groups: RLS, hardened triggers, and Realtime
-- ----------------------------------------------------------------------------
-- Context:
--   The initial discussion-groups migration (20260531) only granted table
--   privileges to `authenticated`/`anon` but never enabled RLS. With RLS off,
--   any logged-in user can read/write EVERY group and message. This migration
--   locks access down so a user only sees the groups they belong to, while
--   keeping the auto-enrollment triggers working.
--
-- Strategy:
--   1. Make the membership/group-management trigger functions SECURITY DEFINER
--      so they keep working once RLS is enabled (they run as table owner and
--      bypass the row policies). Direct client access stays governed by RLS.
--   2. Enable RLS + member-scoped policies on the 4 discussion tables.
--   3. Enable RLS + owner-scoped policies on user_secondary_enrollments.
--   4. Add discussion_messages to the supabase_realtime publication so the
--      mobile chat receives live INSERTs (no polling).
--
-- Safe to run multiple times.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Harden trigger functions (SECURITY DEFINER + fixed search_path)
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.create_discussion_group_for_concours()                     SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.create_discussion_group_for_program()                      SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.add_user_to_discussion_group_on_secondary_enrollment()     SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.update_group_member_count_on_removal()                     SECURITY DEFINER SET search_path = public;

-- The program/concours enrollment trigger function was replaced by the *_fixed
-- variant in migration 20260601; guard in case only the original exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_to_discussion_group_on_program_enrollment_fixed') THEN
        ALTER FUNCTION public.add_user_to_discussion_group_on_program_enrollment_fixed() SECURITY DEFINER SET search_path = public;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_to_discussion_group_on_program_enrollment') THEN
        ALTER FUNCTION public.add_user_to_discussion_group_on_program_enrollment() SECURITY DEFINER SET search_path = public;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Helper: is the current user a member of a given group?
--    SECURITY DEFINER so policies can use it without recursive RLS checks.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_discussion_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = p_group_id AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_discussion_group_member(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Enable RLS + policies on discussion tables
-- ----------------------------------------------------------------------------

-- discussion_groups: a user may read the groups they belong to ------------------
ALTER TABLE public.discussion_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_groups_select_member ON public.discussion_groups;
CREATE POLICY discussion_groups_select_member
    ON public.discussion_groups FOR SELECT TO authenticated
    USING (public.is_discussion_group_member(id));

-- discussion_group_members: read members of groups the user belongs to ---------
ALTER TABLE public.discussion_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_group_members_select ON public.discussion_group_members;
CREATE POLICY discussion_group_members_select
    ON public.discussion_group_members FOR SELECT TO authenticated
    USING (public.is_discussion_group_member(group_id));

-- discussion_messages: read/write only within groups the user belongs to -------
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_messages_select ON public.discussion_messages;
CREATE POLICY discussion_messages_select
    ON public.discussion_messages FOR SELECT TO authenticated
    USING (public.is_discussion_group_member(group_id));

DROP POLICY IF EXISTS discussion_messages_insert ON public.discussion_messages;
CREATE POLICY discussion_messages_insert
    ON public.discussion_messages FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.is_discussion_group_member(group_id));

DROP POLICY IF EXISTS discussion_messages_update_own ON public.discussion_messages;
CREATE POLICY discussion_messages_update_own
    ON public.discussion_messages FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS discussion_messages_delete_own ON public.discussion_messages;
CREATE POLICY discussion_messages_delete_own
    ON public.discussion_messages FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- discussion_message_attachments: tied to the parent message's group -----------
ALTER TABLE public.discussion_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_attachments_select ON public.discussion_message_attachments;
CREATE POLICY discussion_attachments_select
    ON public.discussion_message_attachments FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.discussion_messages m
        WHERE m.id = message_id AND public.is_discussion_group_member(m.group_id)
    ));

DROP POLICY IF EXISTS discussion_attachments_insert ON public.discussion_message_attachments;
CREATE POLICY discussion_attachments_insert
    ON public.discussion_message_attachments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.discussion_messages m
        WHERE m.id = message_id
          AND m.user_id = auth.uid()
          AND public.is_discussion_group_member(m.group_id)
    ));

-- ----------------------------------------------------------------------------
-- 4. Enable RLS + owner policies on user_secondary_enrollments
--    The mobile app now writes here directly (enrollment = source of truth).
--    Admin/back-office uses service_role and bypasses these policies.
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_secondary_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS use_select_own ON public.user_secondary_enrollments;
CREATE POLICY use_select_own
    ON public.user_secondary_enrollments FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS use_insert_own ON public.user_secondary_enrollments;
CREATE POLICY use_insert_own
    ON public.user_secondary_enrollments FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS use_update_own ON public.user_secondary_enrollments;
CREATE POLICY use_update_own
    ON public.user_secondary_enrollments FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS use_delete_own ON public.user_secondary_enrollments;
CREATE POLICY use_delete_own
    ON public.user_secondary_enrollments FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. Realtime: stream new messages to clients (no polling)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'discussion_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;
    END IF;
END $$;
