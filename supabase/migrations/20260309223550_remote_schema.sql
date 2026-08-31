create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

drop extension if exists "pg_net";

alter table "public"."quiz_attempts" drop constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."tickets" drop constraint "tickets_status_check";

alter table "public"."tickets_messages" drop constraint "tickets_messages_message_type_check";

alter table "public"."user_answers" drop constraint "user_answers_question_id_fkey";


  create table "public"."concours_learningpaths_backup" (
    "id" bigint,
    "created_at" timestamp with time zone,
    "learningPathId" uuid,
    "concourId" uuid,
    "price" integer,
    "isActive" boolean,
    "metadata" jsonb
      );


alter table "public"."app_config" add column "updated_at" timestamp with time zone;

alter table "public"."concours" add column "isActive" boolean not null default true;

alter table "public"."concours" enable row level security;

alter table "public"."concours_learningpaths" enable row level security;

alter table "public"."news" disable row level security;

CREATE INDEX "course_learningpath_courseId_idx" ON public.course_learningpath USING btree ("courseId");

CREATE INDEX "course_learningpath_lpId_idx" ON public.course_learningpath USING btree ("lpId");

CREATE INDEX exercices_complete_exercice_id_idx ON public.exercices_complete USING btree (exercice_id);

CREATE INDEX exercices_complete_user_id_idx ON public.exercices_complete USING btree (user_id);

CREATE INDEX exercices_course_id_idx ON public.exercices USING btree (course_id);

CREATE INDEX idx_concours_isactive ON public.concours USING btree ("isActive");

CREATE INDEX idx_concours_learningpaths_concourid ON public.concours_learningpaths USING btree ("concourId");

CREATE INDEX idx_concours_learningpaths_isactive ON public.concours_learningpaths USING btree ("isActive");

CREATE INDEX "quiz_learningpath_lpId_idx" ON public.quiz_learningpath USING btree ("lpId");

CREATE INDEX user_activity_last_heartbeat_idx ON public.user_activity USING btree (last_heartbeat);

CREATE INDEX usercourseprogress_lastaccessed_idx ON public.usercourseprogress USING btree (lastaccessed);

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."tickets" add constraint "tickets_status_check" CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[]))) not valid;

alter table "public"."tickets" validate constraint "tickets_status_check";

alter table "public"."tickets_messages" add constraint "tickets_messages_message_type_check" CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'system'::character varying])::text[]))) not valid;

alter table "public"."tickets_messages" validate constraint "tickets_messages_message_type_check";

