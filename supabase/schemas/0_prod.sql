SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "concours_blanc";


ALTER SCHEMA "concours_blanc" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "mobile";


ALTER SCHEMA "mobile" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."image" AS ENUM (
    'url',
    'id',
    'path',
    'uploadthing_id'
);


ALTER TYPE "public"."image" OWNER TO "postgres";


COMMENT ON TYPE "public"."image" IS 'type to contain image informations';



CREATE TYPE "public"."learning_session_type" AS ENUM (
    'mobile',
    'web'
);


ALTER TYPE "public"."learning_session_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."learning_session_type" IS 'the device on witch the user have the session';



CREATE TYPE "public"."user_activity_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."user_activity_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_activity_status" IS 'the activity is start or off';



CREATE OR REPLACE FUNCTION "public"."after_session_end"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM update_challenge_progress('session_duration', NEW.id);
    PERFORM update_challenge_progress('content_interaction', NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."after_session_end"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_update_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."calculate_and_update_xp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_competition_payment_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.expiry_date := NEW.payment_date + INTERVAL '4 months';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_competition_payment_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_session_duration"("session_id" "uuid") RETURNS interval
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    duration INTERVAL;
BEGIN
    SELECT (session_end - session_start) INTO duration
    FROM learning_sessions
    WHERE id = session_id;

    RETURN duration;
END;
$$;


ALTER FUNCTION "public"."calculate_session_duration"("session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_account_unique_contacts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_account_id uuid;
BEGIN
  current_account_id := CASE
    WHEN TG_OP = 'UPDATE' THEN OLD.id
    ELSE COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  END;

  -- Check for duplicate email when an email is provided and not empty
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE email = NEW.email 
      AND id != current_account_id
    ) THEN
      RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
  END IF;

  -- Check for duplicate phone when a phone is provided and not zero
  IF NEW.phone IS NOT NULL AND NEW.phone != 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE phone = NEW.phone 
      AND id != current_account_id
    ) THEN
      RAISE EXCEPTION 'Phone number already exists: %', NEW.phone;
    END IF;
  END IF;

  -- If all checks pass, proceed with the insert or update
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_account_unique_contacts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") IS 'Updates user streak based on last activity. Returns current streak status and type of update performed.';



