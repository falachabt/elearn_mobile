begin;

create table if not exists public.secondary_daily_content (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.secondary_programs(id) on delete cascade,
    target_date date not null,
    selection_mode text not null default 'auto' check (selection_mode in ('auto', 'manual')),
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists secondary_daily_content_program_id_target_date_key
    on public.secondary_daily_content (program_id, target_date);

create table if not exists public.secondary_daily_content_items (
    id uuid primary key default gen_random_uuid(),
    daily_content_id uuid not null references public.secondary_daily_content(id) on delete cascade,
    item_type text not null check (item_type in ('course', 'quiz', 'exercise')),
    order_index integer not null default 0,
    course_id bigint references public.courses(id) on delete cascade,
    quiz_id uuid references public.quiz(id) on delete cascade,
    exercise_id uuid references public.exercices(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint secondary_daily_content_items_type_ref_check check (
        (item_type = 'course' and course_id is not null and quiz_id is null and exercise_id is null)
        or
        (item_type = 'quiz' and quiz_id is not null and course_id is null and exercise_id is null)
        or
        (item_type = 'exercise' and exercise_id is not null and course_id is null and quiz_id is null)
    )
);

create unique index if not exists secondary_daily_content_items_daily_type_order_key
    on public.secondary_daily_content_items (daily_content_id, item_type, order_index);

create unique index if not exists secondary_daily_content_items_daily_course_key
    on public.secondary_daily_content_items (daily_content_id, course_id)
    where course_id is not null;

create unique index if not exists secondary_daily_content_items_daily_quiz_key
    on public.secondary_daily_content_items (daily_content_id, quiz_id)
    where quiz_id is not null;

create unique index if not exists secondary_daily_content_items_daily_exercise_key
    on public.secondary_daily_content_items (daily_content_id, exercise_id)
    where exercise_id is not null;

create table if not exists public.secondary_daily_user_progress (
    id uuid primary key default gen_random_uuid(),
    daily_content_item_id uuid not null references public.secondary_daily_content_items(id) on delete cascade,
    user_id uuid not null references public.accounts(id) on delete cascade,
    is_completed boolean not null default false,
    completed_at timestamptz,
    completion_source text not null default 'manual' check (
        completion_source in ('course', 'quiz', 'exercise', 'manual')
    ),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists secondary_daily_user_progress_item_user_key
    on public.secondary_daily_user_progress (daily_content_item_id, user_id);

create index if not exists secondary_daily_user_progress_user_id_idx
    on public.secondary_daily_user_progress (user_id);

alter table public.quiz_attempts
    add column if not exists program_id uuid,
    add column if not exists daily_content_item_id uuid;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'quiz_attempts_program_id_fkey'
    ) then
        alter table public.quiz_attempts
            add constraint quiz_attempts_program_id_fkey
            foreign key (program_id) references public.secondary_programs(id) on delete set null;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'quiz_attempts_daily_content_item_id_fkey'
    ) then
        alter table public.quiz_attempts
            add constraint quiz_attempts_daily_content_item_id_fkey
            foreign key (daily_content_item_id) references public.secondary_daily_content_items(id) on delete set null;
    end if;
end $$;

create index if not exists quiz_attempts_program_id_idx
    on public.quiz_attempts (program_id);

create index if not exists quiz_attempts_daily_content_item_id_idx
    on public.quiz_attempts (daily_content_item_id);

create index if not exists quiz_attempts_daily_content_item_status_idx
    on public.quiz_attempts (daily_content_item_id, status, score desc);

create or replace function public.update_secondary_daily_content_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = clock_timestamp();
    return new;
end;
$$;

create or replace function public.update_secondary_daily_user_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = clock_timestamp();
    return new;
end;
$$;

create trigger trigger_update_secondary_daily_content_updated_at
    before update on public.secondary_daily_content
    for each row
    execute function public.update_secondary_daily_content_updated_at();

create trigger trigger_update_secondary_daily_content_items_updated_at
    before update on public.secondary_daily_content_items
    for each row
    execute function public.update_secondary_daily_content_updated_at();

create trigger trigger_update_secondary_daily_user_progress_updated_at
    before update on public.secondary_daily_user_progress
    for each row
    execute function public.update_secondary_daily_user_progress_updated_at();

create or replace function public.validate_secondary_daily_content_item()
returns trigger
language plpgsql
as $$
declare
    v_program_id uuid;
    v_is_valid boolean;
begin
    select program_id
    into v_program_id
    from public.secondary_daily_content
    where id = new.daily_content_id;

    if v_program_id is null then
        raise exception 'Daily content % is introuvable', new.daily_content_id;
    end if;

    if new.item_type = 'course' then
        select exists(
            select 1
            from public.secondary_program_courses
            where program_id = v_program_id
              and course_id = new.course_id
        )
        into v_is_valid;
    elsif new.item_type = 'quiz' then
        select exists(
            select 1
            from public.secondary_program_quizzes
            where program_id = v_program_id
              and quiz_id = new.quiz_id
              and coalesce(is_active, true) = true
        )
        into v_is_valid;
    else
        select exists(
            select 1
            from public.secondary_program_exercises
            where program_id = v_program_id
              and exercise_id = new.exercise_id
              and coalesce(is_active, true) = true
        )
        into v_is_valid;
    end if;

    if not coalesce(v_is_valid, false) then
        raise exception 'Le contenu quotidien % ne correspond pas au programme %', new.id, v_program_id;
    end if;

    return new;
end;
$$;

create trigger trigger_validate_secondary_daily_content_item
    before insert or update on public.secondary_daily_content_items
    for each row
    execute function public.validate_secondary_daily_content_item();

create or replace function public.sync_quiz_attempt_to_secondary_daily_progress()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'completed'
       and new.daily_content_item_id is not null
       and new.user_id is not null then
        insert into public.secondary_daily_user_progress (
            daily_content_item_id,
            user_id,
            is_completed,
            completed_at,
            completion_source,
            metadata
        )
        values (
            new.daily_content_item_id,
            new.user_id,
            true,
            coalesce(new.end_time, clock_timestamp()),
            'quiz',
            jsonb_build_object(
                'quiz_id', new.quiz_id,
                'attempt_id', new.id,
                'score', new.score,
                'program_id', new.program_id
            )
        )
        on conflict (daily_content_item_id, user_id) do update
        set is_completed = true,
            completed_at = excluded.completed_at,
            completion_source = 'quiz',
            metadata = public.secondary_daily_user_progress.metadata || excluded.metadata,
            updated_at = clock_timestamp();
    end if;

    return new;
end;
$$;

create trigger trigger_sync_quiz_attempt_to_secondary_daily_progress
    after insert or update of status, end_time, score, daily_content_item_id
    on public.quiz_attempts
    for each row
    when (new.status = 'completed' and new.daily_content_item_id is not null)
    execute function public.sync_quiz_attempt_to_secondary_daily_progress();

create or replace function public.set_secondary_daily_content(
    p_program_id uuid,
    p_target_date date default current_date,
    p_course_ids bigint[] default '{}'::bigint[],
    p_quiz_ids uuid[] default '{}'::uuid[],
    p_exercise_ids uuid[] default '{}'::uuid[],
    p_selection_mode text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_daily_content_id uuid;
begin
    if p_selection_mode not in ('auto', 'manual') then
        raise exception 'selection_mode invalide: %', p_selection_mode;
    end if;

    insert into public.secondary_daily_content (
        program_id,
        target_date,
        selection_mode,
        generated_at
    )
    values (
        p_program_id,
        p_target_date,
        p_selection_mode,
        clock_timestamp()
    )
    on conflict (program_id, target_date) do update
    set selection_mode = excluded.selection_mode,
        generated_at = excluded.generated_at,
        updated_at = clock_timestamp()
    returning id into v_daily_content_id;

    delete from public.secondary_daily_content_items
    where daily_content_id = v_daily_content_id;

    insert into public.secondary_daily_content_items (
        daily_content_id,
        item_type,
        order_index,
        course_id
    )
    select
        v_daily_content_id,
        'course',
        src.order_index - 1,
        src.course_id
    from unnest(coalesce(p_course_ids, '{}'::bigint[])) with ordinality as src(course_id, order_index);

    insert into public.secondary_daily_content_items (
        daily_content_id,
        item_type,
        order_index,
        quiz_id
    )
    select
        v_daily_content_id,
        'quiz',
        src.order_index - 1,
        src.quiz_id
    from unnest(coalesce(p_quiz_ids, '{}'::uuid[])) with ordinality as src(quiz_id, order_index);

    insert into public.secondary_daily_content_items (
        daily_content_id,
        item_type,
        order_index,
        exercise_id
    )
    select
        v_daily_content_id,
        'exercise',
        src.order_index - 1,
        src.exercise_id
    from unnest(coalesce(p_exercise_ids, '{}'::uuid[])) with ordinality as src(exercise_id, order_index);

    return v_daily_content_id;
end;
$$;

create or replace function public.refresh_secondary_daily_content_for_date(
    p_target_date date default current_date,
    p_course_limit integer default 1,
    p_quiz_limit integer default 3,
    p_exercise_limit integer default 3,
    p_program_id uuid default null,
    p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_program record;
    v_existing record;
    v_course_ids bigint[];
    v_quiz_ids uuid[];
    v_exercise_ids uuid[];
    v_processed_count integer := 0;
begin
    for v_program in
        select id
        from public.secondary_programs
        where coalesce(is_active, true) = true
          and (p_program_id is null or id = p_program_id)
    loop
        select id, selection_mode
        into v_existing
        from public.secondary_daily_content
        where program_id = v_program.id
          and target_date = p_target_date;

        if found and v_existing.selection_mode = 'manual' and not p_force then
            continue;
        end if;

        select coalesce(array_agg(course_id order by sort_key), '{}'::bigint[])
        into v_course_ids
        from (
            select distinct
                spc.course_id,
                md5(v_program.id::text || ':' || p_target_date::text || ':course:' || spc.course_id::text) as sort_key
            from public.secondary_program_courses spc
            join public.courses c on c.id = spc.course_id
            where spc.program_id = v_program.id
              and coalesce(c.status, true) = true
            order by sort_key
            limit greatest(p_course_limit, 0)
        ) course_candidates;

        select coalesce(array_agg(quiz_id order by sort_key), '{}'::uuid[])
        into v_quiz_ids
        from (
            select distinct
                spq.quiz_id,
                md5(v_program.id::text || ':' || p_target_date::text || ':quiz:' || spq.quiz_id::text) as sort_key
            from public.secondary_program_quizzes spq
            join public.quiz q on q.id = spq.quiz_id
            where spq.program_id = v_program.id
              and coalesce(spq.is_active, true) = true
              and coalesce(q.status, true) = true
            order by sort_key
            limit greatest(p_quiz_limit, 0)
        ) quiz_candidates;

        select coalesce(array_agg(exercise_id order by sort_key), '{}'::uuid[])
        into v_exercise_ids
        from (
            select distinct
                spe.exercise_id,
                md5(v_program.id::text || ':' || p_target_date::text || ':exercise:' || spe.exercise_id::text) as sort_key
            from public.secondary_program_exercises spe
            where spe.program_id = v_program.id
              and coalesce(spe.is_active, true) = true
            order by sort_key
            limit greatest(p_exercise_limit, 0)
        ) exercise_candidates;

        perform public.set_secondary_daily_content(
            v_program.id,
            p_target_date,
            v_course_ids,
            v_quiz_ids,
            v_exercise_ids,
            'auto'
        );

        v_processed_count := v_processed_count + 1;
    end loop;

    return v_processed_count;
end;
$$;

create or replace function public.mark_secondary_daily_item_completed(
    p_daily_content_item_id uuid,
    p_user_id uuid default auth.uid(),
    p_completion_source text default 'manual',
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.secondary_daily_user_progress;
begin
    if p_completion_source not in ('course', 'quiz', 'exercise', 'manual') then
        raise exception 'completion_source invalide: %', p_completion_source;
    end if;

    insert into public.secondary_daily_user_progress (
        daily_content_item_id,
        user_id,
        is_completed,
        completed_at,
        completion_source,
        metadata
    )
    values (
        p_daily_content_item_id,
        p_user_id,
        true,
        clock_timestamp(),
        p_completion_source,
        coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (daily_content_item_id, user_id) do update
    set is_completed = true,
        completed_at = clock_timestamp(),
        completion_source = excluded.completion_source,
        metadata = public.secondary_daily_user_progress.metadata || excluded.metadata,
        updated_at = clock_timestamp()
    returning * into v_row;

    return jsonb_build_object(
        'id', v_row.id,
        'dailyContentItemId', v_row.daily_content_item_id,
        'userId', v_row.user_id,
        'isCompleted', v_row.is_completed,
        'completedAt', v_row.completed_at,
        'completionSource', v_row.completion_source
    );
end;
$$;

create or replace function public.get_secondary_daily_content(
    p_program_id uuid,
    p_user_id uuid default auth.uid(),
    p_target_date date default current_date,
    p_auto_create boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_daily_content public.secondary_daily_content;
    v_payload jsonb;
begin
    if p_auto_create then
        perform public.refresh_secondary_daily_content_for_date(
            p_target_date,
            1,
            3,
            3,
            p_program_id,
            false
        );
    end if;

    select *
    into v_daily_content
    from public.secondary_daily_content
    where program_id = p_program_id
      and target_date = p_target_date;

    if not found then
        return null;
    end if;

    select jsonb_build_object(
        'id', v_daily_content.id,
        'programId', v_daily_content.program_id,
        'targetDate', v_daily_content.target_date,
        'selectionMode', v_daily_content.selection_mode,
        'courses', coalesce(courses_payload.items, '[]'::jsonb),
        'quizzes', coalesce(quizzes_payload.items, '[]'::jsonb),
        'exercises', coalesce(exercises_payload.items, '[]'::jsonb),
        'pendingCount',
            coalesce(courses_payload.pending_count, 0)
            + coalesce(quizzes_payload.pending_count, 0)
            + coalesce(exercises_payload.pending_count, 0)
    )
    into v_payload
    from lateral (
        select
            jsonb_agg(
                jsonb_build_object(
                    'dailyContentItemId', item.id,
                    'courseId', course.id,
                    'name', course.name,
                    'orderIndex', item.order_index,
                    'isCompleted', coalesce(progress.is_completed, false),
                    'progressPercentage', coalesce(summary.progress_percentage, 0)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(progress.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.courses course on course.id = item.course_id
        left join public.secondary_daily_user_progress progress
            on progress.daily_content_item_id = item.id
           and progress.user_id = p_user_id
        left join public.course_progress_summary summary
            on summary.course_id = course.id
           and summary.user_id = p_user_id
        where item.daily_content_id = v_daily_content.id
          and item.item_type = 'course'
    ) courses_payload,
    lateral (
        select
            jsonb_agg(
                jsonb_build_object(
                    'dailyContentItemId', item.id,
                    'quizId', quiz.id,
                    'name', quiz.name,
                    'description', quiz.description,
                    'orderIndex', item.order_index,
                    'questionCount', coalesce(question_counts.question_count, 0),
                    'bestScore', coalesce(best_attempt.best_score, 0),
                    'isCompleted', coalesce(progress.is_completed, false)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(progress.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.quiz quiz on quiz.id = item.quiz_id
        left join lateral (
            select count(*)::integer as question_count
            from public.quiz_questions question
            where question."quizId" = quiz.id
        ) question_counts on true
        left join lateral (
            select max(score)::numeric as best_score
            from public.quiz_attempts attempt
            where attempt.daily_content_item_id = item.id
              and attempt.user_id = p_user_id
              and attempt.status = 'completed'
        ) best_attempt on true
        left join public.secondary_daily_user_progress progress
            on progress.daily_content_item_id = item.id
           and progress.user_id = p_user_id
        where item.daily_content_id = v_daily_content.id
          and item.item_type = 'quiz'
    ) quizzes_payload,
    lateral (
        select
            jsonb_agg(
                jsonb_build_object(
                    'dailyContentItemId', item.id,
                    'exerciseId', exercise.id,
                    'title', exercise.title,
                    'description', exercise.description,
                    'orderIndex', item.order_index,
                    'courseId', exercise.course_id,
                    'isCompleted', coalesce(progress.is_completed, false)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(progress.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.exercices exercise on exercise.id = item.exercise_id
        left join public.secondary_daily_user_progress progress
            on progress.daily_content_item_id = item.id
           and progress.user_id = p_user_id
        where item.daily_content_id = v_daily_content.id
          and item.item_type = 'exercise'
    ) exercises_payload;

    return v_payload;
end;
$$;

create or replace function public.get_secondary_daily_content_for_programs(
    p_program_ids uuid[],
    p_user_id uuid default auth.uid(),
    p_target_date date default current_date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_agg(result.payload order by result.program_id) filter (where result.payload is not null),
        '[]'::jsonb
    )
    from (
        select distinct
            program_id,
            public.get_secondary_daily_content(program_id, p_user_id, p_target_date, true) as payload
        from unnest(coalesce(p_program_ids, '{}'::uuid[])) as program_id
    ) result;
$$;

create or replace function public.get_secondary_daily_quiz_leaderboard(
    p_program_id uuid,
    p_daily_content_item_id uuid default null,
    p_quiz_id uuid default null,
    p_target_date date default current_date,
    p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_daily_content_item_id uuid;
    v_quiz_id uuid;
    v_payload jsonb;
begin
    if p_daily_content_item_id is not null then
        select item.id, item.quiz_id
        into v_daily_content_item_id, v_quiz_id
        from public.secondary_daily_content_items item
        join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
        where item.id = p_daily_content_item_id
          and daily_content.program_id = p_program_id
          and daily_content.target_date = p_target_date
          and item.item_type = 'quiz';
    else
        select item.id, item.quiz_id
        into v_daily_content_item_id, v_quiz_id
        from public.secondary_daily_content_items item
        join public.secondary_daily_content daily_content on daily_content.id = item.daily_content_id
        where daily_content.program_id = p_program_id
          and daily_content.target_date = p_target_date
          and item.item_type = 'quiz'
          and (p_quiz_id is null or item.quiz_id = p_quiz_id)
        order by item.order_index
        limit 1;
    end if;

    if v_daily_content_item_id is null then
        return jsonb_build_object(
            'dailyContentItemId', null,
            'quizId', p_quiz_id,
            'entries', '[]'::jsonb
        );
    end if;

    with ranked_attempts as (
        select
            attempt.id,
            attempt.user_id,
            coalesce(attempt.score, 0) as score,
            attempt.start_time,
            attempt.end_time,
            coalesce(
                attempt."timeSpent",
                floor(extract(epoch from (attempt.end_time - attempt.start_time)))::integer,
                0
            ) as time_spent,
            row_number() over (
                partition by attempt.user_id
                order by
                    coalesce(attempt.score, 0) desc,
                    coalesce(
                        attempt."timeSpent",
                        floor(extract(epoch from (attempt.end_time - attempt.start_time)))::integer,
                        0
                    ) asc,
                    attempt.end_time asc nulls last,
                    attempt.id asc
            ) as user_attempt_rank
        from public.quiz_attempts attempt
        where attempt.program_id = p_program_id
          and attempt.daily_content_item_id = v_daily_content_item_id
          and attempt.status = 'completed'
    ),
    best_attempts as (
        select *
        from ranked_attempts
        where user_attempt_rank = 1
    ),
    ordered_entries as (
        select
            row_number() over (
                order by
                    best_attempts.score desc,
                    best_attempts.time_spent asc,
                    best_attempts.end_time asc nulls last,
                    best_attempts.id asc
            ) as rank,
            best_attempts.*,
            account.firstname,
            account.lastname,
            account.image
        from best_attempts
        join public.accounts account on account.id = best_attempts.user_id
    )
    select jsonb_build_object(
        'dailyContentItemId', v_daily_content_item_id,
        'quizId', v_quiz_id,
        'entries',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'rank', entry.rank,
                        'attemptId', entry.id,
                        'userId', entry.user_id,
                        'score', entry.score,
                        'timeSpent', entry.time_spent,
                        'firstname', entry.firstname,
                        'lastname', entry.lastname,
                        'image', entry.image
                    )
                    order by entry.rank
                )
                from (
                    select *
                    from ordered_entries
                    order by rank
                    limit greatest(p_limit, 1)
                ) entry
            ),
            '[]'::jsonb
        )
    )
    into v_payload;

    return v_payload;
end;
$$;

alter table public.secondary_daily_content enable row level security;
alter table public.secondary_daily_content_items enable row level security;
alter table public.secondary_daily_user_progress enable row level security;

create policy "Users view secondary daily content"
    on public.secondary_daily_content
    for select
    using (true);

create policy "Users view secondary daily content items"
    on public.secondary_daily_content_items
    for select
    using (true);

create policy "Users manage own secondary daily progress"
    on public.secondary_daily_user_progress
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

grant select on public.secondary_daily_content to authenticated, anon;
grant select on public.secondary_daily_content_items to authenticated, anon;
grant select, insert, update on public.secondary_daily_user_progress to authenticated;

revoke all on function public.set_secondary_daily_content(uuid, date, bigint[], uuid[], uuid[], text) from public, anon, authenticated;
revoke all on function public.refresh_secondary_daily_content_for_date(date, integer, integer, integer, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_secondary_daily_content(uuid, date, bigint[], uuid[], uuid[], text) to service_role;
grant execute on function public.refresh_secondary_daily_content_for_date(date, integer, integer, integer, uuid, boolean) to service_role;

revoke all on function public.mark_secondary_daily_item_completed(uuid, uuid, text, jsonb) from public;
revoke all on function public.get_secondary_daily_content(uuid, uuid, date, boolean) from public;
revoke all on function public.get_secondary_daily_content_for_programs(uuid[], uuid, date) from public;
revoke all on function public.get_secondary_daily_quiz_leaderboard(uuid, uuid, uuid, date, integer) from public;

grant execute on function public.mark_secondary_daily_item_completed(uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.get_secondary_daily_content(uuid, uuid, date, boolean) to authenticated, anon, service_role;
grant execute on function public.get_secondary_daily_content_for_programs(uuid[], uuid, date) to authenticated, anon, service_role;
grant execute on function public.get_secondary_daily_quiz_leaderboard(uuid, uuid, uuid, date, integer) to authenticated, anon, service_role;

commit;
