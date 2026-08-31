-- Tests: Discussion groups system (tables, constraint fix, triggers, RLS, RPC)
-- Covers the regression where the unique constraint omitted secondary_program_id,
-- which prevented Série C / D from ever getting a group.

begin;

select plan(22);

-- ---- Structure --------------------------------------------------------------
select has_table('public', 'discussion_groups', 'discussion_groups table exists');
select has_table('public', 'discussion_group_members', 'discussion_group_members table exists');
select has_table('public', 'discussion_messages', 'discussion_messages table exists');
select has_table('public', 'discussion_message_attachments', 'discussion_message_attachments table exists');
select has_table('public', 'discussion_group_reads', 'discussion_group_reads table exists');
select has_table(
    'public',
    'discussion_message_notification_deliveries',
    'discussion_message_notification_deliveries table exists'
);

-- ---- Functions --------------------------------------------------------------
select has_function('public', 'is_discussion_group_member', 'is_discussion_group_member() exists');
select has_function('public', 'get_secondary_enrollment_counts', 'get_secondary_enrollment_counts() exists');
select has_function('public', 'get_learningpath_enrollment_counts', 'get_learningpath_enrollment_counts() exists');
select has_function('public', 'create_discussion_group_for_program', 'group auto-create function exists');
select has_function('public', 'get_discussion_unread_counts', 'get_discussion_unread_counts() exists');
select has_function(
    'public',
    'enqueue_discussion_message_push_notification',
    'discussion message push enqueue function exists'
);

-- is_discussion_group_member must be SECURITY DEFINER (so RLS policies can use it)
select ok(
    (select prosecdef from pg_proc where proname = 'is_discussion_group_member' limit 1),
    'is_discussion_group_member is SECURITY DEFINER'
);

-- ---- RLS enabled ------------------------------------------------------------
select ok(
    (select relrowsecurity from pg_class where oid = 'public.discussion_groups'::regclass),
    'RLS enabled on discussion_groups'
);
select ok(
    (select relrowsecurity from pg_class where oid = 'public.discussion_messages'::regclass),
    'RLS enabled on discussion_messages'
);
select ok(
    (select relrowsecurity from pg_class where oid = 'public.user_secondary_enrollments'::regclass),
    'RLS enabled on user_secondary_enrollments'
);
select ok(
    (select relrowsecurity from pg_class where oid = 'public.discussion_group_reads'::regclass),
    'RLS enabled on discussion_group_reads'
);
select ok(
    (select relrowsecurity from pg_class where oid = 'public.discussion_message_notification_deliveries'::regclass),
    'RLS enabled on discussion_message_notification_deliveries'
);

-- ---- Policies ---------------------------------------------------------------
select ok(
    exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'discussion_messages'
          and policyname = 'discussion_messages_insert'
    ),
    'discussion_messages insert policy exists'
);

-- ---- Realtime publication ---------------------------------------------------
select ok(
    exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public'
          and tablename = 'discussion_messages'
    ),
    'discussion_messages added to supabase_realtime publication'
);

-- ---- Push notification webhook trigger -------------------------------------
select ok(
    exists (
        select 1
        from pg_trigger
        where tgrelid = 'public.discussion_messages'::regclass
          and tgname = 'trigger_enqueue_discussion_message_push_notification'
          and not tgisinternal
    ),
    'discussion_messages insert push trigger exists'
);

-- ---- Regression: two secondary programs can BOTH own group #1 ---------------
-- (the old constraint shared the NULL-concours namespace and blocked this)
do $$
declare p1 uuid := 'fafafafa-0000-0000-0000-000000000001';
        p2 uuid := 'fafafafa-0000-0000-0000-000000000002';
begin
    insert into public.secondary_programs (id) values (p1), (p2);
end $$;

select is(
    (select count(*)::int
       from public.discussion_groups
      where secondary_program_id in (
            'fafafafa-0000-0000-0000-000000000001'::uuid,
            'fafafafa-0000-0000-0000-000000000002'::uuid)
        and group_number = 1),
    2,
    'each new secondary program gets its own group #1 (constraint fix)'
);

select * from finish();
rollback;