CREATE OR REPLACE FUNCTION "public"."check_competition_access"("p_user_id" "uuid", "p_competition_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_competition_access"("p_user_id" "uuid", "p_competition_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_program_payment_access"("p_user_id" "uuid", "p_program_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_program_payment_access"("p_user_id" "uuid", "p_program_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_incomplete_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE user_activity
  SET session_end = session_start + INTERVAL '30 minutes',
      duration = 1800  -- 30 minutes in seconds
  WHERE session_end IS NULL AND session_start < NOW() - INTERVAL '30 minutes';
END;
$$;


ALTER FUNCTION "public"."cleanup_incomplete_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notification_history"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM user_notification_history 
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  -- Log du nettoyage
  RAISE NOTICE 'Cleaned up notification history older than 30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notification_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."courses_audit_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."courses_audit_trigger_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_safely"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_user_safely"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enroll_user_after_program_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'completed') THEN
    -- Create enrollment, avoiding duplicates
    INSERT INTO user_program_enrollments (user_id, program_id, expiry_date)
    VALUES (NEW.user_id, NEW.program_id, NEW.expiry_date)
    ON CONFLICT (user_id, program_id) 
    DO UPDATE SET expiry_date = GREATEST(user_program_enrollments.expiry_date, EXCLUDED.expiry_date);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enroll_user_after_program_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_class_levels"("p_class_id" "uuid", "p_class_name" "text", "p_base_levels" integer, "p_xp_multiplier" double precision) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_class_levels"("p_class_id" "uuid", "p_class_name" "text", "p_base_levels" integer, "p_xp_multiplier" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_programs"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."get_available_programs"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_concours_by_school_and_city"("school_sigle" "text", "city_name" "text") RETURNS TABLE("concours_id" "uuid", "concours_name" "text", "concours_description" "text", "next_date" "date", "cycle_name" "text", "cycle_level" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_concours_by_school_and_city"("school_sigle" "text", "city_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_program_details"("p_program_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_program_details"("p_program_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schools_by_city"("city_name" "text") RETURNS TABLE("school_id" "uuid", "school_name" "text", "school_sigle" "text", "school_description" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_schools_by_city"("city_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_statistics"() RETURNS TABLE("total_schools" bigint, "total_cities" bigint, "total_concours" bigint, "concours_this_month" bigint, "concours_next_month" bigint)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_upcoming_concours_by_city"("city_name" "text") RETURNS TABLE("concours_id" "uuid", "concours_name" "text", "school_name" "text", "school_sigle" "text", "next_date" "date", "cycle_level" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_upcoming_concours_by_city"("city_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only create profile for users with the specific app type
  IF new.raw_user_meta_data->>'type' = 'bacblanc' THEN
    INSERT INTO public.user_profiles (id)
    VALUES (new.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payment_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_payment_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_into_accounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."insert_into_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_competition_payment_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO user_competition_payment_status (payment_id, status, notes)
    VALUES (NEW.id, NEW.payment_status, 'Status changed from ' || COALESCE(OLD.payment_status, 'NULL') || ' to ' || NEW.payment_status);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_competition_payment_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_course_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_course_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_course_content_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_course_content_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_exercise_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
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
END;$$;


ALTER FUNCTION "public"."log_exercise_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_learning_path_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_learning_path_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_quiz_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_quiz_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_quiz_question_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
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
END;$$;


ALTER FUNCTION "public"."log_quiz_question_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_learning_path_relationships"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."populate_learning_path_relationships"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."populate_learning_path_relationships"() IS 'Automatically extracts course and quiz IDs from learning path content JSON and populates the relationship tables.
Creates entries in course_learningPath and quiz_learningPath tables accordingly.
Includes existence checks to prevent foreign key constraint violations.';



CREATE OR REPLACE FUNCTION "public"."rechercher_partout"("search_term" "text") RETURNS TABLE("schema_name" "text", "table_name" "text", "column_name" "text", "matched_value" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."rechercher_partout"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_promo_code_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."record_promo_code_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_has_correction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE concours_archives
  SET has_correction = (SELECT EXISTS(SELECT 1 FROM concours_corrections WHERE archive_id = OLD.archive_id))
  WHERE id = OLD.archive_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."reset_has_correction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_new_content_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."set_new_content_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_to_course_learningpath"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_to_course_learningpath"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_to_course_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_to_course_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_user_login"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM update_challenge_progress('connection_streak', NEW.user_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_user_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cart_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_cart_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_challenge_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (NEW.session_type = 'learning') THEN
        UPDATE challenges
        SET progress = progress + 1
        WHERE user_id = NEW.user_id AND challenge_type = 'connection_streak' AND is_completed = false;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_challenge_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_challenge_progress"("challenge_type" "text", "user_id_or_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_challenge_progress"("challenge_type" "text", "user_id_or_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_connection_streak"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (NEW.session_start IS NOT NULL) THEN
        UPDATE challenges
        SET progress = progress + 1
        WHERE user_id = NEW.user_id AND challenge_type = 'connection_streak' AND is_completed = false;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_connection_streak"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_progress_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."update_course_progress_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_courses_replica"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_courses_replica"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_challenge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_daily_challenge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_has_correction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE concours_archives
  SET has_correction = TRUE
  WHERE id = NEW.archive_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_has_correction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_learning_path_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."update_learning_path_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_learning_path_course_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_learning_path_course_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_learning_path_quiz_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_learning_path_quiz_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_role_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_role_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_session_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_duration_challenge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
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
END;$$;


ALTER FUNCTION "public"."update_session_duration_challenge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_last_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE tickets
    SET last_reply_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_last_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_user_xp"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_xp"() IS 'Updates user_xp table when new XP is gained from quizzes. Includes error handling and data validation.';



CREATE OR REPLACE FUNCTION "public"."update_xp_on_exam_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_xp_on_exam_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_account_on_auth_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  cleaned_phone text;
  normalized_phone numeric;
  firebase_uid text;
  account_email text;
BEGIN
  cleaned_phone := nullif(regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g'), '');

  IF cleaned_phone IS NULL THEN
    normalized_phone := NULL;
  ELSIF cleaned_phone LIKE '237%' AND length(cleaned_phone) = 12 THEN
    normalized_phone := right(cleaned_phone, 9)::numeric;
  ELSE
    normalized_phone := cleaned_phone::numeric;
  END IF;

  firebase_uid := coalesce(
    NEW.raw_user_meta_data->>'firebase_uid',
    NEW.raw_app_meta_data->>'firebase_uid'
  );

  account_email := coalesce(
    nullif(NEW.email, ''),
    nullif(NEW.raw_user_meta_data->>'email', ''),
    concat(NEW.id::text, '@phone.elearnprepa.local')
  );

  INSERT INTO public.accounts (
    id,
    "authId",
    email,
    phone,
    type,
    onboarding_done,
    firebase_uid,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.id,
    account_email,
    normalized_phone,
    'student',
    false,
    firebase_uid,
    NEW.raw_user_meta_data
  )
  ON CONFLICT ("authId") DO UPDATE
    SET id = EXCLUDED.id,
        email = COALESCE(EXCLUDED.email, public.accounts.email),
        phone = COALESCE(EXCLUDED.phone, public.accounts.phone),
        firebase_uid = COALESCE(EXCLUDED.firebase_uid, public.accounts.firebase_uid),
        metadata = COALESCE(public.accounts.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_account_on_auth_insert"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "concours_blanc"."exam_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "exam_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "score" integer,
    "answers" "jsonb" DEFAULT '{}'::"jsonb",
    "question_order" integer[],
    "last_open_question" integer,
    "time_left" integer,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "concours_blanc"."exam_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "concours_blanc"."exams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject_id" "uuid",
    "duration" "text",
    "level" "text",
    "available_at" "date",
    "status" "text" DEFAULT 'published'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "exams_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "concours_blanc"."exams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "concours_blanc"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "reference" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "amount" numeric(10,2),
    "currency" "text" DEFAULT 'XAF'::"text",
    "exam_id" "uuid",
    "payment_method" "text",
    "transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'complete'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "concours_blanc"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "concours_blanc"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "exam_id" "uuid",
    "question_text" "text" NOT NULL,
    "options" "jsonb",
    "correct_answer" "text",
    "points" integer DEFAULT 1,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "concours_blanc"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "concours_blanc"."subjects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "bac_series" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "concours_blanc"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "concours_blanc"."users_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "bac_series" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "concours_blanc"."users_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mobile"."concours" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "schoolId" "uuid",
    "name" "text"
);


ALTER TABLE "mobile"."concours" OWNER TO "postgres";


ALTER TABLE "mobile"."concours" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "mobile"."concours_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "firstname" "text",
    "lastname" "text",
    "email" "text" NOT NULL,
    "type" "text" DEFAULT 'student'::"text" NOT NULL,
    "genre" "text",
    "authId" "uuid" NOT NULL,
    "defpass" "text",
    "image" "jsonb",
    "groups" "uuid"[],
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" numeric,
    "middlename" character varying(255),
    "nationality" character varying(255),
    "studentid" character varying(255),
    "guardianname" character varying(255),
    "guardianphone" character varying(255),
    "guardianemail" character varying(255),
    "address" "text",
    "city" character varying(255),
    "state" character varying(255),
    "postalcode" character varying(20),
    "country" character varying(255),
    "coursesenrolled" "text"[],
    "coursescompleted" "text"[],
    "status" boolean DEFAULT false,
    "skills" "text"[],
    "gradelevel" character varying(255),
    "gpa" real,
    "major" character varying(255),
    "minor" character varying(255),
    "hobbies" "text"[],
    "achievements" "text"[],
    "clubs" "text"[],
    "birthdate" "date",
    "class" "uuid",
    "school" character varying(255),
    "schoollevel" character varying(255),
    "favoritesubjects" "text"[],
    "hasrepeatedclass" boolean,
    "repeatedclassdetails" "text",
    "maingoal" character varying(255),
    "othergoals" "text",
    "learningstyle" character varying(255),
    "motivation" "text",
    "internetaccess" boolean,
    "preferredlanguage" character varying(255),
    "accessibilityneeds" "text",
    "reminders" boolean,
    "invitedfriends" "text"[],
    "remindertime" timestamp with time zone,
    "onboarding_done" boolean DEFAULT false,
    "active_trx" "text",
    "role_id" "uuid",
    "firebase_uid" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."accounts"."active_trx" IS 'the active billing the user is pai for';



COMMENT ON COLUMN "public"."accounts"."metadata" IS 'some user_metadata';



CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb"
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_config" IS 'special data to manage informations in the app';



ALTER TABLE "public"."app_config" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."app_config_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "quiz_question_id" bigint,
    "course_id" bigint,
    "courses_content_id" bigint,
    "quiz_id" "uuid",
    "learning_path_id" "uuid",
    "exercice_id" "uuid"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."audit_logs"."quiz_id" IS 'to get the reference with the quiz id table';



ALTER TABLE "public"."audit_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cart_id" "uuid",
    "program_id" bigint,
    "price" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "total_amount" integer DEFAULT 0
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_type" character varying(255),
    "target" integer,
    "progress" integer DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "start_date" timestamp with time zone DEFAULT "now"(),
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" character varying(255),
    "type" character varying(255),
    "goal" integer,
    "reward_points" integer
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'single'::"text"
);


ALTER TABLE "public"."chat_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."concours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "dates" "date"[],
    "nextDate" "date",
    "school_id" "uuid" DEFAULT "gen_random_uuid"(),
    "description" "text",
    "image" "jsonb",
    "city_id" "uuid",
    "cycle_id" "uuid"
);


ALTER TABLE "public"."concours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."concours_archives" (
    "id" integer NOT NULL,
    "concour_id" "uuid",
    "category_id" "uuid",
    "file_id" "uuid",
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "duration" integer,
    "has_correction" boolean DEFAULT false,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "session" "date",
    "description" "text",
    "file_path" "text"
);


ALTER TABLE "public"."concours_archives" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."concours_archives_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."concours_archives_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."concours_archives_id_seq" OWNED BY "public"."concours_archives"."id";



CREATE TABLE IF NOT EXISTS "public"."concours_corrections" (
    "id" integer NOT NULL,
    "archive_id" integer NOT NULL,
    "file_id" "uuid",
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."concours_corrections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."concours_corrections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."concours_corrections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."concours_corrections_id_seq" OWNED BY "public"."concours_corrections"."id";



CREATE TABLE IF NOT EXISTS "public"."concours_learningpaths" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "learningPathId" "uuid",
    "concourId" "uuid",
    "price" integer,
    "isActive" boolean,
    "metadata" "jsonb"
);


ALTER TABLE "public"."concours_learningpaths" OWNER TO "postgres";


COMMENT ON COLUMN "public"."concours_learningpaths"."metadata" IS 'more information about this path';



ALTER TABLE "public"."concours_learningpaths" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."concours_learningpaths_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."content_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "content_type" character varying(255),
    "content_id" "uuid",
    "interaction_start" timestamp with time zone DEFAULT "now"(),
    "interaction_end" timestamp with time zone,
    "duration" interval GENERATED ALWAYS AS (("interaction_end" - "interaction_start")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_interactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content_interactions"."created_at" IS 'the creation daate of the content_interaction';



CREATE TABLE IF NOT EXISTS "public"."course_learningpath" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "courseId" bigint,
    "lpId" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."course_learningpath" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_progress_summary" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" bigint NOT NULL,
    "total_sections" integer NOT NULL,
    "completed_sections" integer DEFAULT 0 NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    "progress_percentage" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN ("total_sections" = 0) THEN (0)::numeric
    ELSE ((("completed_sections")::numeric / ("total_sections")::numeric) * (100)::numeric)
END) STORED,
    "is_completed" boolean GENERATED ALWAYS AS (("completed_sections" >= "total_sections")) STORED,
    CONSTRAINT "check_sections_valid" CHECK (("completed_sections" <= "total_sections"))
);


ALTER TABLE "public"."course_progress_summary" OWNER TO "postgres";


ALTER TABLE "public"."course_progress_summary" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_progress_summary_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_tags" (
    "course_id" bigint NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."course_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "filename" "text" NOT NULL,
    "filesize" bigint NOT NULL,
    "duration" integer,
    "url" "text" NOT NULL,
    "uploadthing_id" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'processing'::"text",
    "mime_type" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "course_id" bigint NOT NULL,
    "mux_asset_id" "text",
    "mux_playback_id" "text"
);


ALTER TABLE "public"."course_videos" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_videos" IS 'Stores videos associated with courses';



COMMENT ON COLUMN "public"."course_videos"."id" IS 'Primary UUID key for the video';



COMMENT ON COLUMN "public"."course_videos"."title" IS 'Optional display title for the video';



COMMENT ON COLUMN "public"."course_videos"."description" IS 'Optional description of the video content';



COMMENT ON COLUMN "public"."course_videos"."filename" IS 'Original filename of the uploaded video';



COMMENT ON COLUMN "public"."course_videos"."filesize" IS 'Size of the video in bytes';



COMMENT ON COLUMN "public"."course_videos"."duration" IS 'Duration of the video in seconds';



COMMENT ON COLUMN "public"."course_videos"."url" IS 'Public URL from UploadThing';



COMMENT ON COLUMN "public"."course_videos"."uploadthing_id" IS 'UploadThing reference ID';



COMMENT ON COLUMN "public"."course_videos"."order_index" IS 'Order of videos within content';



COMMENT ON COLUMN "public"."course_videos"."status" IS 'Current status of the video';



COMMENT ON COLUMN "public"."course_videos"."mime_type" IS 'MIME type of the video file';



COMMENT ON COLUMN "public"."course_videos"."metadata" IS 'Additional metadata for the video';



COMMENT ON COLUMN "public"."course_videos"."is_active" IS 'Soft delete flag';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "image" "jsonb",
    "status" boolean DEFAULT false NOT NULL,
    "learners" "uuid"[],
    "groups" "uuid"[],
    "category" "uuid",
    "tags" "text"[],
    "accessKey" "text",
    "goals" "text"[]
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."goals" IS 'the goals of the course';



CREATE TABLE IF NOT EXISTS "public"."courses_categories" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "icon" "text"
);


ALTER TABLE "public"."courses_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses_categories" IS 'This is a duplicate of courses_categories';



CREATE TABLE IF NOT EXISTS "public"."courses_content" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "courseId" bigint NOT NULL,
    "content" "jsonb",
    "last_modify_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "order" integer
);


ALTER TABLE "public"."courses_content" OWNER TO "postgres";


ALTER TABLE "public"."courses_content" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_content_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_summaries" (
    "id"                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "course_id"            bigint NOT NULL,
    "name"                 text NOT NULL DEFAULT '',
    "content"              jsonb NOT NULL,
    "source_content_ids"   bigint[] NOT NULL DEFAULT '{}'::bigint[],
    "source_content_count" integer NOT NULL DEFAULT 0,
    "metadata"             jsonb,
    "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "course_summaries_course_id_key" UNIQUE ("course_id")
);

ALTER TABLE "public"."course_summaries" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "idx_course_summaries_course_id"
    ON "public"."course_summaries" ("course_id");



CREATE TABLE IF NOT EXISTS "public"."courses_content_replica" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "courseId" bigint NOT NULL,
    "content" "jsonb",
    "last_modify_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "order" integer
);


ALTER TABLE "public"."courses_content_replica" OWNER TO "postgres";


ALTER TABLE "public"."courses_content_replica" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_content_replica_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."courses_replica" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "image" "jsonb",
    "status" boolean DEFAULT false NOT NULL,
    "learners" "uuid"[],
    "groups" "uuid"[],
    "category" "uuid",
    "tags" "text"[],
    "accessKey" "text",
    "goals" "text"[]
);


ALTER TABLE "public"."courses_replica" OWNER TO "postgres";


ALTER TABLE "public"."courses_replica" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_replica_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_challenges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "challenge_date" "date" DEFAULT CURRENT_DATE,
    "is_completed" boolean DEFAULT false,
    "streak_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nom" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telephone" "text" NOT NULL,
    "niveau" "text" NOT NULL,
    "document_type" "text" DEFAULT '5 chapitres BAC'::"text",
    "est_contacte" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "course_id" bigint,
    "content" "jsonb",
    "title" "text",
    "description" "text",
    "correction" "jsonb",
    "context" "jsonb"
);


ALTER TABLE "public"."exercices" OWNER TO "postgres";


COMMENT ON TABLE "public"."exercices" IS 'Les exercices sur mésure lié aux cours';



CREATE TABLE IF NOT EXISTS "public"."exercices_complete" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "exercice_id" "uuid",
    "is_completed" boolean DEFAULT false,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."exercices_complete" OWNER TO "postgres";


COMMENT ON TABLE "public"."exercices_complete" IS 'whetter the exercices is completed or not';



COMMENT ON COLUMN "public"."exercices_complete"."id" IS 'the id of the column';



CREATE TABLE IF NOT EXISTS "public"."exercices_pin" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "exercice_id" "uuid",
    "is_pinned" boolean DEFAULT false
);


