alter table "public"."news" drop constraint "news_action_type_check";

alter table "public"."news" drop constraint "news_card_style_check";

alter table "public"."news" drop constraint "news_media_type_check";

alter table "public"."news" drop constraint "news_status_check";

alter table "public"."news" drop constraint "news_target_audience_check";

alter table "public"."news_interactions" drop constraint "news_interactions_interaction_type_check";

alter table "public"."user_program_payments" add column "has_seen_result" boolean default false;

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


