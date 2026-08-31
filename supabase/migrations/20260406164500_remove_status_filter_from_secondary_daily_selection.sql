begin;

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
            select
                course_candidates.course_id,
                md5(
                    v_program.id::text
                    || ':' || p_target_date::text
                    || ':course:' || course_candidates.course_id::text
                ) as sort_key
            from (
                select distinct spc.course_id
                from public.secondary_program_courses spc
                join public.courses c on c.id = spc.course_id
                where spc.program_id = v_program.id
            ) course_candidates
            order by sort_key
            limit greatest(p_course_limit, 0)
        ) ranked_courses;

        select coalesce(array_agg(quiz_id order by sort_key), '{}'::uuid[])
        into v_quiz_ids
        from (
            select
                quiz_candidates.quiz_id,
                md5(
                    v_program.id::text
                    || ':' || p_target_date::text
                    || ':quiz:' || quiz_candidates.quiz_id::text
                ) as sort_key
            from (
                select distinct spq.quiz_id
                from public.secondary_program_quizzes spq
                where spq.program_id = v_program.id
                  and coalesce(spq.is_active, true) = true
                  and spq.quiz_id is not null

                union

                select distinct qc."quizId" as quiz_id
                from public.secondary_program_courses spc
                join public.quiz_courses qc on qc."courseId" = spc.course_id
                where spc.program_id = v_program.id
            ) quiz_candidates
            join public.quiz q on q.id = quiz_candidates.quiz_id
            order by sort_key
            limit greatest(p_quiz_limit, 0)
        ) ranked_quizzes;

        select coalesce(array_agg(exercise_id order by sort_key), '{}'::uuid[])
        into v_exercise_ids
        from (
            select
                exercise_candidates.exercise_id,
                md5(
                    v_program.id::text
                    || ':' || p_target_date::text
                    || ':exercise:' || exercise_candidates.exercise_id::text
                ) as sort_key
            from (
                select distinct spe.exercise_id
                from public.secondary_program_exercises spe
                where spe.program_id = v_program.id
                  and coalesce(spe.is_active, true) = true
                  and spe.exercise_id is not null

                union

                select distinct exercise.id as exercise_id
                from public.secondary_program_courses spc
                join public.exercices exercise on exercise.course_id = spc.course_id
                where spc.program_id = v_program.id
            ) exercise_candidates
            order by sort_key
            limit greatest(p_exercise_limit, 0)
        ) ranked_exercises;

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

commit;
