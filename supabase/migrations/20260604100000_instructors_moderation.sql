-- ============================================================================
-- Instructors / moderation access for the discussion groups
-- ----------------------------------------------------------------------------
-- The elearn_instructors web app lets staff ("instructors") read and reply to
-- the student discussion groups. Instructors are NOT group members, so the
-- existing member-scoped RLS (20260602120000) would block them. This migration:
--
--   1. Creates an `instructors` allowlist/profile table (email-based).
--   2. Adds public.is_instructor() so policies can grant instructors access.
--   3. Adds instructor-scoped RLS policies on the discussion_* tables.
--   4. Adds claim_instructor_profile() — called on first Google login to claim
--      the allowlist row and mirror an `accounts` row so the student mobile app
--      shows the instructor's name + avatar on their replies.
--   5. Adds get_instructor_group_overview() — one round-trip powering the list
--      screens: per-group member count, last message preview, and the number of
--      student messages awaiting a reply (posted after the last instructor msg).
--
-- Safe to run multiple times.
--
-- HOW TO ADD AN INSTRUCTOR (allowlist):
--   insert into public.instructors (email, full_name) values ('prof@gmail.com', 'Jean Dupont');
-- They then sign in with that Google account; the id/avatar fill in automatically.
--
-- BOOTSTRAP THE FIRST ADMIN (can then manage everyone from the app UI):
--   insert into public.instructors (email, full_name, is_admin)
--   values ('vous@gmail.com', 'Votre Nom', true)
--   on conflict do nothing;
--   -- (or) update public.instructors set is_admin = true where lower(email) = 'vous@gmail.com';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. instructors table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instructors (
    id          UUID,                       -- auth.users.id, filled on first login
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin    BOOLEAN NOT NULL DEFAULT FALSE, -- admins manage the allowlist in-app
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add is_admin if the table pre-existed without it.
ALTER TABLE public.instructors ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_instructors_email ON public.instructors (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uniq_instructors_id ON public.instructors (id) WHERE id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructors TO service_role;
GRANT SELECT ON public.instructors TO authenticated;

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- An authenticated user may read their own instructor row (by id or email).
DROP POLICY IF EXISTS instructors_select_self ON public.instructors;
CREATE POLICY instructors_select_self
    ON public.instructors FOR SELECT TO authenticated
    USING (id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'));

-- is_instructor_admin(): active instructor flagged is_admin. SECURITY DEFINER
-- so the admin policies below don't recurse into the table's own RLS.
CREATE OR REPLACE FUNCTION public.is_instructor_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.instructors i
        WHERE i.is_active AND i.is_admin
          AND (i.id = auth.uid() OR LOWER(i.email) = LOWER(auth.jwt() ->> 'email'))
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_instructor_admin() TO authenticated;

-- Admins manage the whole allowlist from the app (read/add/edit/remove).
DROP POLICY IF EXISTS instructors_admin_select ON public.instructors;
CREATE POLICY instructors_admin_select
    ON public.instructors FOR SELECT TO authenticated
    USING (public.is_instructor_admin());

DROP POLICY IF EXISTS instructors_admin_insert ON public.instructors;
CREATE POLICY instructors_admin_insert
    ON public.instructors FOR INSERT TO authenticated
    WITH CHECK (public.is_instructor_admin());

DROP POLICY IF EXISTS instructors_admin_update ON public.instructors;
CREATE POLICY instructors_admin_update
    ON public.instructors FOR UPDATE TO authenticated
    USING (public.is_instructor_admin())
    WITH CHECK (public.is_instructor_admin());

DROP POLICY IF EXISTS instructors_admin_delete ON public.instructors;
CREATE POLICY instructors_admin_delete
    ON public.instructors FOR DELETE TO authenticated
    USING (public.is_instructor_admin());

-- ----------------------------------------------------------------------------
-- 2. is_instructor(): is the current user an active, allowlisted instructor?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.instructors i
        WHERE i.is_active
          AND (i.id = auth.uid() OR LOWER(i.email) = LOWER(auth.jwt() ->> 'email'))
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_instructor() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Instructor-scoped RLS policies (added ALONGSIDE the member policies;
--    permissive policies are OR'd together, so members keep their access).
-- ----------------------------------------------------------------------------

-- discussion_groups: instructors read every group ------------------------------
DROP POLICY IF EXISTS discussion_groups_select_instructor ON public.discussion_groups;
CREATE POLICY discussion_groups_select_instructor
    ON public.discussion_groups FOR SELECT TO authenticated
    USING (public.is_instructor());

-- discussion_group_members: instructors read every membership (counts/avatars) -
DROP POLICY IF EXISTS discussion_group_members_select_instructor ON public.discussion_group_members;
CREATE POLICY discussion_group_members_select_instructor
    ON public.discussion_group_members FOR SELECT TO authenticated
    USING (public.is_instructor());

-- discussion_messages: instructors read every message and post replies ---------
DROP POLICY IF EXISTS discussion_messages_select_instructor ON public.discussion_messages;
CREATE POLICY discussion_messages_select_instructor
    ON public.discussion_messages FOR SELECT TO authenticated
    USING (public.is_instructor());

DROP POLICY IF EXISTS discussion_messages_insert_instructor ON public.discussion_messages;
CREATE POLICY discussion_messages_insert_instructor
    ON public.discussion_messages FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.is_instructor());

DROP POLICY IF EXISTS discussion_messages_update_instructor ON public.discussion_messages;
CREATE POLICY discussion_messages_update_instructor
    ON public.discussion_messages FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND public.is_instructor())
    WITH CHECK (user_id = auth.uid() AND public.is_instructor());

DROP POLICY IF EXISTS discussion_messages_delete_instructor ON public.discussion_messages;
CREATE POLICY discussion_messages_delete_instructor
    ON public.discussion_messages FOR DELETE TO authenticated
    USING (user_id = auth.uid() AND public.is_instructor());

-- discussion_message_attachments: read all / attach to own messages ------------
DROP POLICY IF EXISTS discussion_attachments_select_instructor ON public.discussion_message_attachments;
CREATE POLICY discussion_attachments_select_instructor
    ON public.discussion_message_attachments FOR SELECT TO authenticated
    USING (public.is_instructor());

DROP POLICY IF EXISTS discussion_attachments_insert_instructor ON public.discussion_message_attachments;
CREATE POLICY discussion_attachments_insert_instructor
    ON public.discussion_message_attachments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.discussion_messages m
        WHERE m.id = message_id
          AND m.user_id = auth.uid()
          AND public.is_instructor()
    ));

