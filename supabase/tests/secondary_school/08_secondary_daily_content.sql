begin;

select plan(23);

delete from public.secondary_daily_user_progress
where user_id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.quiz_attempts
where user_id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.course_progress_summary
where user_id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.exercices_complete
where user_id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.accounts
where id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from auth.users
where id = any (
    array[
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.secondary_daily_user_progress
where daily_content_item_id in (
    select id
    from public.secondary_daily_content_items
    where daily_content_id in (
        select id
        from public.secondary_daily_content
        where program_id = 'd3333333-3333-3333-3333-333333333333'
    )
);

delete from public.secondary_daily_content
where program_id = 'd3333333-3333-3333-3333-333333333333';

delete from public.secondary_program_courses
where program_id = 'd3333333-3333-3333-3333-333333333333';

delete from public.secondary_programs
where id = 'd3333333-3333-3333-3333-333333333333';

delete from public.secondary_series
where id = 'd2222222-2222-2222-2222-222222222222';

delete from public.secondary_classes
where id = 'd1111111-1111-1111-1111-111111111111';

delete from public.quiz_courses
where "quizId" = any (
    array[
    'd4444444-4444-4444-4444-444444444444',
    'd5555555-5555-5555-5555-555555555555'
    ]::uuid[]
);

delete from public.secondary_program_quizzes
where program_id = 'd3333333-3333-3333-3333-333333333333';

delete from public.secondary_program_exercises
where program_id = 'd3333333-3333-3333-3333-333333333333';

delete from public.quiz
where id = any (
    array[
    'd4444444-4444-4444-4444-444444444444',
    'd5555555-5555-5555-5555-555555555555'
    ]::uuid[]
);

delete from public.exercices
where id = any (
    array[
    'd8000000-0000-0000-0000-000000000001',
    'd8000000-0000-0000-0000-000000000002'
    ]::uuid[]
);

delete from public.courses
where id in (9901, 9902);

insert into public.secondary_classes (id, name, level)
values ('d1111111-1111-1111-1111-111111111111', 'Terminale Test Daily', 1);

insert into public.secondary_series (id, name, class_id)
values ('d2222222-2222-2222-2222-222222222222', 'Série Daily', 'd1111111-1111-1111-1111-111111111111');

insert into public.secondary_programs (id, class_id, series_id, price, duration, is_active)
values ('d3333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 0, interval '1 year', true);

insert into public.courses (id, name, status)
values
    (9901, 'Cours Daily 1', false),
    (9902, 'Cours Daily 2', false);

insert into public.exercices (id, course_id, title, content)
values
    ('d8000000-0000-0000-0000-000000000001', 9901, 'Exercice Daily 1', '{}'::jsonb),
    ('d8000000-0000-0000-0000-000000000002', 9901, 'Exercice Daily 2', '{}'::jsonb);

insert into public.quiz (id, name, status)
values
    ('d4444444-4444-4444-4444-444444444444', 'Quiz Daily 1', false),
    ('d5555555-5555-5555-5555-555555555555', 'Quiz Daily 2', false);

insert into public.quiz_courses ("quizId", "courseId")
values
    ('d4444444-4444-4444-4444-444444444444', 9901),
    ('d5555555-5555-5555-5555-555555555555', 9901);

insert into public.secondary_program_courses (program_id, course_id, order_index)
values
    ('d3333333-3333-3333-3333-333333333333', 9901, 0),
    ('d3333333-3333-3333-3333-333333333333', 9902, 1);

delete from public.secondary_program_quizzes
where program_id = 'd3333333-3333-3333-3333-333333333333';

delete from public.secondary_program_exercises
where program_id = 'd3333333-3333-3333-3333-333333333333';

select is(
    public.refresh_secondary_daily_content_for_date(
        '2026-04-05',
        1,
        2,
        2,
        'd3333333-3333-3333-3333-333333333333',
        true
    ),
    1,
    'Le refresh quotidien traite le programme ciblé'
);

select ok(
    exists(
        select 1
        from public.secondary_daily_content
        where program_id = 'd3333333-3333-3333-3333-333333333333'
          and target_date = '2026-04-05'
    ),
    'La ligne de secondary_daily_content est créée'
);

select is(
    (
        select count(*)::integer
        from public.secondary_daily_content_items item
        join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
        where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
          and daily_content.target_date = '2026-04-05'
          and item.item_type = 'course'
    ),
    1,
    'Un cours du jour est généré'
);

select is(
    (
        select count(*)::integer
        from public.secondary_daily_content_items item
        join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
        where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
          and daily_content.target_date = '2026-04-05'
          and item.item_type = 'quiz'
    ),
    2,
    'Deux quiz du jour sont générés'
);

select is(
    (
        select count(*)::integer
        from public.secondary_daily_content_items item
        join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
        where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
          and daily_content.target_date = '2026-04-05'
          and item.item_type = 'exercise'
    ),
    2,
    'Deux exercices du jour sont générés'
);

select is(
    jsonb_array_length(
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            null,
            '2026-04-05',
            false
        )->'quizzes'
    ),
    2,
    'La RPC retourne bien les quiz du jour'
);

select is(
    (public.get_secondary_daily_content(
        'd3333333-3333-3333-3333-333333333333',
        null,
        '2026-04-05',
        false
    )->>'pendingCount')::integer,
    5,
    'Le pendingCount agrège les éléments du jour'
);

select ok(
    public.set_secondary_daily_content(
        'd3333333-3333-3333-3333-333333333333',
        '2026-04-05',
        array[9902]::bigint[],
        array['d5555555-5555-5555-5555-555555555555']::uuid[],
        array['d8000000-0000-0000-0000-000000000002']::uuid[],
        'manual'
    ) is not null,
    'Le mode manuel peut remplacer la sélection du jour'
);

select is(
    (
        select selection_mode
        from public.secondary_daily_content
        where program_id = 'd3333333-3333-3333-3333-333333333333'
          and target_date = '2026-04-05'
    ),
    'manual',
    'Le contenu du jour est bien passé en mode manuel'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            null,
            '2026-04-05',
            false
        )->'courses'->0->>'courseId'
    )::bigint,
    9902::bigint,
    'Le cours manuel est exposé par la RPC'
);