ALTER TABLE "public"."exercices_pin" OWNER TO "postgres";


COMMENT ON TABLE "public"."exercices_pin" IS 'user exercies pinned';



ALTER TABLE "public"."exercices_pin" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."exercices_pin_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."group_content" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid",
    "content_id" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "group_content_content_type_check" CHECK (("content_type" = ANY (ARRAY['course'::"text", 'exam'::"text", 'exam_question'::"text"])))
);


ALTER TABLE "public"."group_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "learners" "text"[],
    "image" "jsonb",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text",
    "schoolId" "uuid"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."groups"."type" IS 'standalong group or formation one';



CREATE TABLE IF NOT EXISTS "public"."influencers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "promo_code" character varying(50) NOT NULL,
    "discount_percentage" integer NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "profile_description" "text",
    "contact_info" character varying(255),
    "contract_file_path" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "social_media" "jsonb"
);


ALTER TABLE "public"."influencers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_path_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."learning_path_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_path_course_order" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "course_id" bigint NOT NULL,
    "category_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."learning_path_course_order" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_paths" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "status" boolean,
    "last_modified_at" timestamp without time zone DEFAULT "now"(),
    "start_at" timestamp without time zone,
    "end_at" timestamp without time zone,
    "image" "jsonb",
    "duration" "jsonb"[],
    "students" "uuid"[],
    "groups" "uuid"[],
    "content" "jsonb",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_count" integer DEFAULT 0,
    "quiz_count" integer DEFAULT 0,
    "total_duration" integer DEFAULT 0,
    "metadata" "jsonb"
);


ALTER TABLE "public"."learning_paths" OWNER TO "postgres";


COMMENT ON COLUMN "public"."learning_paths"."id" IS 'the learning path id';



CREATE TABLE IF NOT EXISTS "public"."learning_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_start" timestamp with time zone NOT NULL,
    "session_end" timestamp with time zone,
    "last_heartbeat" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content_type" character varying(255),
    "content_id" "text",
    "session_type" character varying(255),
    "duration" interval,
    "is_completed" boolean DEFAULT false
);


ALTER TABLE "public"."learning_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_room_id" "uuid",
    "user_id" "uuid",
    "parent_message_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted" "uuid"[],
    "reads" "uuid"[],
    "attachments" "jsonb"[]
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_history" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message_hash" character varying(50) NOT NULL,
    "hours_remaining" integer NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "message_tone" character varying(20),
    "streak_count" integer,
    "notification_type" character varying(30) DEFAULT 'streak_reminder'::character varying
);


ALTER TABLE "public"."user_notification_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_history" IS 'Historique des notifications pour éviter les doublons et analyser les patterns';



CREATE OR REPLACE VIEW "public"."notification_stats" AS
 SELECT "date"("user_notification_history"."sent_at") AS "date",
    "user_notification_history"."message_tone",
    "count"(*) AS "total_sent",
    "count"(DISTINCT "user_notification_history"."user_id") AS "unique_users",
    "avg"("user_notification_history"."hours_remaining") AS "avg_hours_remaining",
    "avg"("user_notification_history"."streak_count") AS "avg_streak_count"
   FROM "public"."user_notification_history"
  WHERE ("user_notification_history"."sent_at" > ("now"() - '7 days'::interval))
  GROUP BY ("date"("user_notification_history"."sent_at")), "user_notification_history"."message_tone"
  ORDER BY ("date"("user_notification_history"."sent_at")) DESC, ("count"(*)) DESC;


ALTER TABLE "public"."notification_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_room_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "userId" "uuid" NOT NULL
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_status" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "payment_id" "uuid",
    "status" character varying(50) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cart_id" "uuid",
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "phone_number" character varying(20) NOT NULL,
    "payment_provider" character varying(50),
    "payment_reference" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "trx_reference" "text" NOT NULL,
    "status" "text",
    "promo_code_id" "uuid"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."trx_reference" IS 'the trx_refernce to identify in notchpay';



COMMENT ON COLUMN "public"."payments"."status" IS 'the status of the paiemnt';



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role_id" "uuid" DEFAULT "gen_random_uuid"(),
    "can_create" boolean DEFAULT false,
    "can_read" boolean DEFAULT false,
    "can_update" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_code_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "influencer_id" "uuid" NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "discount_amount" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "image" "jsonb",
    "status" boolean DEFAULT false NOT NULL,
    "learners" "uuid"[],
    "groups" "uuid"[],
    "tags" "text"[],
    "accessKey" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course" bigint,
    "course_content" bigint,
    "category" "uuid",
    "selectedCourses" "text"[],
    "isExerciseMode" boolean DEFAULT false,
    "enonce" "text"
);


ALTER TABLE "public"."quiz" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz"."course" IS 'the course the quiz is in relation with';



COMMENT ON COLUMN "public"."quiz"."course_content" IS 'the courrse content the quiz is in relation with';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "quiz_id" "uuid",
    "start_time" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "end_time" timestamp without time zone,
    "score" real,
    "status" character varying(50),
    "timeSpent" integer DEFAULT 0,
    "current_question_index" integer DEFAULT 0,
    "answers" "jsonb" DEFAULT '{}'::"jsonb",
    "selected_answers" "text"[] DEFAULT ARRAY[]::"text"[],
    "last_modified_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quiz_attempts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."quiz_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quiz_attempts_id_seq" OWNED BY "public"."quiz_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."quiz_courses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quizId" "uuid",
    "courseId" bigint
);


ALTER TABLE "public"."quiz_courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_courses" IS 'relation betwwen quiz and courses';



ALTER TABLE "public"."quiz_courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_duplicate" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "image" "jsonb",
    "status" boolean DEFAULT false NOT NULL,
    "learners" "uuid"[],
    "groups" "uuid"[],
    "tags" "text"[],
    "accessKey" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course" bigint,
    "course_content" bigint,
    "category" "uuid",
    "selectedCourses" "text"[],
    "isExerciseMode" boolean DEFAULT false,
    "enonce" "text"
);


ALTER TABLE "public"."quiz_duplicate" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_duplicate" IS 'This is a duplicate of quiz';



COMMENT ON COLUMN "public"."quiz_duplicate"."course" IS 'the course the quiz is in relation with';



COMMENT ON COLUMN "public"."quiz_duplicate"."course_content" IS 'the courrse content the quiz is in relation with';



CREATE TABLE IF NOT EXISTS "public"."quiz_learningpath" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quizId" "uuid",
    "lpId" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."quiz_learningpath" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_pin" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quiz_id" "uuid",
    "user_id" "uuid",
    "is_pinned" boolean
);


ALTER TABLE "public"."quiz_pin" OWNER TO "postgres";


ALTER TABLE "public"."quiz_pin" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_pin_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_question_template" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb",
    "last_modify_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "order" integer,
    "type" "text" DEFAULT 'select'::"text",
    "options" "jsonb"[],
    "correct" "text"[],
    "isMultiple" boolean,
    "title" "text",
    "hasImg" boolean,
    "hasEditor" boolean,
    "hasDetails" boolean,
    "image" "jsonb",
    "details" "jsonb"[],
    "difficulty" integer DEFAULT 0,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "group_id" "uuid",
    "tag" "text"[],
    CONSTRAINT "quiz_question_template_difficulty_check" CHECK (("difficulty" = ANY (ARRAY[0, 1, 2])))
);


ALTER TABLE "public"."quiz_question_template" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_question_template" IS 'This is a duplicate of quiz_questions';



ALTER TABLE "public"."quiz_question_template" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_question_template_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb",
    "last_modify_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "order" integer,
    "quizId" "uuid" NOT NULL,
    "type" "text" DEFAULT 'select'::"text",
    "options" "jsonb"[],
    "correct" "text"[],
    "isMultiple" boolean,
    "title" "text",
    "hasImg" boolean,
    "hasEditor" boolean,
    "hasDetails" boolean,
    "image" "jsonb",
    "details" "jsonb"[],
    "justificatif" "text"
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


ALTER TABLE "public"."quiz_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_tags" (
    "quiz_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quiz_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "resource_id" "uuid" NOT NULL,
    "can_create" boolean DEFAULT false,
    "can_read" boolean DEFAULT false,
    "can_update" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_permissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."resource_permissions"."role_id" IS 'a role can have permission to anglobe permission to users';



CREATE TABLE IF NOT EXISTS "public"."ressources" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "slug" "text"
);


ALTER TABLE "public"."ressources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "reward_type" character varying(50),
    "reward_description" "text",
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "city_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."school_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subdomain" "text" DEFAULT ''::"text" NOT NULL,
    "brand" "jsonb",
    "tenant_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text",
    "name" "text",
    "imageUrl" "text",
    "isActive" boolean DEFAULT false,
    "localisation" "text",
    "sigle" "text"
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invitation_sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "invited_by" "uuid"
);


ALTER TABLE "public"."staff_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."started_exams" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "quiz_id" "uuid" DEFAULT "gen_random_uuid"(),
    "score" numeric,
    "answers" "jsonb",
    "closed_at" timestamp with time zone,
    "proctoring_issues" "jsonb",
    "try" smallint DEFAULT '1'::smallint,
    "end" boolean DEFAULT false,
    "total_xp_gained" double precision DEFAULT 0
);


ALTER TABLE "public"."started_exams" OWNER TO "postgres";


ALTER TABLE "public"."started_exams" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."started_exams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."started_exams_questions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_exams_id" "uuid" DEFAULT "gen_random_uuid"(),
    "questionId" "jsonb",
    "options" "jsonb"
);


ALTER TABLE "public"."started_exams_questions" OWNER TO "postgres";


ALTER TABLE "public"."started_exams_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."started_exams_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."streak_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "streak_date" "date" DEFAULT CURRENT_DATE,
    "streak_count" integer,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."streak_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "level" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."study_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags_content" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tag_id" "uuid",
    "content_id" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tags_content_content_type_check" CHECK (("content_type" = ANY (ARRAY['course'::"text", 'exam'::"text", 'exam_question'::"text"])))
);


ALTER TABLE "public"."tags_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'open'::character varying,
    "agent_id" "uuid",
    "last_reply_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    CONSTRAINT "tickets_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tickets"."title" IS 'the title of the ticket';