-- discussion_group_reads: the per-user read policies from 20260603140000 already
-- scope to auth.uid(), so instructors can track their own reads with no change.

-- ----------------------------------------------------------------------------
-- 4. claim_instructor_profile(): called right after Google sign-in.
--    Returns TRUE if the signed-in email is allowlisted (and binds id/profile +
--    mirrors an accounts row so students see a named instructor). FALSE = deny.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_instructor_profile(p_full_name TEXT, p_avatar_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_email  TEXT := LOWER(auth.jwt() ->> 'email');
    v_first  TEXT;
    v_last   TEXT;
    v_name   TEXT := NULLIF(TRIM(COALESCE(p_full_name, '')), '');
    v_avatar TEXT := NULLIF(TRIM(COALESCE(p_avatar_url, '')), '');
BEGIN
    IF v_uid IS NULL OR v_email IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Not allowlisted -> deny.
    IF NOT EXISTS (
        SELECT 1 FROM public.instructors
        WHERE is_active AND LOWER(email) = v_email
    ) THEN
        RETURN FALSE;
    END IF;

    -- Bind the auth id + refresh profile on the allowlist row.
    UPDATE public.instructors
       SET id         = v_uid,
           full_name  = COALESCE(v_name, full_name),
           avatar_url = COALESCE(v_avatar, avatar_url),
           updated_at = NOW()
     WHERE LOWER(email) = v_email;

    -- Split "First Last" -> firstname / lastname.
    v_first := NULLIF(split_part(COALESCE(v_name, ''), ' ', 1), '');
    v_last  := NULLIF(TRIM(SUBSTR(COALESCE(v_name, ''), LENGTH(split_part(COALESCE(v_name, ''), ' ', 1)) + 1)), '');

    -- Mirror an accounts row so the mobile chat renders the instructor's name +
    -- avatar on their replies (messages.user_id is joined to accounts.id).
    INSERT INTO public.accounts (id, "authId", email, type, firstname, lastname, image)
    VALUES (
        v_uid,
        v_uid,
        v_email,
        'instructor',
        v_first,
        v_last,
        CASE WHEN v_avatar IS NOT NULL THEN jsonb_build_object('url', v_avatar) ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE
       SET type      = 'instructor',
           firstname = COALESCE(EXCLUDED.firstname, public.accounts.firstname),
           lastname  = COALESCE(EXCLUDED.lastname,  public.accounts.lastname),
           image     = COALESCE(EXCLUDED.image,     public.accounts.image);

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_instructor_profile(TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. get_instructor_group_overview(): per-group summary for the list screens.
--    pending_count = student messages posted after the last instructor message
--    (i.e. messages awaiting a reply). last_message_* drives the preview line.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_instructor_group_overview()
RETURNS TABLE (
    group_id                   UUID,
    concours_id                UUID,
    secondary_program_id       UUID,
    group_number               INTEGER,
    member_count               INTEGER,
    last_message_at            TIMESTAMP WITH TIME ZONE,
    last_message_preview       TEXT,
    last_message_is_instructor BOOLEAN,
    pending_count              BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        g.id,
        g.concours_id,
        g.secondary_program_id,
        g.group_number,
        COALESCE(
            g.current_member_count,
            (SELECT COUNT(*)::INT FROM public.discussion_group_members m WHERE m.group_id = g.id)
        ) AS member_count,
        lm.created_at AS last_message_at,
        lm.preview    AS last_message_preview,
        COALESCE(lm.is_instr, FALSE) AS last_message_is_instructor,
        COALESCE(pc.pending, 0) AS pending_count
    FROM public.discussion_groups g
    LEFT JOIN LATERAL (
        SELECT
            m.created_at,
            CASE
                WHEN m.text_content IS NOT NULL AND LENGTH(TRIM(m.text_content)) > 0 THEN m.text_content
                WHEN m.tagged_content_type IS NOT NULL THEN '📎 Contenu partagé'
                ELSE '📎 Pièce jointe'
            END AS preview,
            EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = m.user_id) AS is_instr
        FROM public.discussion_messages m
        WHERE m.group_id = g.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) lm ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS pending
        FROM public.discussion_messages m
        WHERE m.group_id = g.id
          AND NOT EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = m.user_id)
          AND m.created_at > COALESCE(
              (SELECT MAX(m2.created_at)
                 FROM public.discussion_messages m2
                WHERE m2.group_id = g.id
                  AND EXISTS (SELECT 1 FROM public.instructors i2 WHERE i2.id = m2.user_id)),
              '-infinity'::TIMESTAMPTZ
          )
    ) pc ON TRUE
    WHERE public.is_instructor();
$$;

GRANT EXECUTE ON FUNCTION public.get_instructor_group_overview() TO authenticated;
