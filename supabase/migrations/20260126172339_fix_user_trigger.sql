alter table "public"."news" drop constraint "news_action_type_check";

alter table "public"."news" drop constraint "news_card_style_check";

alter table "public"."news" drop constraint "news_media_type_check";

alter table "public"."news" drop constraint "news_status_check";

alter table "public"."news" drop constraint "news_target_audience_check";

alter table "public"."news_interactions" drop constraint "news_interactions_interaction_type_check";

alter table "public"."news" add constraint "news_action_type_check" CHECK (((action_type)::text = ANY ((ARRAY['none'::character varying, 'internal_page'::character varying, 'external_link'::character varying, 'detail_page'::character varying, 'deep_link'::character varying])::text[]))) not valid;

alter table "public"."news" validate constraint "news_action_type_check";

alter table "public"."news" add constraint "news_card_style_check" CHECK (((card_style)::text = ANY ((ARRAY['default'::character varying, 'minimal'::character varying, 'full'::character varying, 'banner'::character varying])::text[]))) not valid;

alter table "public"."news" validate constraint "news_card_style_check";

alter table "public"."news" add constraint "news_media_type_check" CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'none'::character varying])::text[]))) not valid;

alter table "public"."news" validate constraint "news_media_type_check";

alter table "public"."news" add constraint "news_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'scheduled'::character varying, 'published'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."news" validate constraint "news_status_check";

alter table "public"."news" add constraint "news_target_audience_check" CHECK (((target_audience)::text = ANY ((ARRAY['all'::character varying, 'concours'::character varying, 'secondary'::character varying, 'specific'::character varying])::text[]))) not valid;

alter table "public"."news" validate constraint "news_target_audience_check";

alter table "public"."news_interactions" add constraint "news_interactions_interaction_type_check" CHECK (((interaction_type)::text = ANY ((ARRAY['click'::character varying, 'share'::character varying, 'dismiss'::character varying, 'like'::character varying, 'bookmark'::character varying])::text[]))) not valid;

alter table "public"."news_interactions" validate constraint "news_interactions_interaction_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_account_on_auth_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.accounts (authId, email, phone)
  VALUES (NEW.id, NEW.email, NEW.phone)
  ON CONFLICT (authId) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_program_quiz_count_on_course_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Mettre à jour le quiz_count du programme affecté
    UPDATE public.secondary_programs
    SET quiz_count = (
        SELECT COUNT(DISTINCT qc."quizId")
        FROM public.secondary_program_courses spc
        JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
        WHERE spc.program_id = COALESCE(NEW.program_id, OLD.program_id)
    )
    WHERE id = COALESCE(NEW.program_id, OLD.program_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_quiz_to_secondary_program()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_program_id UUID;
    v_course_id BIGINT;
BEGIN
    -- Récupérer le course_id depuis NEW ou OLD
    v_course_id := COALESCE(NEW."courseId", OLD."courseId");
    
    -- Trouver tous les programmes qui contiennent ce cours
    FOR v_program_id IN 
        SELECT DISTINCT program_id 
        FROM public.secondary_program_courses 
        WHERE course_id = v_course_id
    LOOP
        -- Mettre à jour le quiz_count en comptant tous les quiz uniques des cours du programme
        UPDATE public.secondary_programs
        SET quiz_count = (
            SELECT COUNT(DISTINCT qc."quizId")
            FROM public.secondary_program_courses spc
            JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
            WHERE spc.program_id = v_program_id
        )
        WHERE id = v_program_id;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;