alter table "public"."user_answers" add constraint "user_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_answers" validate constraint "user_answers_question_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_concours_isactive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- If concours deleted, set related learningpaths isActive = false
    UPDATE public.concours_learningpaths
    SET "isActive" = false
    WHERE "concourId" = OLD.id;
    RETURN OLD;
  ELSE
    -- INSERT or UPDATE: set learningpaths isActive to NEW.isActive
    UPDATE public.concours_learningpaths
    SET "isActive" = NEW."isActive"
    WHERE "concourId" = NEW.id;
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_concours_learningpaths_isactive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- only act when concours.isActive changed
    IF OLD."isActive" IS DISTINCT FROM NEW."isActive" THEN
      UPDATE public.concours_learningpaths
      SET "isActive" = NEW."isActive"
      WHERE "concourId" = NEW.id;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- when a new concours is inserted, ensure related learningpaths (if any) follow it
    UPDATE public.concours_learningpaths
    SET "isActive" = NEW."isActive"
    WHERE "concourId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_session_end()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_challenge_progress('session_duration', NEW.id);
    PERFORM update_challenge_progress('content_interaction', NEW.id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_and_update_xp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    xp_gain INTEGER;
BEGIN
    -- Calculate XP gain based on course completion progress only
    IF NEW.progress = 1 AND (OLD.progress IS NULL OR OLD.progress = 0) THEN
        -- Fixed XP gain for completing a course section (e.g., 10 XP per section)
        xp_gain := 10;
    ELSE
        xp_gain := 0;
    END IF;

    -- If user gained XP
    IF xp_gain > 0 THEN
        -- Update or insert user XP
        INSERT INTO user_xp (userid, total_xp)
        VALUES (NEW.userid, xp_gain)
        ON CONFLICT (userid)
        DO UPDATE SET total_xp = user_xp.total_xp + xp_gain;

        -- Record XP gain history
        INSERT INTO xp_history (userid, xp_gained, source_type, source_id)
        VALUES (NEW.userid, xp_gain, 'course', NEW.courseid);
    END IF;

    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.calculate_competition_payment_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.expiry_date := NEW.payment_date + INTERVAL '4 months';
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_session_duration(session_id uuid)
 RETURNS interval
 LANGUAGE plpgsql
AS $function$
DECLARE
    duration INTERVAL;
BEGIN
    SELECT (session_end - session_start) INTO duration
    FROM learning_sessions
    WHERE id = session_id;

    RETURN duration;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_account_unique_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check for duplicate email when an email is provided and not empty
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE email = NEW.email 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
  END IF;

  -- Check for duplicate phone when a phone is provided and not zero
  IF NEW.phone IS NOT NULL AND NEW.phone != 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE phone = NEW.phone 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Phone number already exists: %', NEW.phone;
    END IF;
  END IF;

  -- If all checks pass, proceed with the insert or update
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_update_streak(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    streak_data record;
    days_diff integer;
BEGIN
    -- Get current streak info
    SELECT * INTO streak_data 
    FROM public.user_streaks 
    WHERE user_id = p_user_id;
    
    -- If no streak record exists, create one
    IF streak_data IS NULL THEN
        INSERT INTO public.user_streaks (
            user_id,
            current_streak,
            max_streak,
            last_updated,
            next_deadline
        )
        VALUES (
            p_user_id,
            1,
            1,
            NOW(),
            NOW() + INTERVAL '1 day'
        );
        
        RETURN jsonb_build_object(
            'current_streak', 1,
            'max_streak', 1,
            'status', 'initialized'
        );
    END IF;

    -- Calculate days difference
    days_diff := EXTRACT(DAY FROM (NOW() - streak_data.last_updated));
    
    -- Update streak based on days difference
    IF days_diff = 0 THEN
        -- Already updated today
        RETURN jsonb_build_object(
            'current_streak', streak_data.current_streak,
            'max_streak', streak_data.max_streak,
            'status', 'already_updated'
        );
    ELSIF days_diff = 1 THEN
        -- Consecutive day - increment streak
        UPDATE public.user_streaks
        SET 
            current_streak = current_streak + 1,
            max_streak = GREATEST(max_streak, current_streak + 1),
            last_updated = NOW(),
            next_deadline = NOW() + INTERVAL '1 day'
        WHERE user_id = p_user_id
        RETURNING current_streak, max_streak INTO streak_data;
        
        RETURN jsonb_build_object(
            'current_streak', streak_data.current_streak,
            'max_streak', streak_data.max_streak,
            'status', 'incremented'
        );
    ELSE
        -- Streak broken - reset
        UPDATE public.user_streaks
        SET 
            current_streak = 1,
            last_updated = NOW(),
            next_deadline = NOW() + INTERVAL '1 day'
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object(
            'current_streak', 1,
            'max_streak', streak_data.max_streak,
            'status', 'reset'
        );
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_competition_access(p_user_id uuid, p_competition_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM user_competition_payments 
    WHERE user_id = p_user_id 
    AND competition_id = p_competition_id 
    AND payment_status = 'completed' 
    AND expiry_date > NOW()
  ) INTO has_access;
  
  RETURN has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_program_payment_access(p_user_id uuid, p_program_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- First check if user is enrolled
  SELECT EXISTS (
    SELECT 1 
    FROM user_program_enrollments 
    WHERE user_id = p_user_id 
    AND program_id = p_program_id
  ) INTO has_access;

  -- If not enrolled, check if they have a valid payment
  IF NOT has_access THEN
    SELECT EXISTS (
      SELECT 1 
      FROM user_program_payments 
      WHERE user_id = p_user_id 
      AND program_id = p_program_id 
      AND payment_status = 'completed' 
      AND expiry_date > NOW()
    ) INTO has_access;
  END IF;

  RETURN has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_sessions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE user_activity
  SET session_end = session_start + INTERVAL '30 minutes',
      duration = 1800  -- 30 minutes in seconds
  WHERE session_end IS NULL AND session_start < NOW() - INTERVAL '30 minutes';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_notification_history()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM user_notification_history 
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  -- Log du nettoyage
  RAISE NOTICE 'Cleaned up notification history older than 30 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.courses_audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.insert_audit_log('course', NEW.id, 'INSERT', auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.insert_audit_log('course', NEW.id, 'UPDATE', auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.insert_audit_log('course', OLD.id, 'DELETE', auth.uid());
    END IF;
    RETURN NULL; -- Triggers that do not modify the row should return NULL
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_safely(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    success boolean := false;
BEGIN
    -- Set a longer statement timeout if needed
    SET LOCAL statement_timeout = '120s';
    
    -- Direct SQL delete that we know works
    DELETE FROM auth.users WHERE id = user_id;
    
    success := true;
    RETURN success;
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    RAISE LOG 'Error deleting user %: %', user_id, SQLERRM;
    RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_class_levels(p_class_id uuid, p_class_name text, p_base_levels integer, p_xp_multiplier double precision)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_level INTEGER;
    v_xp_threshold INTEGER;
    v_level_name TEXT;
BEGIN
    FOR v_level IN 1..p_base_levels LOOP
        v_xp_threshold := (POWER(v_level, 2) * 100 * p_xp_multiplier)::INTEGER;
        
        -- Génération d'un nom de niveau basé sur la classe et le niveau
        v_level_name := p_class_name || ' Niveau ' || v_level;
        
        -- Insertion du niveau dans la table
        INSERT INTO public.class_levels (class_id, level, xp_threshold, level_name)
        VALUES (p_class_id, v_level, v_xp_threshold, v_level_name)
        ON CONFLICT (class_id, level) DO UPDATE
        SET xp_threshold = EXCLUDED.xp_threshold, level_name = EXCLUDED.level_name;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_available_programs(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
    result JSONB;
BEGIN
    -- Get all program data with counts in a single efficient query
    -- Added filter for active schools
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', clp.id,
                'price', clp.price,
                'learning_path', jsonb_build_object(
                    'id', lp.id,
                    'title', lp.title,
                    'description', lp.description,
                    'course_count', lp.course_count,
                    'quiz_count', lp.quiz_count,
                    'status', lp.status,
                    'duration', lp.duration,
                    'image', jsonb_build_object('src', lp.image)
                ),
                'concour', jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'image', c.image,
                    'school', jsonb_build_object(
                        'id', s.id,
                        'name', s.name
                    ),
                    'city_id', c.city_id,
                    'cycle_id', c.cycle_id
                ),
                -- Include precomputed counts at the same level
                'exerciseCount', (
                    SELECT COUNT(*)
                    FROM exercices e
                    JOIN course_learningpath cl ON e.course_id = cl."courseId"
                    WHERE cl."lpId" = lp.id
                ),
                'archiveCount', (
                    SELECT COUNT(*)
                    FROM concours_archives ca
                    WHERE ca.concour_id = c.id
                ),
                'course_count', lp.course_count,
                'quiz_count', lp.quiz_count
            )
        ) INTO result
    FROM concours_learningpaths clp
    JOIN learning_paths lp ON clp."learningPathId" = lp.id
    JOIN concours c ON clp."concourId" = c.id
    JOIN schools s ON c.school_id = s.id
    WHERE clp."isActive" = true
    AND s."isActive" = true  -- Added condition to filter for active schools only
    AND clp.id NOT IN (
        SELECT program_id 
        FROM user_program_enrollments 
        WHERE user_id = p_user_id
    );

    RETURN COALESCE(result, '[]'::jsonb);
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_concours_by_school_and_city(school_sigle text, city_name text)
 RETURNS TABLE(concours_id uuid, concours_name text, concours_description text, next_date date, cycle_name text, cycle_level integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        co.id AS concours_id,
        co.name AS concours_name,
        co.description AS concours_description,
        co."nextDate" AS next_date,
        sc.name AS cycle_name,
        sc.level AS cycle_level
    FROM 
        public.concours co
    JOIN 
        public.schools s ON co.school_id = s.id
    JOIN 
        public.cities c ON co.city_id = c.id
    JOIN 
        public.study_cycles sc ON co.cycle_id = sc.id
    WHERE 
        s.sigle = school_sigle
        AND c.name = city_name
    ORDER BY 
        co."nextDate" ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_program_details(p_program_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    lp_id INT;
    concour_id UUID;
    details JSONB;
BEGIN
    -- Get the learning path ID and concour ID for this program
    SELECT "learningPathId", "concourId" INTO lp_id, concour_id
    FROM concours_learningpaths
    WHERE id = p_program_id;
    
    -- Build a complete details object with all related data
    SELECT jsonb_build_object(
        'courses', (
            SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name))
            FROM course_learningpath cl
            JOIN courses c ON cl."courseId" = c.id
            WHERE cl."lpId" = lp_id
        ),
        'quizzes', (
            SELECT jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name))
            FROM quiz_learningpath ql
            JOIN quizzes q ON ql."quizId" = q.id
            WHERE ql."lpId" = lp_id
        ),
        'exercises', (
            SELECT jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title))
            FROM exercices e
            JOIN course_learningpath cl ON e.course_id = cl."courseId"
            WHERE cl."lpId" = lp_id
        ),
        'archives', (
            SELECT jsonb_agg(jsonb_build_object('id', ca.id, 'name', ca.name, 'session', ca.session))
            FROM concours_archives ca
            WHERE ca.concour_id = concour_id
        )
    ) INTO details;
    
    RETURN COALESCE(details, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_schools_by_city(city_name text)
 RETURNS TABLE(school_id uuid, school_name text, school_sigle text, school_description text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS school_id,
        s.name AS school_name,
        s.sigle AS school_sigle,
        s.description AS school_description
    FROM 
        public.schools s
    JOIN 
        public.school_locations sl ON s.id = sl.school_id
    JOIN 
        public.cities c ON sl.city_id = c.id
    WHERE 
        c.name = city_name
    ORDER BY 
        s.name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_statistics()
 RETURNS TABLE(total_schools bigint, total_cities bigint, total_concours bigint, concours_this_month bigint, concours_next_month bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.schools) AS total_schools,
        (SELECT COUNT(*) FROM public.cities) AS total_cities,
        (SELECT COUNT(*) FROM public.concours) AS total_concours,
        (SELECT COUNT(*) FROM public.concours 
         WHERE date_trunc('month', "nextDate") = date_trunc('month', CURRENT_DATE)) AS concours_this_month,
        (SELECT COUNT(*) FROM public.concours 
         WHERE date_trunc('month', "nextDate") = date_trunc('month', CURRENT_DATE + INTERVAL '1 month')) AS concours_next_month;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_upcoming_concours_by_city(city_name text)
 RETURNS TABLE(concours_id uuid, concours_name text, school_name text, school_sigle text, next_date date, cycle_level integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        co.id AS concours_id,
        co.name AS concours_name,
        s.name AS school_name,
        s.sigle AS school_sigle,
        co."nextDate" AS next_date,
        sc.level AS cycle_level
    FROM 
        public.concours co
    JOIN 
        public.schools s ON co.school_id = s.id
    JOIN 
        public.cities c ON co.city_id = c.id
    JOIN 
        public.study_cycles sc ON co.cycle_id = sc.id
    WHERE 
        c.name = city_name
        AND co."nextDate" >= CURRENT_DATE
    ORDER BY 
        co."nextDate" ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only create profile for users with the specific app type
  IF new.raw_user_meta_data->>'type' = 'bacblanc' THEN
    INSERT INTO public.user_profiles (id)
    VALUES (new.id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_payment_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cart_record RECORD;
  item_record RECORD;
BEGIN
  -- Récupérer les informations du panier
  SELECT * INTO cart_record FROM carts WHERE id = NEW.cart_id;

  -- Mettre à jour le statut du panier
  UPDATE carts 
  SET status = 'paid' 
  WHERE id = NEW.cart_id;

  -- Insérer les programmes de l'utilisateur à partir du panier
  FOR item_record IN SELECT * FROM cart_items WHERE cart_id = NEW.cart_id LOOP
    INSERT INTO user_program_enrollments (user_id, program_id)
    VALUES (NEW.user_id, item_record.program_id);
  END LOOP;

  -- Set onboarding_done for the user if not yet set
  UPDATE accounts
  SET onboarding_done = TRUE
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_into_accounts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Ensure that the user account is only inserted if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM public.accounts WHERE "authId" = NEW.user_id
    ) THEN
        INSERT INTO public.accounts (
            firstname,
            lastname,
            email,
            phone,
            "authId",
            defpass,
            groups,
            address,
            city,
            state,
            postalcode,
            country,
            class
        )
        SELECT
            COALESCE(NEW.data->>'firstname', '') AS firstname,
            COALESCE(NEW.data->>'lastname', '') AS lastname,
            NEW.email,
            NEW.phone,
            NEW.user_id AS "authId",
            'default_password',  -- Replace with your logic
            ARRAY[NEW.classe] AS groups,
            COALESCE(NEW.data->>'address', '') AS address,
            COALESCE(NEW.data->>'city', '') AS city,
            COALESCE(NEW.data->>'state', '') AS state,
            COALESCE(NEW.data->>'postalcode', '') AS postalcode,
            COALESCE(NEW.data->>'country', '') AS country,
            NEW.classe AS class
        ;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_competition_payment_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO user_competition_payment_status (payment_id, status, notes)
    VALUES (NEW.id, NEW.payment_status, 'Status changed from ' || COALESCE(OLD.payment_status, 'NULL') || ' to ' || NEW.payment_status);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_course_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   IF NOT EXISTS (
       SELECT 1 FROM audit_logs 
       WHERE content_id = NEW.id::text 
       AND action = TG_OP 
       AND modified_at >= NOW() - interval '1 second'
   ) THEN
       INSERT INTO public.audit_logs (content_type, content_id, action, course_id)
       VALUES ('courses', NEW.id::text, TG_OP, NEW.id);
   END IF;
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_course_content_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   IF NOT EXISTS (
       SELECT 1 FROM audit_logs 
       WHERE content_id = NEW.id::text 
       AND action = TG_OP 
       AND modified_at >= NOW() - interval '1 second'
   ) THEN
       INSERT INTO public.audit_logs (content_type, content_id, action, courses_content_id)
       VALUES ('courses_content', NEW.id::text, TG_OP, NEW.id);
   END IF;
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_exercise_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
   IF TG_OP = 'DELETE' THEN
       INSERT INTO public.audit_logs (content_type, content_id, action)
       VALUES ('exercice', OLD.id::text, TG_OP);
   ELSE
       IF NOT EXISTS (
           SELECT 1 FROM public.audit_logs 
           WHERE content_id = NEW.id::text 
           AND action = TG_OP 
           AND modified_at >= NOW() - interval '1 second'
       ) THEN
           INSERT INTO public.audit_logs (content_type, content_id, action, exercice_id)
           VALUES ('exercice', NEW.id::text, TG_OP, NEW.id);
       END IF;
   END IF;
   RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.log_learning_path_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   IF NOT EXISTS (
       SELECT 1 FROM audit_logs 
       WHERE content_id = NEW.id::text 
       AND action = TG_OP 
       AND modified_at >= NOW() - interval '1 second'
   ) THEN
       INSERT INTO public.audit_logs (content_type, content_id, action, learning_path_id)
       VALUES ('learning_paths', NEW.id::text, TG_OP, NEW.id);
   END IF;
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_quiz_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            content_type, 
            content_id, 
            action, 
            quiz_id
        )
        VALUES (
            'quiz', 
            COALESCE(OLD.id::text, '0'),
            TG_OP,
            COALESCE(OLD.id, 0)
        );
        
        RETURN OLD;
    ELSE
        IF NOT EXISTS (
            SELECT 1 
            FROM audit_logs 
            WHERE content_id = NEW.id::text 
            AND action = TG_OP 
            AND modified_at >= NOW() - interval '1 second'
        ) THEN
            INSERT INTO public.audit_logs (
                content_type, 
                content_id, 
                action, 
                quiz_id
            )
            VALUES (
                'quiz',
                NEW.id::text,
                TG_OP,
                NEW.id
            );
        END IF;
        
        RETURN NEW;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_quiz_question_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            content_type, 
            content_id, 
            action, 
            quiz_question_id
        )
        VALUES (
            'quiz_questions', 
            COALESCE(OLD.id::text, '0'),
            TG_OP,
            COALESCE(OLD.id, 0)
        );
        
        RETURN OLD;
    ELSE
        IF NOT EXISTS (
            SELECT 1 
            FROM public.audit_logs 
            WHERE content_id = NEW.id::text 
            AND action = TG_OP 
            AND modified_at >= NOW() - interval '1 second'
        ) THEN
            INSERT INTO public.audit_logs (
                content_type, 
                content_id, 
                action, 
                quiz_question_id
            )
            VALUES (
                'quiz_questions', 
                NEW.id::text, 
                TG_OP, 
                NEW.id
            );
        END IF;
        RETURN NEW;
    END IF;
END;$function$
;

CREATE OR REPLACE FUNCTION public.populate_learning_path_relationships()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    node_record RECORD;
    nodes_array JSONB;
    course_ids bigint[];
    quiz_ids uuid[];
BEGIN
    -- Handle NULL content or empty nodes array
    IF NEW.content IS NULL OR NEW.content->'nodes' IS NULL THEN
        -- Delete all relationships for this learning path
        DELETE FROM course_learningpath WHERE "lpId" = NEW.id;
        DELETE FROM quiz_learningpath WHERE "lpId" = NEW.id;
        RETURN NEW;
    END IF;

    nodes_array := NEW.content->'nodes';

    -- Validate nodes is an array
    IF jsonb_typeof(nodes_array) != 'array' THEN
        RAISE EXCEPTION 'Invalid content structure: nodes must be an array';
    END IF;

    -- Initialize arrays to collect IDs
    course_ids := ARRAY[]::bigint[];
    quiz_ids := ARRAY[]::uuid[];

    -- Extract course and quiz IDs from content
    FOR node_record IN 
        SELECT value 
        FROM jsonb_array_elements(nodes_array)
    LOOP
        CASE 
            WHEN node_record.value->>'type' = 'course' THEN
                IF node_record.value->'data'->>'courseId' IS NOT NULL THEN
                    course_ids := array_append(course_ids, (node_record.value->'data'->>'courseId')::bigint);
                END IF;
            WHEN node_record.value->>'type' = 'quiz' THEN
                IF node_record.value->'data'->>'quizId' IS NOT NULL THEN
                    quiz_ids := array_append(quiz_ids, (node_record.value->'data'->>'quizId')::uuid);
                END IF;
            ELSE 
                -- Handle any other node types
                NULL;
        END CASE;
    END LOOP;

    -- Remove courses that are no longer in the content
    DELETE FROM course_learningpath 
    WHERE "lpId" = NEW.id
    AND "courseId" != ALL(course_ids);

    -- Remove quizzes that are no longer in the content
    DELETE FROM quiz_learningpath 
    WHERE "lpId" = NEW.id
    AND "quizId" != ALL(quiz_ids);

    -- Insert new courses (ignore existing ones)
    INSERT INTO course_learningpath ("id", "lpId", "courseId")
    SELECT 
        gen_random_uuid(),
        NEW.id,
        c_id
    FROM unnest(course_ids) AS c_id
    WHERE NOT EXISTS (
        SELECT 1 
        FROM course_learningpath 
        WHERE "lpId" = NEW.id
        AND "courseId" = c_id
    );

    -- Insert new quizzes (ignore existing ones)
    INSERT INTO quiz_learningpath ("id", "lpId", "quizId")
    SELECT 
        gen_random_uuid(),
        NEW.id,
        q_id
    FROM unnest(quiz_ids) AS q_id
    WHERE NOT EXISTS (
        SELECT 1 
        FROM quiz_learningpath 
        WHERE "lpId" = NEW.id
        AND "quizId" = q_id
    );

    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.rechercher_partout(search_term text)
 RETURNS TABLE(schema_name text, table_name text, column_name text, matched_value text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec RECORD;
    query TEXT;
BEGIN
    -- Boucle sur chaque colonne de chaque table dans le schéma 'public'
    -- qui est de type texte (varchar, char, text, etc.).
    FOR rec IN
        SELECT
            c.table_schema,
            c.table_name,
            c.column_name
        FROM
            information_schema.columns c
        WHERE
            c.table_schema = 'public' AND
            c.data_type IN ('character varying', 'varchar', 'text', 'char', 'name')
    LOOP
        -- Construit dynamiquement et de manière sécurisée la requête de recherche pour chaque colonne.
        -- %I est pour les identifiants (nom de table/colonne)
        -- %L est pour les littéraux (la valeur de recherche), ce qui prévient les injections SQL.
        query := format(
            'SELECT %L, %L, %L, %I::text FROM %I.%I WHERE %I::text ILIKE %L',
            rec.table_schema,
            rec.table_name,
            rec.column_name,
            rec.column_name,
            rec.table_schema,
            rec.table_name,
            rec.column_name,
            '%' || search_term || '%'
        );

        -- Exécute la requête et ajoute les résultats à la table de retour.
        RETURN QUERY EXECUTE query;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_promo_code_usage()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.promo_code_id IS NOT NULL THEN
    INSERT INTO public.promo_code_usage (
      influencer_id,
      payment_id,
      discount_amount
    ) VALUES (
      NEW.promo_code_id,
      NEW.id,
      (SELECT discount_percentage FROM public.influencers WHERE id = NEW.promo_code_id) * NEW.amount / 100
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_has_correction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE concours_archives
  SET has_correction = (SELECT EXISTS(SELECT 1 FROM concours_corrections WHERE archive_id = OLD.archive_id))
  WHERE id = OLD.archive_id;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_new_content_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If order is not explicitly set in the INSERT
    IF NEW."order" IS NULL THEN
        -- Get the highest order for the same courseId, or -1 if none exists
        SELECT COALESCE(MAX("order"), -1)
        INTO NEW."order"
        FROM courses_content
        WHERE "courseId" = NEW."courseId";

        -- Increment by 1 (if it was -1, it becomes 0)
        NEW."order" := NEW."order" + 1;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_to_course_learningpath()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if we're already in a sync operation to prevent infinite loops
    IF current_setting('app.syncing_tables', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Set the flag to prevent recursive calls
    PERFORM set_config('app.syncing_tables', 'true', true);

    IF TG_OP = 'INSERT' THEN
        -- Insert into course_learningpath if not exists
        -- Explicitly generate UUID for id column
        INSERT INTO course_learningpath (id, "courseId", "lpId")
        SELECT gen_random_uuid(), NEW.course_id, NEW.learning_path_id
        WHERE NOT EXISTS (
            SELECT 1 FROM course_learningpath 
            WHERE "courseId" = NEW.course_id 
            AND "lpId" = NEW.learning_path_id
        );

    ELSIF TG_OP = 'DELETE' THEN
        -- Delete from course_learningpath
        DELETE FROM course_learningpath 
        WHERE "courseId" = OLD.course_id 
        AND "lpId" = OLD.learning_path_id;
    END IF;

    -- Reset the flag
    PERFORM set_config('app.syncing_tables', 'false', true);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_to_course_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if we're already in a sync operation to prevent infinite loops
    IF current_setting('app.syncing_tables', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Set the flag to prevent recursive calls
    PERFORM set_config('app.syncing_tables', 'true', true);

    IF TG_OP = 'INSERT' THEN
        -- Insert into learning_path_course_order if not exists
        INSERT INTO learning_path_course_order (
            id,
            learning_path_id, 
            course_id, 
            category_id, 
            order_index
        )
        SELECT 
            gen_random_uuid(),
            NEW."lpId",
            NEW."courseId",
            c.category,
            COALESCE(MAX(lpco.order_index), 0) + 1
        FROM courses c
        LEFT JOIN learning_path_course_order lpco ON lpco.learning_path_id = NEW."lpId"
        WHERE c.id = NEW."courseId"
        AND NOT EXISTS (
            SELECT 1 FROM learning_path_course_order 
            WHERE learning_path_id = NEW."lpId" 
            AND course_id = NEW."courseId"
        )
        GROUP BY c.category;

    ELSIF TG_OP = 'DELETE' THEN
        -- Delete from learning_path_course_order
        DELETE FROM learning_path_course_order 
        WHERE learning_path_id = OLD."lpId" 
        AND course_id = OLD."courseId";
    END IF;

    -- Reset the flag
    PERFORM set_config('app.syncing_tables', 'false', true);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_user_login()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM update_challenge_progress('connection_streak', NEW.user_id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_cart_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE carts
  SET total_amount = (
    SELECT COALESCE(SUM(price), 0)
    FROM cart_items
    WHERE cart_id = NEW.cart_id
  )
  WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_challenge_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (NEW.session_type = 'learning') THEN
        UPDATE challenges
        SET progress = progress + 1
        WHERE user_id = NEW.user_id AND challenge_type = 'connection_streak' AND is_completed = false;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_challenge_progress(challenge_type text, user_id_or_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_id UUID;
    session_id UUID;
    challenge_id UUID;
    challenge_goal INTEGER;
    current_progress INTEGER;
    session_duration INTERVAL;
BEGIN
    IF challenge_type = 'connection_streak' THEN
        user_id := user_id_or_session_id;

        -- Logic to update the connection streak (you'll need a login_logs table to track this)

    ELSIF challenge_type = 'session_duration' THEN
        session_id := user_id_or_session_id;

        -- Get the user ID from the session
        SELECT user_id INTO user_id
        FROM learning_sessions
        WHERE id = session_id;

        -- Get the relevant challenge and its goal
        SELECT id, goal INTO challenge_id, challenge_goal
        FROM challenges
        WHERE type = challenge_type;

        -- Calculate the session duration
        session_duration := calculate_session_duration(session_id);

        -- Update user's progress
        SELECT progress INTO current_progress
        FROM user_challenges
        WHERE user_id = user_id AND challenge_id = challenge_id;

        -- Increment progress (in minutes) and check for completion
        current_progress := current_progress + EXTRACT(EPOCH FROM session_duration) / 60;
        IF current_progress >= challenge_goal THEN
            UPDATE user_challenges
            SET progress = challenge_goal,
                completed = TRUE,
                completion_date = NOW()
            WHERE user_id = user_id AND challenge_id = challenge_id;
        ELSE
            UPDATE user_challenges
            SET progress = current_progress
            WHERE user_id = user_id AND challenge_id = challenge_id;
        END IF;

    ELSIF challenge_type = 'content_interaction' THEN
        session_id := user_id_or_session_id;

        -- Get the user ID from the session
        SELECT user_id INTO user_id
        FROM learning_sessions
        WHERE id = session_id;

        -- Get the relevant challenge and its goal
        SELECT id, goal INTO challenge_id, challenge_goal
        FROM challenges
        WHERE type = challenge_type;

        -- Logic to track specific content interaction
        SELECT progress INTO current_progress
        FROM user_challenges
        WHERE user_id = user_id AND challenge_id = challenge_id;

        -- Increment progress and check for completion
        current_progress := current_progress + 1;
        IF current_progress >= challenge_goal THEN
            UPDATE user_challenges
            SET progress = challenge_goal,
                completed = TRUE,
                completion_date = NOW()
            WHERE user_id = user_id AND challenge_id = challenge_id;
        ELSE
            UPDATE user_challenges
            SET progress = current_progress
            WHERE user_id = user_id AND challenge_id = challenge_id;
        END IF;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_connection_streak()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (NEW.session_start IS NOT NULL) THEN
        UPDATE challenges
        SET progress = progress + 1
        WHERE user_id = NEW.user_id AND challenge_type = 'connection_streak' AND is_completed = false;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_course_progress_summary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    v_total_sections integer;
    v_completed_sections integer;
    v_progress_percentage numeric(5,2);
    v_is_completed boolean;
BEGIN
    -- Calculer le nombre total de sections pour le cours
    SELECT COUNT(*) INTO v_total_sections
    FROM courses_content
    WHERE "courseId" = NEW.courseid;

    -- Calculer le nombre de sections complétées
    SELECT COUNT(*) INTO v_completed_sections
    FROM usercourseprogress
    WHERE userid = NEW.userid AND courseid = NEW.courseid AND progress = 1;

    -- Calculer le pourcentage de progression
   -- v_progress_percentage := (v_completed_sections::numeric / v_total_sections::numeric) * 100;

    -- Déterminer si le cours est complété
    v_is_completed := (v_completed_sections = v_total_sections);

    -- Insérer ou mettre à jour le résumé de progression
    INSERT INTO course_progress_summary (
        user_id, course_id, total_sections, completed_sections,
          last_updated
    ) VALUES (
        NEW.userid, NEW.courseid, v_total_sections, v_completed_sections,
          now()
    ) ON CONFLICT (user_id, course_id) DO UPDATE SET
        total_sections = EXCLUDED.total_sections,
        completed_sections = EXCLUDED.completed_sections,
        last_updated = EXCLUDED.last_updated;

    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.update_courses_replica()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'courses' THEN
            UPDATE public.courses_replica
            SET 
                created_at = NEW.created_at,
                name = NEW.name,
                description = NEW.description,
                image = NEW.image,
                status = NEW.status,
                learners = NEW.learners,
                groups = NEW.groups,
                category = NEW.category,
                tags = NEW.tags,
                "accessKey" = NEW."accessKey",
                goals = NEW.goals
            WHERE id = NEW.id;
        ELSIF TG_TABLE_NAME = 'courses_content' THEN
            UPDATE public.courses_content_replica
            SET 
                created_at = NEW.created_at,
                "courseId" = NEW."courseId",
                content = NEW.content,
                last_modify_at = NEW.last_modify_at,
                name = NEW.name,
                "order" = NEW."order"
            WHERE id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_daily_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  last_challenge_date DATE;
  current_streak INTEGER;
BEGIN
  -- Get the date of the last challenge
  SELECT challenge_date, streak_count INTO last_challenge_date, current_streak
  FROM daily_challenges
  WHERE user_id = NEW.user_id
  ORDER BY challenge_date DESC
  LIMIT 1;

  -- If there's no previous challenge or if the last challenge was more than a day ago, reset streak
  IF last_challenge_date IS NULL OR last_challenge_date < CURRENT_DATE - INTERVAL '1 day' THEN
    current_streak := 1;
  ELSE
    current_streak := current_streak + 1;
  END IF;

  -- Insert or update the daily challenge
  INSERT INTO daily_challenges (user_id, challenge_date, is_completed, streak_count)
  VALUES (NEW.user_id, CURRENT_DATE, TRUE, current_streak)
  ON CONFLICT (user_id, challenge_date) 
  DO UPDATE SET is_completed = TRUE, 
                streak_count = current_streak;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_has_correction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE concours_archives
  SET has_correction = TRUE
  WHERE id = NEW.archive_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_learning_path_counts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    node_record RECORD;
    total_course_count INTEGER := 0;
    total_quiz_count INTEGER := 0;
    total_duration_sum INTEGER := 0;
    nodes_array JSONB;
BEGIN
    -- Null safety implementation with early return optimization
    IF NEW.content IS NULL THEN
        NEW.course_count := 0;
        NEW.quiz_count := 0;
        NEW.total_duration := 0;
        RETURN NEW;
    END IF;

    -- JSONB path extraction with type validation
    nodes_array := NEW.content->'nodes';
    
    -- Structural validation with explicit error handling
    IF nodes_array IS NULL THEN
        -- If nodes is NULL, set defaults and return instead of raising an error
        NEW.course_count := 0;
        NEW.quiz_count := 0;
        NEW.total_duration := 0;
        RETURN NEW;
    END IF;

    IF jsonb_typeof(nodes_array) != 'array' THEN
        RAISE EXCEPTION 'Invalid content structure: nodes must be an array';
    END IF;

    -- Optimized node traversal with explicit type handling
    FOR node_record IN 
        SELECT value 
        FROM jsonb_array_elements(nodes_array)
    LOOP
        -- Type-specific processing with comprehensive error handling
        CASE node_record.value->>'type' 
            WHEN 'course' THEN
                total_course_count := total_course_count + 1;
                -- Null-safe duration extraction with type coercion
                IF (node_record.value->'data'->>'duration') IS NOT NULL THEN
                    BEGIN
                        total_duration_sum := total_duration_sum + 
                            COALESCE(NULLIF(node_record.value->'data'->>'duration', '')::INTEGER, 0);
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Invalid duration value found in course node: %', 
                            node_record.value->'data'->>'duration';
                    END;
                END IF;
            
            WHEN 'quiz' THEN
                total_quiz_count := total_quiz_count + 1;
            
            ELSE 
                NULL; -- Explicit handling for unrecognized types
        END CASE;
    END LOOP;

    -- Atomic counter updates with explicit type casting
    NEW.course_count := total_course_count;
    NEW.quiz_count := total_quiz_count;
    NEW.total_duration := total_duration_sum;

    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.update_learning_path_course_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  lp_id UUID;
BEGIN
  -- Utiliser le bon nom de champ "lpId" avec I majuscule
  IF TG_OP = 'DELETE' THEN
    lp_id := OLD."lpId";
  ELSE
    lp_id := NEW."lpId";
  END IF;

  -- Mettre à jour le compteur de cours dans learning_paths
  UPDATE learning_paths
  SET 
    course_count = (
      SELECT COUNT(*) 
      FROM course_learningpath 
      WHERE "lpId" = lp_id
    ),
    last_modified_at = NOW()
  WHERE id = lp_id;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_learning_path_quiz_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  lp_id UUID;
BEGIN
  -- Utiliser le bon nom de champ "lpId" avec I majuscule
  IF TG_OP = 'DELETE' THEN
    lp_id := OLD."lpId";
  ELSE
    lp_id := NEW."lpId";
  END IF;

  -- Mettre à jour le compteur de quiz dans learning_paths
  UPDATE learning_paths
  SET 
    quiz_count = (
      SELECT COUNT(*) 
      FROM quiz_learningpath 
      WHERE "lpId" = lp_id
    ),
    last_modified_at = NOW()
  WHERE id = lp_id;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_role_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    role_record RECORD;
BEGIN
    -- Fetch the role based on the type of user
    SELECT id INTO role_record
    FROM public.roles
    WHERE name = UPPER(NEW.type)
    LIMIT 1;

    -- Update the role_id in the accounts table
    IF FOUND THEN
        NEW.role_id := role_record.id;
    ELSE
        NEW.role_id := NULL; -- or handle the case where no role is found
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_session_duration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only update if the session is marked as completed
  IF NEW.is_completed THEN
    -- Compute the duration from session_start to session_end
    NEW.duration := COALESCE(NEW.session_end - NEW.session_start, interval '0 seconds');
  ELSE
    -- Set duration to null if the session is not completed
    NEW.duration := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_session_duration_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
    UPDATE challenges
    SET progress = progress + EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))/60 -- progress in minutes
    WHERE user_id = NEW.user_id AND challenge_type = 'session_duration' AND is_completed = false;
    
    -- Check if challenge is completed
   -- IF ( NEW.target) THEN
     --   UPDATE challenges
       -- SET is_completed = true,
         --   end_date = NOW()
       -- WHERE id = NEW.id;
    -- END IF;

    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.update_ticket_last_reply()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE tickets
    SET last_reply_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_xp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validate input data
    IF NEW.userid IS NULL THEN
        RAISE WARNING 'Skipping XP update: userid is NULL';
        RETURN NEW;
    END IF;

    IF NEW.xp_gained IS NULL THEN
        RAISE WARNING 'Skipping XP update: xp_gained is NULL';
        RETURN NEW;
    END IF;

    IF NEW.source_type IS NULL THEN
        RAISE WARNING 'Skipping XP update: source_type is NULL';
        RETURN NEW;
    END IF;

    -- Only process quiz-related XP gains
    IF NEW.source_type = 'quiz' THEN
        -- Ensure xp_gained is not negative
        IF NEW.xp_gained < 0 THEN
            RAISE WARNING 'Negative XP gain detected, setting to 0';
            NEW.xp_gained := 0;
        END IF;

        -- Insert or update the user's total XP
        INSERT INTO public.user_xp (userid, total_xp)
        VALUES (NEW.userid, COALESCE(NEW.xp_gained, 0))
        ON CONFLICT (userid) 
        DO UPDATE SET total_xp = GREATEST(0, user_xp.total_xp + EXCLUDED.total_xp)
        WHERE user_xp.userid = EXCLUDED.userid;

        -- Handle any potential numerical overflow
        IF NOT FOUND THEN
            RAISE WARNING 'Failed to update user_xp for user %', NEW.userid;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN numeric_value_out_of_range THEN
        RAISE WARNING 'Numeric overflow detected for user %, XP update skipped', NEW.userid;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Unexpected error in update_user_xp: % %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_xp_on_exam_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only proceed if total_xp_gained has changed and is not zero
    IF (NEW.total_xp_gained IS DISTINCT FROM OLD.total_xp_gained) AND (NEW.total_xp_gained != 0) THEN
        -- Insert into xp_history
        INSERT INTO public.xp_history (userid, xp_gained, source_type, source_id)
        VALUES (NEW.user_id, NEW.total_xp_gained, 'exam', NEW.id);

        -- Update user_xp
        INSERT INTO public.user_xp (userid, total_xp)
        VALUES (NEW.user_id, NEW.total_xp_gained)
        ON CONFLICT (userid) 
        DO UPDATE SET total_xp = user_xp.total_xp + EXCLUDED.total_xp;
    END IF;
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."concours_learningpaths_backup" to "anon";

grant insert on table "public"."concours_learningpaths_backup" to "anon";

grant references on table "public"."concours_learningpaths_backup" to "anon";

grant select on table "public"."concours_learningpaths_backup" to "anon";

grant trigger on table "public"."concours_learningpaths_backup" to "anon";

grant truncate on table "public"."concours_learningpaths_backup" to "anon";

grant update on table "public"."concours_learningpaths_backup" to "anon";

grant delete on table "public"."concours_learningpaths_backup" to "authenticated";

grant insert on table "public"."concours_learningpaths_backup" to "authenticated";

grant references on table "public"."concours_learningpaths_backup" to "authenticated";

grant select on table "public"."concours_learningpaths_backup" to "authenticated";

grant trigger on table "public"."concours_learningpaths_backup" to "authenticated";

grant truncate on table "public"."concours_learningpaths_backup" to "authenticated";

grant update on table "public"."concours_learningpaths_backup" to "authenticated";

grant delete on table "public"."concours_learningpaths_backup" to "service_role";

grant insert on table "public"."concours_learningpaths_backup" to "service_role";

grant references on table "public"."concours_learningpaths_backup" to "service_role";

grant select on table "public"."concours_learningpaths_backup" to "service_role";

grant trigger on table "public"."concours_learningpaths_backup" to "service_role";

grant truncate on table "public"."concours_learningpaths_backup" to "service_role";

grant update on table "public"."concours_learningpaths_backup" to "service_role";


  create policy "concours_delete_policy"
  on "public"."concours"
  as permissive
  for delete
  to authenticated
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));



  create policy "concours_insert_policy"
  on "public"."concours"
  as permissive
  for insert
  to authenticated
with check ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "concours_select_policy"
  on "public"."concours"
  as permissive
  for select
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "concours_update_policy"
  on "public"."concours"
  as permissive
  for update
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))))
with check ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "concours_learningpaths_delete_policy"
  on "public"."concours_learningpaths"
  as permissive
  for delete
  to authenticated
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));



  create policy "concours_learningpaths_insert_policy"
  on "public"."concours_learningpaths"
  as permissive
  for insert
  to authenticated
with check ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "concours_learningpaths_select_policy"
  on "public"."concours_learningpaths"
  as permissive
  for select
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "concours_learningpaths_update_policy"
  on "public"."concours_learningpaths"
  as permissive
  for update
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))))
with check ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() ->> 'role'::text) = 'student'::text) AND ("isActive" = true))));



  create policy "Allow admins to update news"
  on "public"."news"
  as permissive
  for update
  to authenticated
using (((auth.jwt() ->> 'user_role'::text) = 'admin'::text))
with check (((auth.jwt() ->> 'user_role'::text) = 'admin'::text));


CREATE TRIGGER concours_isactive_sync_trigger AFTER INSERT OR DELETE OR UPDATE ON public.concours FOR EACH ROW EXECUTE FUNCTION public.sync_concours_isactive();

CREATE TRIGGER trg_sync_concours_learningpaths AFTER INSERT OR UPDATE ON public.concours FOR EACH ROW EXECUTE FUNCTION public.sync_concours_learningpaths_isactive();