select is(
    public.refresh_secondary_daily_content_for_date(
        '2026-04-05',
        1,
        2,
        2,
        'd3333333-3333-3333-3333-333333333333',
        false
    ),
    0,
    'Le refresh auto ne remplace pas un contenu manuel'
);

insert into auth.users (id, instance_id, email, encrypted_password, role, aud, email_confirmed_at, created_at, updated_at)
values
    (
        'd1000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'daily-one@example.com',
        crypt('daily-password', gen_salt('bf')),
        'authenticated',
        'authenticated',
        now(),
        now(),
        now()
    ),
    (
        'd1000000-0000-0000-0000-000000000002'::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'daily-two@example.com',
        crypt('daily-password', gen_salt('bf')),
        'authenticated',
        'authenticated',
        now(),
        now(),
        now()
    )
on conflict (id) do nothing;

insert into public.accounts (id, email, "authId", firstname, lastname, type)
values
    ('d1000000-0000-0000-0000-000000000001', 'daily-one@example.com', 'd1000000-0000-0000-0000-000000000001', 'Alice', 'Daily', 'student'),
    ('d1000000-0000-0000-0000-000000000002', 'daily-two@example.com', 'd1000000-0000-0000-0000-000000000002', 'Bob', 'Daily', 'student');

insert into public.course_progress_summary (
    user_id,
    course_id,
    total_sections,
    completed_sections,
    last_updated,
    progress_percentage,
    is_completed
)
values (
    'd1000000-0000-0000-0000-000000000001',
    9902,
    4,
    2,
    now(),
    50,
    false
);

insert into public.exercices_complete (
    user_id,
    exercice_id,
    is_completed
)
values (
    'd1000000-0000-0000-0000-000000000001',
    'd8000000-0000-0000-0000-000000000002',
    true
);

insert into public.quiz_attempts (
    user_id,
    quiz_id,
    program_id,
    daily_content_item_id,
    start_time,
    end_time,
    score,
    status,
    "timeSpent"
)
values (
    'd1000000-0000-0000-0000-000000000001',
    'd5555555-5555-5555-5555-555555555555',
    'd3333333-3333-3333-3333-333333333333',
    null,
    '2026-04-05 07:30:00'::timestamp,
    '2026-04-05 07:37:00'::timestamp,
    78,
    'completed',
    420
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->'courses'->0->>'progressPercentage'
    )::numeric,
    50::numeric,
    'Le cours du jour expose la progression existante du cours'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->'quizzes'->0->>'isCompleted'
    )::boolean,
    true,
    'Un quiz déjà réussi hors daily est remonté comme complété'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->'exercises'->0->>'isCompleted'
    )::boolean,
    true,
    'Un exercice déjà complété est remonté comme complété'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->>'pendingCount'
    )::integer,
    1,
    'Le pendingCount tient compte des quiz et exercices déjà faits'
);