CREATE TABLE IF NOT EXISTS "public"."tickets_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ticket_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "image_url" "text",
    "image_path" "text",
    "read_at" timestamp with time zone,
    "message_type" character varying(10) DEFAULT 'text'::character varying,
    CONSTRAINT "tickets_messages_message_type_check" CHECK ((("message_type")::"text" = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."tickets_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "amount" "text",
    "months" numeric,
    "last" timestamp with time zone DEFAULT "now"(),
    "class_id" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_start" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."user_activity_status" DEFAULT 'active'::"public"."user_activity_status",
    "last_heartbeat" timestamp with time zone,
    "device_type" "public"."learning_session_type" NOT NULL,
    "duration" integer GENERATED ALWAYS AS (
CASE
    WHEN ("last_heartbeat" IS NOT NULL) THEN (EXTRACT(epoch FROM ("last_heartbeat" - "session_start")))::integer
    ELSE 0
END) STORED
);


ALTER TABLE "public"."user_activity" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_activity"."status" IS 'if the session is active or not';



COMMENT ON COLUMN "public"."user_activity"."last_heartbeat" IS 'the last heartbeat send by the  application';



CREATE TABLE IF NOT EXISTS "public"."user_answers" (
    "id" integer NOT NULL,
    "attempt_id" integer,
    "question_id" bigint,
    "is_correct" boolean,
    "selected_options" "text"[] DEFAULT ARRAY[]::"text"[],
    "time_taken" integer DEFAULT 0,
    "submitted_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_answers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_answers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_answers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_answers_id_seq" OWNED BY "public"."user_answers"."id";



CREATE TABLE IF NOT EXISTS "public"."user_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "progress" integer DEFAULT 0,
    "completed" boolean DEFAULT false,
    "completion_date" timestamp without time zone
);


ALTER TABLE "public"."user_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_competition_payment_status" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "status" character varying(50) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_competition_payment_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_competition_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "expiry_date" timestamp with time zone NOT NULL,
    "payment_reference" character varying(255),
    "payment_status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "payment_provider" character varying(50),
    "phone_number" character varying(20),
    "promo_code_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "authorizationurl" "text", 
    "has_seen_results" boolean DEFAULT false
);


ALTER TABLE "public"."user_competition_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_complete_exercices" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "exercice_id" "uuid",
    "is_completed" boolean
);


ALTER TABLE "public"."user_complete_exercices" OWNER TO "postgres";


ALTER TABLE "public"."user_complete_exercices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_complete_exercices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_completed_archives" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "archive_id" integer NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_completed_archives" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_completed_archives_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_completed_archives_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_completed_archives_id_seq" OWNED BY "public"."user_completed_archives"."id";



CREATE TABLE IF NOT EXISTS "public"."user_exam_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "quiz_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "is_completed" boolean DEFAULT false,
    "score" numeric,
    "answers" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_exam_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_notification_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_notification_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_notification_history_id_seq" OWNED BY "public"."user_notification_history"."id";



CREATE TABLE IF NOT EXISTS "public"."user_pinned_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "archive_id" integer,
    "user_id" "uuid"
);


ALTER TABLE "public"."user_pinned_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "school" "text",
    "series" "text",
    "has_paid" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_series_check" CHECK (("series" = ANY (ARRAY['A'::"text", 'C'::"text", 'D'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_program_enrollments" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" bigint NOT NULL,
    "expiry_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_program_enrollments" OWNER TO "postgres";


ALTER TABLE "public"."user_program_enrollments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_program_enrollments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."user_program_enrollments" ADD CONSTRAINT unique_user_program UNIQUE (user_id, program_id);



CREATE TABLE IF NOT EXISTS "public"."user_program_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" bigint NOT NULL,
    "amount" integer NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "expiry_date" timestamp with time zone NOT NULL,
    "payment_reference" character varying(255),
    "payment_status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "payment_provider" character varying(50),
    "phone_number" character varying(20),
    "promo_code_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_installment" boolean DEFAULT false,
    "total_installments" integer,
    "current_installment" integer,
    "next_payment_due_date" timestamp with time zone,
    "total_amount" integer,
    "parent_payment_id" "uuid",
    "has_seen_result" boolean DEFAULT false

);


ALTER TABLE "public"."user_program_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'user settings for the mobile application';



ALTER TABLE "public"."user_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_signup_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "is_email_verified" boolean DEFAULT false,
    "is_password_set" boolean DEFAULT false,
    "is_payment_done" boolean DEFAULT false,
    "email" "text" NOT NULL,
    "opt_send" boolean DEFAULT false,
    "opt_send_time" timestamp with time zone,
    "otp_confirm" boolean,
    "classe" "uuid",
    "name" "text",
    "phone" numeric,
    "transaction_id" "text",
    "data" "jsonb"
);


ALTER TABLE "public"."user_signup_status" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_signup_status"."email" IS 'the user email adress';



COMMENT ON COLUMN "public"."user_signup_status"."name" IS 'the student name';



COMMENT ON COLUMN "public"."user_signup_status"."phone" IS 'the student phone number';



CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "max_streak" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "next_deadline" timestamp with time zone DEFAULT ("now"() + '1 day'::interval),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streaks" IS 'Stores user streak information with reference to accounts table';



CREATE TABLE IF NOT EXISTS "public"."user_xp" (
    "userid" "uuid" NOT NULL,
    "total_xp" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."user_xp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usercourseprogress" (
    "id" bigint NOT NULL,
    "userid" "uuid" NOT NULL,
    "courseid" bigint NOT NULL,
    "sectionid" bigint,
    "enrollmentdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lastaccessed" timestamp with time zone,
    "progress" integer DEFAULT 0
);


ALTER TABLE "public"."usercourseprogress" OWNER TO "postgres";


ALTER TABLE "public"."usercourseprogress" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."usercourseprogress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."userquizprogress" (
    "id" bigint NOT NULL,
    "userid" "uuid" NOT NULL,
    "enrollmentdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lastaccessed" timestamp with time zone,
    "progress" integer DEFAULT 0,
    "quizid" "uuid",
    "questionid" bigint,
    "selectedAns" "text"[],
    "score" numeric,
    "correctIds" "text"[] DEFAULT '{}'::"text"[],
    "wrongIds" "text"[] DEFAULT '{}'::"text"[],
    "shouldBeCorrect" "text" DEFAULT '[]'::"text",
    "xp_gained" double precision DEFAULT 0
);


ALTER TABLE "public"."userquizprogress" OWNER TO "postgres";


ALTER TABLE "public"."userquizprogress" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."userquizprogress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."view" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."view" OWNER TO "postgres";


ALTER TABLE "public"."view" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."view_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."vw_concours_details" AS
 SELECT "co"."id" AS "concours_id",
    "co"."name" AS "concours_name",
    "co"."description" AS "concours_description",
    "co"."nextDate" AS "next_date",
    "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "s"."sigle" AS "school_sigle",
    "c"."id" AS "city_id",
    "c"."name" AS "city_name",
    "sc"."id" AS "cycle_id",
    "sc"."name" AS "cycle_name",
    "sc"."level" AS "cycle_level"
   FROM ((("public"."concours" "co"
     JOIN "public"."schools" "s" ON (("co"."school_id" = "s"."id")))
     JOIN "public"."cities" "c" ON (("co"."city_id" = "c"."id")))
     JOIN "public"."study_cycles" "sc" ON (("co"."cycle_id" = "sc"."id")));


ALTER TABLE "public"."vw_concours_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_schools_with_locations" AS
 SELECT "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "s"."sigle" AS "school_sigle",
    "s"."description" AS "school_description",
    "s"."isActive" AS "is_active",
    "c"."id" AS "city_id",
    "c"."name" AS "city_name"
   FROM (("public"."schools" "s"
     JOIN "public"."school_locations" "sl" ON (("s"."id" = "sl"."school_id")))
     JOIN "public"."cities" "c" ON (("sl"."city_id" = "c"."id")));


ALTER TABLE "public"."vw_schools_with_locations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_upcoming_concours" AS
 SELECT "vw_concours_details"."concours_id",
    "vw_concours_details"."concours_name",
    "vw_concours_details"."concours_description",
    "vw_concours_details"."next_date",
    "vw_concours_details"."school_id",
    "vw_concours_details"."school_name",
    "vw_concours_details"."school_sigle",
    "vw_concours_details"."city_id",
    "vw_concours_details"."city_name",
    "vw_concours_details"."cycle_id",
    "vw_concours_details"."cycle_name",
    "vw_concours_details"."cycle_level"
   FROM "public"."vw_concours_details"
  WHERE (("vw_concours_details"."next_date" >= CURRENT_DATE) AND ("vw_concours_details"."next_date" <= (CURRENT_DATE + '30 days'::interval)))
  ORDER BY "vw_concours_details"."next_date";


ALTER TABLE "public"."vw_upcoming_concours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xp_history" (
    "id" integer NOT NULL,
    "userid" "uuid" NOT NULL,
    "xp_gained" integer NOT NULL,
    "source_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "source_id" "text",
    "quiz_id" "uuid"
);


ALTER TABLE "public"."xp_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."xp_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."xp_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."xp_history_id_seq" OWNED BY "public"."xp_history"."id";



CREATE TABLE IF NOT EXISTS "public"."year_programs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "subject" character varying(255) NOT NULL,
    "program" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."year_programs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."concours_archives" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."concours_archives_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."concours_corrections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."concours_corrections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quiz_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quiz_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_answers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_answers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_completed_archives" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_completed_archives_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_notification_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_notification_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."xp_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."xp_history_id_seq"'::"regclass");



ALTER TABLE ONLY "concours_blanc"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "concours_blanc"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "concours_blanc"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "concours_blanc"."payments"
    ADD CONSTRAINT "payments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "concours_blanc"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "concours_blanc"."subjects"
    ADD CONSTRAINT "subjects_code_key" UNIQUE ("code");



