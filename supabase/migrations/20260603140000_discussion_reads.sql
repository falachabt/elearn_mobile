-- ============================================================================
-- Discussion read tracking (unread badges)
-- ----------------------------------------------------------------------------
-- Stores the last time each user read a group. The chat screen upserts on open;
-- the program card shows the count of messages newer than last_read_at (authored
-- by someone else) as an "unread" badge.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discussion_group_reads (
    group_id UUID NOT NULL REFERENCES public.discussion_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_group_reads_user ON public.discussion_group_reads(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_group_reads TO authenticated;

ALTER TABLE public.discussion_group_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dgr_select_own ON public.discussion_group_reads;
CREATE POLICY dgr_select_own ON public.discussion_group_reads
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS dgr_insert_own ON public.discussion_group_reads;
CREATE POLICY dgr_insert_own ON public.discussion_group_reads
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS dgr_update_own ON public.discussion_group_reads;
CREATE POLICY dgr_update_own ON public.discussion_group_reads
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Unread counts for the current user across the groups they belong to.
-- SECURITY DEFINER so the count isn't limited by per-row visibility quirks; it
-- still scopes strictly to the calling user's own memberships.
CREATE OR REPLACE FUNCTION public.get_discussion_unread_counts()
RETURNS TABLE (group_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.group_id, COUNT(*)::bigint AS unread_count
    FROM public.discussion_messages m
    JOIN public.discussion_group_members gm
      ON gm.group_id = m.group_id AND gm.user_id = auth.uid()
    LEFT JOIN public.discussion_group_reads r
      ON r.group_id = m.group_id AND r.user_id = auth.uid()
    WHERE m.user_id <> auth.uid()
      AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
    GROUP BY m.group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_discussion_unread_counts() TO authenticated;
