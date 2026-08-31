alter table "public"."news" drop constraint "news_action_type_check";

alter table "public"."news" drop constraint "news_card_style_check";

alter table "public"."news" drop constraint "news_media_type_check";

alter table "public"."news" drop constraint "news_status_check";

alter table "public"."news" drop constraint "news_target_audience_check";

alter table "public"."news_interactions" drop constraint "news_interactions_interaction_type_check";

alter table "public"."user_program_enrollments" add column "expiry_date" timestamp with time zone;

UPDATE "public"."user_program_enrollments" SET expiry_date = NOW() + INTERVAL '1 day' WHERE expiry_date IS NULL;

alter table "public"."user_program_enrollments" alter column "expiry_date" set not null;

-- Remove duplicates, keeping only the record with the smallest id for each user_id/program_id pair
DELETE FROM "public"."user_program_enrollments" a USING "public"."user_program_enrollments" b
WHERE a.id > b.id AND a.user_id = b.user_id AND a.program_id = b.program_id;

CREATE UNIQUE INDEX unique_user_program ON public.user_program_enrollments USING btree (user_id, program_id);

alter table "public"."user_program_enrollments" add constraint "unique_user_program" UNIQUE using index "unique_user_program";

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

CREATE OR REPLACE FUNCTION public.enroll_user_after_program_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'completed') THEN
    -- Create enrollment, avoiding duplicates
    INSERT INTO user_program_enrollments (user_id, program_id, expiry_date)
    VALUES (NEW.user_id, NEW.program_id, NEW.expiry_date)
    ON CONFLICT (user_id, program_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;