ALTER TABLE ONLY "concours_blanc"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "concours_blanc"."exam_attempts"
    ADD CONSTRAINT "unique_active_attempt" UNIQUE ("user_id", "exam_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "concours_blanc"."users_profiles"
    ADD CONSTRAINT "users_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mobile"."concours"
    ADD CONSTRAINT "concours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_program_id_key" UNIQUE ("cart_id", "program_id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."concours_archives"
    ADD CONSTRAINT "concours_archives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."concours_corrections"
    ADD CONSTRAINT "concours_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."concours_learningpaths"
    ADD CONSTRAINT "concours_learningpaths_learningPathId_key" UNIQUE ("learningPathId");



ALTER TABLE ONLY "public"."concours_learningpaths"
    ADD CONSTRAINT "concours_learningpaths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."concours"
    ADD CONSTRAINT "concours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_interactions"
    ADD CONSTRAINT "content_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_learningpath"
    ADD CONSTRAINT "course_learningPath_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_progress_summary"
    ADD CONSTRAINT "course_progress_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_progress_summary"
    ADD CONSTRAINT "course_progress_summary_user_course_unique" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_pkey" PRIMARY KEY ("course_id", "tag_id");



ALTER TABLE ONLY "public"."course_videos"
    ADD CONSTRAINT "course_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses_categories"
    ADD CONSTRAINT "courses_categories_duplicate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses_content_replica"
    ADD CONSTRAINT "courses_content_replica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."course_summaries"
    ADD CONSTRAINT "course_summaries_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses_replica"
    ADD CONSTRAINT "courses_replica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses_content"
    ADD CONSTRAINT "couses_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_challenges"
    ADD CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_requests"
    ADD CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event"
    ADD CONSTRAINT "event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercices_complete"
    ADD CONSTRAINT "exercices_complete_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."exercices_complete"
    ADD CONSTRAINT "exercices_complete_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercices_complete"
    ADD CONSTRAINT "exercices_complete_user_id_exercice_id_key" UNIQUE ("user_id", "exercice_id");



ALTER TABLE ONLY "public"."exercices_pin"
    ADD CONSTRAINT "exercices_pin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercices"
    ADD CONSTRAINT "exercices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_content"
    ADD CONSTRAINT "group_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_promo_code_key" UNIQUE ("promo_code");



ALTER TABLE ONLY "public"."learning_path_categories"
    ADD CONSTRAINT "learning_path_categories_learning_path_id_category_id_key" UNIQUE ("learning_path_id", "category_id");



ALTER TABLE ONLY "public"."learning_path_categories"
    ADD CONSTRAINT "learning_path_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_path_course_order"
    ADD CONSTRAINT "learning_path_course_order_learning_path_id_course_id_key" UNIQUE ("learning_path_id", "course_id");



ALTER TABLE ONLY "public"."learning_path_course_order"
    ADD CONSTRAINT "learning_path_course_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_paths"
    ADD CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_sessions"
    ADD CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_status"
    ADD CONSTRAINT "payment_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_trx_reference_key" UNIQUE ("trx_reference");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_usage"
    ADD CONSTRAINT "promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_courses"
    ADD CONSTRAINT "quiz_courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_duplicate"
    ADD CONSTRAINT "quiz_duplicate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_learningpath"
    ADD CONSTRAINT "quiz_learningPath_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_learningpath"
    ADD CONSTRAINT "quiz_learningpath_lpid_quizid_unique" UNIQUE ("lpId", "quizId");



ALTER TABLE ONLY "public"."quiz_pin"
    ADD CONSTRAINT "quiz_pin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz"
    ADD CONSTRAINT "quiz_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_question_template"
    ADD CONSTRAINT "quiz_question_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_tags"
    ADD CONSTRAINT "quiz_tags_pkey" PRIMARY KEY ("quiz_id", "tag_id");



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ressources"
    ADD CONSTRAINT "ressources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ressources"
    ADD CONSTRAINT "ressources_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_locations"
    ADD CONSTRAINT "school_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_locations"
    ADD CONSTRAINT "school_locations_school_city_key" UNIQUE ("school_id", "city_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."staff_invitations"
    ADD CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."started_exams"
    ADD CONSTRAINT "started_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."started_exams_questions"
    ADD CONSTRAINT "started_exams_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streak_logs"
    ADD CONSTRAINT "streak_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_cycles"
    ADD CONSTRAINT "study_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags_content"
    ADD CONSTRAINT "tags_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets_messages"
    ADD CONSTRAINT "tickets_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_challenges"
    ADD CONSTRAINT "unique_user_challenge" UNIQUE ("user_id", "challenge_date");



ALTER TABLE ONLY "public"."exercices_pin"
    ADD CONSTRAINT "unique_user_exercice" UNIQUE ("user_id", "exercice_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "unique_user_streak" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_competition_payment_status"
    ADD CONSTRAINT "user_competition_payment_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_competition_payments"
    ADD CONSTRAINT "user_competition_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_complete_exercices"
    ADD CONSTRAINT "user_complete_exercices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_completed_archives"
    ADD CONSTRAINT "user_completed_archives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_completed_archives"
    ADD CONSTRAINT "user_completed_archives_unique" UNIQUE ("user_id", "archive_id");



ALTER TABLE ONLY "public"."user_exam_sessions"
    ADD CONSTRAINT "user_exam_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_history"
    ADD CONSTRAINT "user_notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_pinned_archive"
    ADD CONSTRAINT "user_pinned_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_program_enrollments"
    ADD CONSTRAINT "user_program_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_program_payments"
    ADD CONSTRAINT "user_program_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_signup_status"
    ADD CONSTRAINT "user_signup_status_pkey" PRIMARY KEY ("id", "email");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_xp"
    ADD CONSTRAINT "user_xp_pkey" PRIMARY KEY ("userid");



ALTER TABLE ONLY "public"."usercourseprogress"
    ADD CONSTRAINT "usercourseprogress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."userquizprogress"
    ADD CONSTRAINT "userquizprogress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."view"
    ADD CONSTRAINT "view_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "xp_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."year_programs"
    ADD CONSTRAINT "year_programs_pkey" PRIMARY KEY ("id");



CREATE INDEX "document_requests_email_idx" ON "public"."document_requests" USING "btree" ("email");



CREATE INDEX "document_requests_telephone_idx" ON "public"."document_requests" USING "btree" ("telephone");



CREATE INDEX "idx_accounts_role_id" ON "public"."accounts" USING "btree" ("role_id");



CREATE INDEX "idx_audit_logs_course_id" ON "public"."audit_logs" USING "btree" ("course_id");



CREATE INDEX "idx_audit_logs_courses_content_id" ON "public"."audit_logs" USING "btree" ("courses_content_id");



CREATE INDEX "idx_audit_logs_exercice_id" ON "public"."audit_logs" USING "btree" ("exercice_id");



CREATE INDEX "idx_audit_logs_learning_path_id" ON "public"."audit_logs" USING "btree" ("learning_path_id");



CREATE INDEX "idx_audit_logs_quiz_question_id" ON "public"."audit_logs" USING "btree" ("quiz_question_id");



CREATE INDEX "idx_concours_city_id" ON "public"."concours" USING "btree" ("city_id");



CREATE INDEX "idx_concours_corrections_archive_id" ON "public"."concours_corrections" USING "btree" ("archive_id");



CREATE INDEX "idx_concours_cycle_id" ON "public"."concours" USING "btree" ("cycle_id");



CREATE INDEX "idx_concours_next_date" ON "public"."concours" USING "btree" ("nextDate");



CREATE INDEX "idx_concours_school_id" ON "public"."concours" USING "btree" ("school_id");



CREATE INDEX "idx_course_progress_summary_course_id" ON "public"."course_progress_summary" USING "btree" ("course_id");



CREATE INDEX "idx_course_progress_summary_user_id" ON "public"."course_progress_summary" USING "btree" ("user_id");



CREATE INDEX "idx_course_tags_course_id" ON "public"."course_tags" USING "btree" ("course_id");



CREATE INDEX "idx_course_tags_tag_id" ON "public"."course_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_course_videos_course_id" ON "public"."course_videos" USING "btree" ("course_id");



CREATE INDEX "idx_course_videos_order" ON "public"."course_videos" USING "btree" ("order_index");



CREATE INDEX "idx_course_videos_status" ON "public"."course_videos" USING "btree" ("status");



CREATE INDEX "idx_event_is_active" ON "public"."event" USING "btree" ("is_active");



CREATE INDEX "idx_messages_chat_room_id" ON "public"."messages" USING "btree" ("chat_room_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_user_id" ON "public"."messages" USING "btree" ("user_id");



CREATE INDEX "idx_participants_chat_room_id" ON "public"."participants" USING "btree" ("chat_room_id");



CREATE INDEX "idx_quiz_attempts_status" ON "public"."quiz_attempts" USING "btree" ("status");



CREATE INDEX "idx_quiz_attempts_user_id" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_tags_quiz_id" ON "public"."quiz_tags" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_tags_tag_id" ON "public"."quiz_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_school_locations_city_id" ON "public"."school_locations" USING "btree" ("city_id");



CREATE INDEX "idx_school_locations_school_id" ON "public"."school_locations" USING "btree" ("school_id");



CREATE INDEX "idx_started_exams_total_xp_gained" ON "public"."started_exams" USING "btree" ("total_xp_gained");



CREATE INDEX "idx_tickets_agent_id" ON "public"."tickets" USING "btree" ("agent_id");



CREATE INDEX "idx_tickets_messages_ticket_id" ON "public"."tickets_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_user_id" ON "public"."tickets" USING "btree" ("user_id");



CREATE INDEX "idx_user_answers_attempt_id" ON "public"."user_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_user_competition_payment_status_payment_id" ON "public"."user_competition_payment_status" USING "btree" ("payment_id");



CREATE INDEX "idx_user_competition_payments_competition_id" ON "public"."user_competition_payments" USING "btree" ("competition_id");



CREATE INDEX "idx_user_competition_payments_expiry" ON "public"."user_competition_payments" USING "btree" ("expiry_date");



CREATE INDEX "idx_user_competition_payments_status" ON "public"."user_competition_payments" USING "btree" ("payment_status");



CREATE INDEX "idx_user_competition_payments_user_id" ON "public"."user_competition_payments" USING "btree" ("user_id");



CREATE INDEX "idx_user_completed_archives_archive_id" ON "public"."user_completed_archives" USING "btree" ("archive_id");



CREATE INDEX "idx_user_completed_archives_user_id" ON "public"."user_completed_archives" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_history_sent_at" ON "public"."user_notification_history" USING "btree" ("sent_at");



CREATE INDEX "idx_user_notification_history_user_id" ON "public"."user_notification_history" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_history_user_recent" ON "public"."user_notification_history" USING "btree" ("user_id", "sent_at" DESC);



CREATE INDEX "idx_user_program_enrollments_user_id" ON "public"."user_program_enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_last_updated" ON "public"."user_streaks" USING "btree" ("last_updated");



CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE INDEX "idx_userquizprogress_xp_gained" ON "public"."userquizprogress" USING "btree" ("xp_gained");



CREATE INDEX "idx_xp_history_source_id" ON "public"."xp_history" USING "btree" ("source_id");



CREATE INDEX "idx_xp_history_userid" ON "public"."xp_history" USING "btree" ("userid");



CREATE INDEX "idx_year_programs_class_subject" ON "public"."year_programs" USING "btree" ("class_id", "subject");



CREATE OR REPLACE TRIGGER "after_payment_verified" AFTER UPDATE OF "is_payment_done" ON "public"."user_signup_status" FOR EACH ROW WHEN (("new"."is_payment_done" = true)) EXECUTE FUNCTION "public"."insert_into_accounts"();



CREATE OR REPLACE TRIGGER "after_session_end_trigger" AFTER UPDATE OF "session_end" ON "public"."learning_sessions" FOR EACH ROW WHEN (("new"."is_completed" = true)) EXECUTE FUNCTION "public"."after_session_end"();



CREATE OR REPLACE TRIGGER "competition_payment_status_change" AFTER UPDATE ON "public"."user_competition_payments" FOR EACH ROW EXECUTE FUNCTION "public"."log_competition_payment_status_change"();



CREATE OR REPLACE TRIGGER "course_audit_trigger" AFTER INSERT OR UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."log_course_changes"();



CREATE OR REPLACE TRIGGER "course_content_audit_trigger" AFTER INSERT OR UPDATE ON "public"."courses_content" FOR EACH ROW EXECUTE FUNCTION "public"."log_course_content_changes"();



CREATE OR REPLACE TRIGGER "exercise_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."exercices" FOR EACH ROW EXECUTE FUNCTION "public"."log_exercise_changes"();



CREATE OR REPLACE TRIGGER "learning_path_audit_trigger" AFTER INSERT OR UPDATE ON "public"."learning_paths" FOR EACH ROW EXECUTE FUNCTION "public"."log_learning_path_changes"();



CREATE OR REPLACE TRIGGER "payment_status_completed" AFTER UPDATE OF "status" ON "public"."payments" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."handle_payment_completion"();



CREATE OR REPLACE TRIGGER "payments_with_promo_code" AFTER INSERT ON "public"."payments" FOR EACH ROW WHEN (("new"."promo_code_id" IS NOT NULL)) EXECUTE FUNCTION "public"."record_promo_code_usage"();



CREATE OR REPLACE TRIGGER "populate_learning_path_relationships_trigger" AFTER INSERT OR UPDATE OF "content" ON "public"."learning_paths" FOR EACH ROW EXECUTE FUNCTION "public"."populate_learning_path_relationships"();



CREATE OR REPLACE TRIGGER "program_payment_completed" AFTER UPDATE ON "public"."user_program_payments" FOR EACH ROW WHEN ((("new"."payment_status")::"text" = 'completed'::"text")) EXECUTE FUNCTION "public"."enroll_user_after_program_payment"();



CREATE OR REPLACE TRIGGER "quiz_audit_trigger" AFTER INSERT OR UPDATE ON "public"."quiz" FOR EACH ROW EXECUTE FUNCTION "public"."log_quiz_changes"();



CREATE OR REPLACE TRIGGER "quiz_question_audit_trigger" AFTER INSERT OR UPDATE ON "public"."quiz_questions" FOR EACH ROW EXECUTE FUNCTION "public"."log_quiz_question_changes"();



CREATE OR REPLACE TRIGGER "reset_has_correction" AFTER DELETE ON "public"."concours_corrections" FOR EACH ROW EXECUTE FUNCTION "public"."reset_has_correction"();



CREATE OR REPLACE TRIGGER "set_competition_payment_expiry" BEFORE INSERT ON "public"."user_competition_payments" FOR EACH ROW WHEN (("new"."expiry_date" IS NULL)) EXECUTE FUNCTION "public"."calculate_competition_payment_expiry"();



CREATE OR REPLACE TRIGGER "set_content_order_trigger" BEFORE INSERT ON "public"."courses_content" FOR EACH ROW EXECUTE FUNCTION "public"."set_new_content_order"();



CREATE OR REPLACE TRIGGER "set_has_correction" AFTER INSERT ON "public"."concours_corrections" FOR EACH ROW EXECUTE FUNCTION "public"."update_has_correction"();



CREATE OR REPLACE TRIGGER "set_role_id" BEFORE INSERT OR UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_role_id"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."document_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "sync_course_learningpath_trigger" AFTER INSERT OR DELETE ON "public"."course_learningpath" FOR EACH ROW EXECUTE FUNCTION "public"."sync_to_course_order"();



CREATE OR REPLACE TRIGGER "sync_learning_path_course_order_trigger" AFTER INSERT OR DELETE ON "public"."learning_path_course_order" FOR EACH ROW EXECUTE FUNCTION "public"."sync_to_course_learningpath"();



CREATE OR REPLACE TRIGGER "track_session_duration" AFTER UPDATE OF "session_end" ON "public"."learning_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_duration_challenge"();



CREATE OR REPLACE TRIGGER "trg_calculate_xp" AFTER INSERT OR UPDATE ON "public"."usercourseprogress" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_and_update_xp"();



CREATE OR REPLACE TRIGGER "trigger_check_account_unique_contacts" BEFORE INSERT OR UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."check_account_unique_contacts"();



CREATE OR REPLACE TRIGGER "trigger_update_course_progress_summary" AFTER INSERT OR UPDATE ON "public"."usercourseprogress" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_progress_summary"();



CREATE OR REPLACE TRIGGER "trigger_update_xp_on_exam_completion" AFTER UPDATE OF "total_xp_gained" ON "public"."started_exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_xp_on_exam_completion"();



CREATE OR REPLACE TRIGGER "update_cart_total_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_cart_total"();



CREATE OR REPLACE TRIGGER "update_courses_content_replica_trigger" AFTER UPDATE ON "public"."courses_content" FOR EACH ROW EXECUTE FUNCTION "public"."update_courses_replica"();



CREATE OR REPLACE TRIGGER "update_courses_replica_trigger" AFTER UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_courses_replica"();



CREATE OR REPLACE TRIGGER "update_daily_challenge_trigger" AFTER INSERT ON "public"."user_activity" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_challenge"();



CREATE OR REPLACE TRIGGER "update_learning_path_counts_trigger" BEFORE INSERT OR UPDATE OF "content" ON "public"."learning_paths" FOR EACH ROW EXECUTE FUNCTION "public"."update_learning_path_counts"();



CREATE OR REPLACE TRIGGER "update_learning_path_course_count_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."course_learningpath" FOR EACH ROW EXECUTE FUNCTION "public"."update_learning_path_course_count"();



CREATE OR REPLACE TRIGGER "update_learning_path_quiz_count_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."quiz_learningpath" FOR EACH ROW EXECUTE FUNCTION "public"."update_learning_path_quiz_count"();



CREATE OR REPLACE TRIGGER "update_ticket_timestamp" AFTER INSERT ON "public"."tickets_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_last_reply"();



CREATE OR REPLACE TRIGGER "update_user_xp_on_history_insert" AFTER INSERT ON "public"."xp_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_xp"();



ALTER TABLE ONLY "concours_blanc"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "concours_blanc"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "concours_blanc"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "concours_blanc"."exams"
    ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "concours_blanc"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "concours_blanc"."payments"
    ADD CONSTRAINT "payments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "concours_blanc"."exams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "concours_blanc"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "concours_blanc"."questions"
    ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "concours_blanc"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "concours_blanc"."users_profiles"
    ADD CONSTRAINT "users_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "mobile"."concours"
    ADD CONSTRAINT "concours_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_authId_fkey" FOREIGN KEY ("authId") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."accounts"
  ADD  CONSTRAINT "accounts_role_id_fkey" FOREIGN KEY ("role_id") references "public"."roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "unique_user_auth_id" UNIQUE ("authId");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_class_fkey" FOREIGN KEY ("class") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_courses_content_id_fkey" FOREIGN KEY ("courses_content_id") REFERENCES "public"."courses_content"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "public"."exercices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_quiz_question_id_fkey" FOREIGN KEY ("quiz_question_id") REFERENCES "public"."quiz_questions"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."concours_learningpaths"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours_archives"
    ADD CONSTRAINT "concours_archives_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."courses_categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."concours_archives"
    ADD CONSTRAINT "concours_archives_concour_id_fkey" FOREIGN KEY ("concour_id") REFERENCES "public"."concours"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours_archives"
    ADD CONSTRAINT "concours_archives_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "storage"."objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours"
    ADD CONSTRAINT "concours_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id");



ALTER TABLE ONLY "public"."concours_corrections"
    ADD CONSTRAINT "concours_corrections_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "public"."concours_archives"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours_corrections"
    ADD CONSTRAINT "concours_corrections_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "storage"."objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours"
    ADD CONSTRAINT "concours_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."study_cycles"("id");



ALTER TABLE ONLY "public"."concours_learningpaths"
    ADD CONSTRAINT "concours_learningpaths_concourId_fkey" FOREIGN KEY ("concourId") REFERENCES "public"."concours"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours_learningpaths"
    ADD CONSTRAINT "concours_learningpaths_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "public"."learning_paths"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concours"
    ADD CONSTRAINT "concours_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_interactions"
    ADD CONSTRAINT "content_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."course_learningpath"
    ADD CONSTRAINT "course_learningPath_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_learningpath"
    ADD CONSTRAINT "course_learningPath_lpId_fkey" FOREIGN KEY ("lpId") REFERENCES "public"."learning_paths"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress_summary"
    ADD CONSTRAINT "course_progress_summary_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress_summary"
    ADD CONSTRAINT "course_progress_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."courses_categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses_content_replica"
    ADD CONSTRAINT "courses_content_replica_courseid_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_challenges"
    ADD CONSTRAINT "daily_challenges_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercices_complete"
    ADD CONSTRAINT "exercices_complete_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "public"."exercices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercices_complete"
    ADD CONSTRAINT "exercices_complete_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercices"
    ADD CONSTRAINT "exercices_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercices_pin"
    ADD CONSTRAINT "exercices_pin_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "public"."exercices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercices_pin"
    ADD CONSTRAINT "exercices_pin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_videos"
    ADD CONSTRAINT "fk_course_videos_courses" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("userid") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_content"
    ADD CONSTRAINT "group_content_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_categories"
    ADD CONSTRAINT "learning_path_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."courses_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_categories"
    ADD CONSTRAINT "learning_path_categories_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_course_order"
    ADD CONSTRAINT "learning_path_course_order_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."courses_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_course_order"
    ADD CONSTRAINT "learning_path_course_order_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_path_course_order"
    ADD CONSTRAINT "learning_path_course_order_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_sessions"
    ADD CONSTRAINT "learning_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_userid_fkey" FOREIGN KEY ("userId") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_status"
    ADD CONSTRAINT "payment_status_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_promo_code_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."influencers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_code_usage"
    ADD CONSTRAINT "promo_code_usage_influencer_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_code_usage"
    ADD CONSTRAINT "promo_code_usage_payment_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses_content"
    ADD CONSTRAINT "public_couses_content_courseid_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz"
    ADD CONSTRAINT "quiz_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."courses_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz"
    ADD CONSTRAINT "quiz_course_content_fkey" FOREIGN KEY ("course_content") REFERENCES "public"."courses_content"("id");



ALTER TABLE ONLY "public"."quiz"
    ADD CONSTRAINT "quiz_course_fkey" FOREIGN KEY ("course") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_courses"
    ADD CONSTRAINT "quiz_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_courses"
    ADD CONSTRAINT "quiz_courses_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_duplicate"
    ADD CONSTRAINT "quiz_duplicate_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."courses_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_duplicate"
    ADD CONSTRAINT "quiz_duplicate_course_content_fkey" FOREIGN KEY ("course_content") REFERENCES "public"."courses_content"("id");



ALTER TABLE ONLY "public"."quiz_duplicate"
    ADD CONSTRAINT "quiz_duplicate_course_fkey" FOREIGN KEY ("course") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_learningpath"
    ADD CONSTRAINT "quiz_learningPath_lpId_fkey" FOREIGN KEY ("lpId") REFERENCES "public"."learning_paths"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_learningpath"
    ADD CONSTRAINT "quiz_learningPath_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_pin"
    ADD CONSTRAINT "quiz_pin_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_pin"
    ADD CONSTRAINT "quiz_pin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_question_template"
    ADD CONSTRAINT "quiz_question_template_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quizid_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_tags"
    ADD CONSTRAINT "quiz_tags_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_tags"
    ADD CONSTRAINT "quiz_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."ressources"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resource_permissions"
    ADD CONSTRAINT "resource_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_locations"
    ADD CONSTRAINT "school_locations_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id");



ALTER TABLE ONLY "public"."school_locations"
    ADD CONSTRAINT "school_locations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."staff_invitations"
    ADD CONSTRAINT "staff_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."started_exams"
    ADD CONSTRAINT "started_exams_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."started_exams"
    ADD CONSTRAINT "started_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streak_logs"
    ADD CONSTRAINT "streak_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags_content"
    ADD CONSTRAINT "tags_content_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets_messages"
    ADD CONSTRAINT "tickets_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets_messages"
    ADD CONSTRAINT "tickets_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_competition_payment_status"
    ADD CONSTRAINT "user_competition_payment_status_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."user_competition_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_competition_payments"
    ADD CONSTRAINT "user_competition_payments_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."concours"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_competition_payments"
    ADD CONSTRAINT "user_competition_payments_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."influencers"("id");



ALTER TABLE ONLY "public"."user_competition_payments"
    ADD CONSTRAINT "user_competition_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_complete_exercices"
    ADD CONSTRAINT "user_complete_exercices_exercice_id_fkey" FOREIGN KEY ("exercice_id") REFERENCES "public"."exercices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_complete_exercices"
    ADD CONSTRAINT "user_complete_exercices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_completed_archives"
    ADD CONSTRAINT "user_completed_archives_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "public"."concours_archives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_completed_archives"
    ADD CONSTRAINT "user_completed_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exam_sessions"
    ADD CONSTRAINT "user_exam_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_history"
    ADD CONSTRAINT "user_notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_pinned_archive"
    ADD CONSTRAINT "user_pinned_archive_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "public"."concours_archives"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_pinned_archive"
    ADD CONSTRAINT "user_pinned_archive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_program_enrollments"
    ADD CONSTRAINT "user_program_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."concours_learningpaths"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_program_enrollments"
    ADD CONSTRAINT "user_program_enrollments_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_program_payments"
    ADD CONSTRAINT "user_program_payments_parent_payment_id_fkey" FOREIGN KEY ("parent_payment_id") REFERENCES "public"."user_program_payments"("id");



ALTER TABLE ONLY "public"."user_program_payments"
    ADD CONSTRAINT "user_program_payments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."concours_learningpaths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_program_payments"
    ADD CONSTRAINT "user_program_payments_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."influencers"("id");



ALTER TABLE ONLY "public"."user_program_payments"
    ADD CONSTRAINT "user_program_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_signup_status"
    ADD CONSTRAINT "user_signup_status_classe_fkey" FOREIGN KEY ("classe") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."user_signup_status"
    ADD CONSTRAINT "user_signup_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_xp"
    ADD CONSTRAINT "user_xp_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usercourseprogress"
    ADD CONSTRAINT "usercourseprogress_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "public"."courses"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usercourseprogress"
    ADD CONSTRAINT "usercourseprogress_sectionid_fkey" FOREIGN KEY ("sectionid") REFERENCES "public"."courses_content"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usercourseprogress"
    ADD CONSTRAINT "usercourseprogress_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."userquizprogress"
    ADD CONSTRAINT "userquizprogress_questionid_fkey" FOREIGN KEY ("questionid") REFERENCES "public"."quiz_questions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."userquizprogress"
    ADD CONSTRAINT "userquizprogress_quizid_fkey" FOREIGN KEY ("quizid") REFERENCES "public"."quiz"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."userquizprogress"
    ADD CONSTRAINT "userquizprogress_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."accounts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "xp_history_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."year_programs"
    ADD CONSTRAINT "year_programs_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."groups"("id");



ALTER TABLE "mobile"."concours" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow authenticated users to delete from concours_learningpaths" ON "public"."concours_learningpaths" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert into concours_learningpaths" ON "public"."concours_learningpaths" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to select from concours_learningpaths" ON "public"."concours_learningpaths" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update concours_learningpaths" ON "public"."concours_learningpaths" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."event" FOR SELECT USING (true);



CREATE POLICY "System can insert payment status" ON "public"."user_competition_payment_status" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update payment status" ON "public"."user_competition_payments" FOR UPDATE USING (true);



CREATE POLICY "System can update payment status" ON "public"."user_program_payments" FOR UPDATE USING (true);



CREATE POLICY "Users can create their own competition payments" ON "public"."user_competition_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own program payments" ON "public"."user_program_payments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own exam sessions" ON "public"."user_exam_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own exam sessions" ON "public"."user_exam_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own streaks" ON "public"."user_streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own competition payment status" ON "public"."user_competition_payment_status" FOR SELECT USING (("payment_id" IN ( SELECT "user_competition_payments"."id"
   FROM "public"."user_competition_payments"
  WHERE ("user_competition_payments"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own competition payments" ON "public"."user_competition_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own exam sessions" ON "public"."user_exam_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own program payments" ON "public"."user_program_payments" FOR SELECT USING (true);



CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "concours rls" ON "public"."concours" USING (true);



CREATE POLICY "demo" ON "public"."app_config" USING (true) WITH CHECK (true);



CREATE POLICY "j" ON "public"."accounts" USING (true);



CREATE POLICY "test" ON "public"."transactions" USING (true);



ALTER TABLE "public"."user_competition_payment_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_competition_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_program_payments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."app_config";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."audit_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cart_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."carts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."concours";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."concours_learningpaths";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."course_progress_summary";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."course_videos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses_categories";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses_content";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."groups";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."influencers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."learning_paths";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."learning_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payment_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_attempts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_duplicate";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_pin";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_question_template";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_questions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ressources";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."schools";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."started_exams";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tickets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tickets_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."transactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_activity";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_program_enrollments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_program_payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_signup_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_streaks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_xp";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."usercourseprogress";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."xp_history";



GRANT USAGE ON SCHEMA "concours_blanc" TO "anon";
GRANT USAGE ON SCHEMA "concours_blanc" TO "authenticated";
GRANT USAGE ON SCHEMA "concours_blanc" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."after_session_end"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_session_end"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_session_end"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_update_xp"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_update_xp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_update_xp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_competition_payment_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_competition_payment_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_competition_payment_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_session_duration"("session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_session_duration"("session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_session_duration"("session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_account_unique_contacts"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_account_unique_contacts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_account_unique_contacts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_update_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_competition_access"("p_user_id" "uuid", "p_competition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_competition_access"("p_user_id" "uuid", "p_competition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_competition_access"("p_user_id" "uuid", "p_competition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_program_payment_access"("p_user_id" "uuid", "p_program_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_program_payment_access"("p_user_id" "uuid", "p_program_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_program_payment_access"("p_user_id" "uuid", "p_program_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_incomplete_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_incomplete_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_incomplete_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notification_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notification_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notification_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."courses_audit_trigger_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."courses_audit_trigger_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."courses_audit_trigger_function"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_safely"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_safely"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_safely"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enroll_user_after_program_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."enroll_user_after_program_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enroll_user_after_program_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_class_levels"("p_class_id" "uuid", "p_class_name" "text", "p_base_levels" integer, "p_xp_multiplier" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_class_levels"("p_class_id" "uuid", "p_class_name" "text", "p_base_levels" integer, "p_xp_multiplier" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_class_levels"("p_class_id" "uuid", "p_class_name" "text", "p_base_levels" integer, "p_xp_multiplier" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_programs"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_programs"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_programs"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_concours_by_school_and_city"("school_sigle" "text", "city_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_concours_by_school_and_city"("school_sigle" "text", "city_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_concours_by_school_and_city"("school_sigle" "text", "city_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_program_details"("p_program_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_program_details"("p_program_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_program_details"("p_program_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_schools_by_city"("city_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_schools_by_city"("city_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schools_by_city"("city_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upcoming_concours_by_city"("city_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_upcoming_concours_by_city"("city_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upcoming_concours_by_city"("city_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payment_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payment_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payment_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_into_accounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_into_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_into_accounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_competition_payment_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_competition_payment_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_competition_payment_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_course_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_course_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_course_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_course_content_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_course_content_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_course_content_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_exercise_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_exercise_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_exercise_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_learning_path_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_learning_path_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_learning_path_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_quiz_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_quiz_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_quiz_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_quiz_question_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_quiz_question_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_quiz_question_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_learning_path_relationships"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_learning_path_relationships"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_learning_path_relationships"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rechercher_partout"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rechercher_partout"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rechercher_partout"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_promo_code_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_promo_code_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_promo_code_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_has_correction"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_has_correction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_has_correction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_new_content_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_new_content_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_new_content_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_to_course_learningpath"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_to_course_learningpath"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_to_course_learningpath"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_to_course_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_to_course_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_to_course_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_user_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_user_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_user_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cart_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cart_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cart_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_challenge_progress"("challenge_type" "text", "user_id_or_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"("challenge_type" "text", "user_id_or_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_challenge_progress"("challenge_type" "text", "user_id_or_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_connection_streak"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_connection_streak"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_connection_streak"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_progress_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_progress_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_progress_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_courses_replica"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_courses_replica"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_courses_replica"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_challenge"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_challenge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_challenge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_has_correction"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_has_correction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_has_correction"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_learning_path_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_learning_path_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_learning_path_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_learning_path_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_learning_path_course_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_learning_path_course_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_learning_path_course_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_learning_path_quiz_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_learning_path_quiz_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_learning_path_quiz_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_role_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_role_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_role_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_duration_challenge"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_duration_challenge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_duration_challenge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_last_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_last_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_last_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_xp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_xp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_xp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_xp_on_exam_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_xp_on_exam_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_xp_on_exam_completion"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."concours" TO "anon";
GRANT ALL ON TABLE "public"."concours" TO "authenticated";
GRANT ALL ON TABLE "public"."concours" TO "service_role";



GRANT ALL ON TABLE "public"."concours_archives" TO "anon";
GRANT ALL ON TABLE "public"."concours_archives" TO "authenticated";
GRANT ALL ON TABLE "public"."concours_archives" TO "service_role";



GRANT ALL ON SEQUENCE "public"."concours_archives_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."concours_archives_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."concours_archives_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."concours_corrections" TO "anon";
GRANT ALL ON TABLE "public"."concours_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."concours_corrections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."concours_corrections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."concours_corrections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."concours_corrections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."concours_learningpaths" TO "anon";
GRANT ALL ON TABLE "public"."concours_learningpaths" TO "authenticated";
GRANT ALL ON TABLE "public"."concours_learningpaths" TO "service_role";



GRANT ALL ON SEQUENCE "public"."concours_learningpaths_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."concours_learningpaths_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."concours_learningpaths_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."content_interactions" TO "anon";
GRANT ALL ON TABLE "public"."content_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."content_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."course_learningpath" TO "anon";
GRANT ALL ON TABLE "public"."course_learningpath" TO "authenticated";
GRANT ALL ON TABLE "public"."course_learningpath" TO "service_role";



GRANT ALL ON TABLE "public"."course_progress_summary" TO "anon";
GRANT ALL ON TABLE "public"."course_progress_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."course_progress_summary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_progress_summary_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_progress_summary_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_progress_summary_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_tags" TO "anon";
GRANT ALL ON TABLE "public"."course_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."course_tags" TO "service_role";



GRANT ALL ON TABLE "public"."course_videos" TO "anon";
GRANT ALL ON TABLE "public"."course_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."course_videos" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."courses_categories" TO "anon";
GRANT ALL ON TABLE "public"."courses_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."courses_categories" TO "service_role";



GRANT ALL ON TABLE "public"."courses_content" TO "anon";
GRANT ALL ON TABLE "public"."courses_content" TO "authenticated";
GRANT ALL ON TABLE "public"."courses_content" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_content_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_content_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_content_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses_content_replica" TO "anon";
GRANT ALL ON TABLE "public"."courses_content_replica" TO "authenticated";
GRANT ALL ON TABLE "public"."courses_content_replica" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_content_replica_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_content_replica_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_content_replica_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses_replica" TO "anon";
GRANT ALL ON TABLE "public"."courses_replica" TO "authenticated";
GRANT ALL ON TABLE "public"."courses_replica" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_replica_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_replica_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_replica_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_challenges" TO "anon";
GRANT ALL ON TABLE "public"."daily_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."document_requests" TO "anon";
GRANT ALL ON TABLE "public"."document_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."document_requests" TO "service_role";



GRANT ALL ON TABLE "public"."event" TO "anon";
GRANT ALL ON TABLE "public"."event" TO "authenticated";
GRANT ALL ON TABLE "public"."event" TO "service_role";



GRANT ALL ON TABLE "public"."exercices" TO "anon";
GRANT ALL ON TABLE "public"."exercices" TO "authenticated";
GRANT ALL ON TABLE "public"."exercices" TO "service_role";



GRANT ALL ON TABLE "public"."exercices_complete" TO "anon";
GRANT ALL ON TABLE "public"."exercices_complete" TO "authenticated";
GRANT ALL ON TABLE "public"."exercices_complete" TO "service_role";



GRANT ALL ON TABLE "public"."exercices_pin" TO "anon";
GRANT ALL ON TABLE "public"."exercices_pin" TO "authenticated";
GRANT ALL ON TABLE "public"."exercices_pin" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exercices_pin_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exercices_pin_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exercices_pin_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."group_content" TO "anon";
GRANT ALL ON TABLE "public"."group_content" TO "authenticated";
GRANT ALL ON TABLE "public"."group_content" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."influencers" TO "anon";
GRANT ALL ON TABLE "public"."influencers" TO "authenticated";
GRANT ALL ON TABLE "public"."influencers" TO "service_role";



GRANT ALL ON TABLE "public"."learning_path_categories" TO "anon";
GRANT ALL ON TABLE "public"."learning_path_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_path_categories" TO "service_role";



GRANT ALL ON TABLE "public"."learning_path_course_order" TO "anon";
GRANT ALL ON TABLE "public"."learning_path_course_order" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_path_course_order" TO "service_role";



GRANT ALL ON TABLE "public"."learning_paths" TO "anon";
GRANT ALL ON TABLE "public"."learning_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_paths" TO "service_role";



GRANT ALL ON TABLE "public"."learning_sessions" TO "anon";
GRANT ALL ON TABLE "public"."learning_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_history" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_history" TO "service_role";



GRANT ALL ON TABLE "public"."notification_stats" TO "anon";
GRANT ALL ON TABLE "public"."notification_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_stats" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON TABLE "public"."payment_status" TO "anon";
GRANT ALL ON TABLE "public"."payment_status" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_status" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."quiz" TO "anon";
GRANT ALL ON TABLE "public"."quiz" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_courses" TO "anon";
GRANT ALL ON TABLE "public"."quiz_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_duplicate" TO "anon";
GRANT ALL ON TABLE "public"."quiz_duplicate" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_duplicate" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_learningpath" TO "anon";
GRANT ALL ON TABLE "public"."quiz_learningpath" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_learningpath" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_pin" TO "anon";
GRANT ALL ON TABLE "public"."quiz_pin" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_pin" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_pin_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_pin_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_pin_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_question_template" TO "anon";
GRANT ALL ON TABLE "public"."quiz_question_template" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_question_template" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_question_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_question_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_question_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_tags" TO "anon";
GRANT ALL ON TABLE "public"."quiz_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_tags" TO "service_role";



GRANT ALL ON TABLE "public"."resource_permissions" TO "anon";
GRANT ALL ON TABLE "public"."resource_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."ressources" TO "anon";
GRANT ALL ON TABLE "public"."ressources" TO "authenticated";
GRANT ALL ON TABLE "public"."ressources" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."school_locations" TO "anon";
GRANT ALL ON TABLE "public"."school_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."school_locations" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."staff_invitations" TO "anon";
GRANT ALL ON TABLE "public"."staff_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."started_exams" TO "anon";
GRANT ALL ON TABLE "public"."started_exams" TO "authenticated";
GRANT ALL ON TABLE "public"."started_exams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."started_exams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."started_exams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."started_exams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."started_exams_questions" TO "anon";
GRANT ALL ON TABLE "public"."started_exams_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."started_exams_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."started_exams_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."started_exams_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."started_exams_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."streak_logs" TO "anon";
GRANT ALL ON TABLE "public"."streak_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."streak_logs" TO "service_role";



GRANT ALL ON TABLE "public"."study_cycles" TO "anon";
GRANT ALL ON TABLE "public"."study_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."study_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tags_content" TO "anon";
GRANT ALL ON TABLE "public"."tags_content" TO "authenticated";
GRANT ALL ON TABLE "public"."tags_content" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."tickets_messages" TO "anon";
GRANT ALL ON TABLE "public"."tickets_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets_messages" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity" TO "service_role";



GRANT ALL ON TABLE "public"."user_answers" TO "anon";
GRANT ALL ON TABLE "public"."user_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_answers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_answers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_answers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_answers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_challenges" TO "anon";
GRANT ALL ON TABLE "public"."user_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."user_competition_payment_status" TO "anon";
GRANT ALL ON TABLE "public"."user_competition_payment_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_competition_payment_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_competition_payments" TO "anon";
GRANT ALL ON TABLE "public"."user_competition_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_competition_payments" TO "service_role";



GRANT ALL ON TABLE "public"."user_complete_exercices" TO "anon";
GRANT ALL ON TABLE "public"."user_complete_exercices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_complete_exercices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_complete_exercices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_complete_exercices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_complete_exercices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_completed_archives" TO "anon";
GRANT ALL ON TABLE "public"."user_completed_archives" TO "authenticated";
GRANT ALL ON TABLE "public"."user_completed_archives" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_completed_archives_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_completed_archives_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_completed_archives_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_exam_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_exam_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_exam_sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_notification_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_notification_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_notification_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_pinned_archive" TO "anon";
GRANT ALL ON TABLE "public"."user_pinned_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."user_pinned_archive" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_program_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."user_program_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_program_enrollments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_program_enrollments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_program_enrollments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_program_enrollments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_program_payments" TO "anon";
GRANT ALL ON TABLE "public"."user_program_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_program_payments" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_signup_status" TO "anon";
GRANT ALL ON TABLE "public"."user_signup_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_signup_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_xp" TO "anon";
GRANT ALL ON TABLE "public"."user_xp" TO "authenticated";
GRANT ALL ON TABLE "public"."user_xp" TO "service_role";



GRANT ALL ON TABLE "public"."usercourseprogress" TO "anon";
GRANT ALL ON TABLE "public"."usercourseprogress" TO "authenticated";
GRANT ALL ON TABLE "public"."usercourseprogress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."usercourseprogress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."usercourseprogress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."usercourseprogress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."userquizprogress" TO "anon";
GRANT ALL ON TABLE "public"."userquizprogress" TO "authenticated";
GRANT ALL ON TABLE "public"."userquizprogress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."userquizprogress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."userquizprogress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."userquizprogress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."view" TO "anon";
GRANT ALL ON TABLE "public"."view" TO "authenticated";
GRANT ALL ON TABLE "public"."view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."view_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."view_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."view_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vw_concours_details" TO "anon";
GRANT ALL ON TABLE "public"."vw_concours_details" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_concours_details" TO "service_role";



GRANT ALL ON TABLE "public"."vw_schools_with_locations" TO "anon";
GRANT ALL ON TABLE "public"."vw_schools_with_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_schools_with_locations" TO "service_role";



GRANT ALL ON TABLE "public"."vw_upcoming_concours" TO "anon";
GRANT ALL ON TABLE "public"."vw_upcoming_concours" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_upcoming_concours" TO "service_role";



GRANT ALL ON TABLE "public"."xp_history" TO "anon";
GRANT ALL ON TABLE "public"."xp_history" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."xp_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."xp_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."xp_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."year_programs" TO "anon";
GRANT ALL ON TABLE "public"."year_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."year_programs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."create_account_on_auth_insert"();


RESET ALL;