select is(
    (
        select count(*)::integer
        from public.secondary_daily_user_progress progress
        where progress.user_id = 'd1000000-0000-0000-0000-000000000001'
          and progress.is_completed = true
    ),
    2,
    'Les complétions existantes sont synchronisées dans secondary_daily_user_progress'
);

update public.course_progress_summary
set completed_sections = 4,
    progress_percentage = 100,
    is_completed = true,
    last_updated = now()
where user_id = 'd1000000-0000-0000-0000-000000000001'
  and course_id = 9902;

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->'courses'->0->>'isCompleted'
    )::boolean,
    true,
    'Le cours du jour devient complété quand le résumé de progression est complété'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->>'pendingCount'
    )::integer,
    0,
    'Le pendingCount passe à zéro quand tout est déjà fait'
);

insert into public.quiz_attempts (
    user_id,
    quiz_id,
    program_id,
    daily_content_item_id,
    start_time,
    end_time,
    score,
    status,
    "timeSpent"
)
select
    'd1000000-0000-0000-0000-000000000001',
    item.quiz_id,
    'd3333333-3333-3333-3333-333333333333',
    item.id,
    '2026-04-05 08:00:00'::timestamp,
    '2026-04-05 08:08:00'::timestamp,
    95,
    'completed',
    480
from public.secondary_daily_content_items item
join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
  and daily_content.target_date = '2026-04-05'
  and item.item_type = 'quiz'
limit 1;

insert into public.quiz_attempts (
    user_id,
    quiz_id,
    program_id,
    daily_content_item_id,
    start_time,
    end_time,
    score,
    status,
    "timeSpent"
)
select
    'd1000000-0000-0000-0000-000000000002',
    item.quiz_id,
    'd3333333-3333-3333-3333-333333333333',
    item.id,
    '2026-04-05 08:00:00'::timestamp,
    '2026-04-05 08:06:00'::timestamp,
    88,
    'completed',
    360
from public.secondary_daily_content_items item
join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
  and daily_content.target_date = '2026-04-05'
  and item.item_type = 'quiz'
limit 1;

select is(
    (
        select count(*)::integer
        from public.secondary_daily_user_progress progress
        where progress.user_id = 'd1000000-0000-0000-0000-000000000001'
          and progress.completion_source = 'quiz'
    ),
    1,
    'Les tentatives de quiz du jour synchronisent la progression quotidienne'
);

select is(
    (
        public.get_secondary_daily_quiz_leaderboard(
            'd3333333-3333-3333-3333-333333333333',
            null,
            'd5555555-5555-5555-5555-555555555555',
            '2026-04-05',
            10
        )->'entries'->0->>'firstname'
    ),
    'Alice',
    'Le leaderboard du quiz du jour est trié par meilleur score'
);

select is(
    jsonb_array_length(
        public.get_secondary_daily_quiz_leaderboard(
            'd3333333-3333-3333-3333-333333333333',
            null,
            'd5555555-5555-5555-5555-555555555555',
            '2026-04-05',
            10
        )->'entries'
    ),
    2,
    'Le leaderboard retourne les meilleurs élèves uniques'
);

select is(
    (public.mark_secondary_daily_item_completed(
        (
            select item.id
            from public.secondary_daily_content_items item
            join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
            where daily_content.program_id = 'd3333333-3333-3333-3333-333333333333'
              and daily_content.target_date = '2026-04-05'
              and item.item_type = 'exercise'
            limit 1
        ),
        'd1000000-0000-0000-0000-000000000001',
        'exercise',
        jsonb_build_object('exercise_id', 'd8000000-0000-0000-0000-000000000002')
    )->>'isCompleted')::boolean,
    true,
    'La RPC peut marquer un exercice du jour comme complété'
);

select is(
    (
        public.get_secondary_daily_content(
            'd3333333-3333-3333-3333-333333333333',
            'd1000000-0000-0000-0000-000000000001',
            '2026-04-05',
            false
        )->>'pendingCount'
    )::integer,
    1,
    'Le pendingCount diminue selon la progression utilisateur'
);

select * from finish();
rollback;
