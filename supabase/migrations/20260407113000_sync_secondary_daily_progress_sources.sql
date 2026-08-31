begin;

create or replace function public.sync_secondary_daily_progress_from_sources(
    p_program_id uuid,
    p_user_id uuid default auth.uid(),
    p_target_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_daily_content_id uuid;
begin
    if p_user_id is null then
        return;
    end if;

    select id
    into v_daily_content_id
    from public.secondary_daily_content
    where program_id = p_program_id
      and target_date = p_target_date;

    if v_daily_content_id is null then
        return;
    end if;

    insert into public.secondary_daily_user_progress (
        daily_content_item_id,
        user_id,
        is_completed,
        completed_at,
        completion_source,
        metadata
    )
    select
        item.id,
        p_user_id,
        true,
        clock_timestamp(),
        'course',
        jsonb_build_object(
            'course_id', item.course_id,
            'program_id', p_program_id,
            'progress_percentage', coalesce(summary.progress_percentage, 0)
        )
    from public.secondary_daily_content_items item
    join public.course_progress_summary summary
      on summary.course_id = item.course_id
     and summary.user_id = p_user_id
    where item.daily_content_id = v_daily_content_id
      and item.item_type = 'course'
      and coalesce(summary.is_completed, false)
    on conflict (daily_content_item_id, user_id) do update
    set is_completed = true,
        completed_at = coalesce(public.secondary_daily_user_progress.completed_at, excluded.completed_at),
        completion_source = 'course',
        metadata = public.secondary_daily_user_progress.metadata || excluded.metadata,
        updated_at = clock_timestamp();

    insert into public.secondary_daily_user_progress (
        daily_content_item_id,
        user_id,
        is_completed,
        completed_at,
        completion_source,
        metadata
    )
    select
        item.id,
        p_user_id,
        true,
        clock_timestamp(),
        'exercise',
        jsonb_build_object(
            'exercise_id', item.exercise_id,
            'program_id', p_program_id
        )
    from public.secondary_daily_content_items item
    join public.exercices_complete exercise_completion
      on exercise_completion.exercice_id = item.exercise_id
     and exercise_completion.user_id = p_user_id
    where item.daily_content_id = v_daily_content_id
      and item.item_type = 'exercise'
      and coalesce(exercise_completion.is_completed, false)
    on conflict (daily_content_item_id, user_id) do update
    set is_completed = true,
        completed_at = coalesce(public.secondary_daily_user_progress.completed_at, excluded.completed_at),
        completion_source = 'exercise',
        metadata = public.secondary_daily_user_progress.metadata || excluded.metadata,
        updated_at = clock_timestamp();

    insert into public.secondary_daily_user_progress (
        daily_content_item_id,
        user_id,
        is_completed,
        completed_at,
        completion_source,
        metadata
    )
    select
        item.id,
        p_user_id,
        true,
        coalesce(best_attempt.end_time, clock_timestamp()),
        'quiz',
        jsonb_build_object(
            'quiz_id', item.quiz_id,
            'attempt_id', best_attempt.id,
            'score', best_attempt.score,
            'program_id', coalesce(best_attempt.program_id, p_program_id)
        )
    from public.secondary_daily_content_items item
    join lateral (
        select
            attempt.id,
            attempt.score,
            attempt.end_time,
            attempt.program_id,
            coalesce(
                attempt."timeSpent",
                floor(extract(epoch from (attempt.end_time - attempt.start_time)))::integer,
                0
            ) as time_spent
        from public.quiz_attempts attempt
        where attempt.quiz_id = item.quiz_id
          and attempt.user_id = p_user_id
          and attempt.status = 'completed'
        order by
            coalesce(attempt.score, 0) desc,
            coalesce(
                attempt."timeSpent",
                floor(extract(epoch from (attempt.end_time - attempt.start_time)))::integer,
                0
            ) asc,
            attempt.end_time desc nulls last,
            attempt.id desc
        limit 1
    ) best_attempt on true
    where item.daily_content_id = v_daily_content_id
      and item.item_type = 'quiz'
    on conflict (daily_content_item_id, user_id) do update
    set is_completed = true,
        completed_at = coalesce(public.secondary_daily_user_progress.completed_at, excluded.completed_at),
        completion_source = 'quiz',
        metadata = public.secondary_daily_user_progress.metadata || excluded.metadata,
        updated_at = clock_timestamp();
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

    perform public.sync_secondary_daily_progress_from_sources(
        p_program_id,
        p_user_id,
        p_target_date
    );

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
                    'isCompleted', coalesce(summary.is_completed, false),
                    'progressPercentage', coalesce(summary.progress_percentage, 0)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(summary.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.courses course on course.id = item.course_id
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
                    'bestScore', coalesce(user_attempts.best_score, 0),
                    'isCompleted', coalesce(user_attempts.is_completed, false)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(user_attempts.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.quiz quiz on quiz.id = item.quiz_id
        left join lateral (
            select count(*)::integer as question_count
            from public.quiz_questions question
            where question."quizId" = quiz.id
        ) question_counts on true
        left join lateral (
            select
                max(attempt.score)::numeric as best_score,
                count(*) > 0 as is_completed
            from public.quiz_attempts attempt
            where attempt.quiz_id = quiz.id
              and attempt.user_id = p_user_id
              and attempt.status = 'completed'
        ) user_attempts on true
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
                    'isCompleted', coalesce(exercise_completion.is_completed, false)
                )
                order by item.order_index
            ) as items,
            count(*) filter (where not coalesce(exercise_completion.is_completed, false)) as pending_count
        from public.secondary_daily_content_items item
        join public.exercices exercise on exercise.id = item.exercise_id
        left join public.exercices_complete exercise_completion
            on exercise_completion.exercice_id = exercise.id
           and exercise_completion.user_id = p_user_id
        where item.daily_content_id = v_daily_content.id
          and item.item_type = 'exercise'
    ) exercises_payload;

    return v_payload;
end;
$$;

revoke all on function public.sync_secondary_daily_progress_from_sources(uuid, uuid, date) from public, anon, authenticated;
grant execute on function public.sync_secondary_daily_progress_from_sources(uuid, uuid, date) to service_role;

commit;
