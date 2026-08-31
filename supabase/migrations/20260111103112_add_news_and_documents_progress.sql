create table "public"."news" (
    "id" uuid not null default gen_random_uuid(),
    "title" character varying(255) not null,
    "subtitle" character varying(255),
    "description" text,
    "content" text,
    "media_type" character varying(20) default 'none'::character varying,
    "media_url" character varying(500),
    "thumbnail_url" character varying(500),
    "media_alt_text" character varying(255),
    "video_duration" integer,
    "start_date" timestamp with time zone not null,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "published_at" timestamp with time zone,
    "priority" integer default 0,
    "display_order" integer default 0,
    "status" character varying(20) default 'draft'::character varying,
    "action_type" character varying(30) default 'none'::character varying,
    "action_data" jsonb,
    "target_audience" character varying(20) default 'all'::character varying,
    "target_programs" jsonb,
    "target_user_types" jsonb,
    "is_featured" boolean default false,
    "show_badge" boolean default false,
    "badge_text" character varying(50),
    "badge_color" character varying(20),
    "background_color" character varying(20),
    "text_color" character varying(20),
    "card_style" character varying(20) default 'default'::character varying,
    "author_id" uuid,
    "category" character varying(50),
    "tags" jsonb,
    "view_count" integer default 0,
    "click_count" integer default 0,
    "share_count" integer default 0,
    "require_authentication" boolean default false,
    "show_for_new_users_only" boolean default false,
    "max_display_count" integer
);


alter table "public"."news" enable row level security;

create table "public"."news_interactions" (
    "id" uuid not null default gen_random_uuid(),
    "news_id" uuid not null,
    "user_id" uuid not null,
    "interaction_type" character varying(20) not null,
    "interacted_at" timestamp with time zone default now(),
    "metadata" jsonb
);


alter table "public"."news_interactions" enable row level security;

create table "public"."news_views" (
    "id" uuid not null default gen_random_uuid(),
    "news_id" uuid not null,
    "user_id" uuid not null,
    "viewed_at" timestamp with time zone default now(),
    "session_id" character varying(100),
    "device_info" jsonb
);


alter table "public"."news_views" enable row level security;

create table "public"."secondary_documents_complete" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "document_id" uuid not null,
    "is_completed" boolean default true,
    "completed_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."secondary_documents_complete" enable row level security;

create table "public"."secondary_documents_pin" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "document_id" uuid not null,
    "is_pinned" boolean default true,
    "pinned_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."secondary_documents_pin" enable row level security;

CREATE INDEX idx_news_action_data ON public.news USING gin (action_data);

CREATE INDEX idx_news_author ON public.news USING btree (author_id);

CREATE INDEX idx_news_category ON public.news USING btree (category);

CREATE INDEX idx_news_dates ON public.news USING btree (start_date, end_date);

CREATE INDEX idx_news_featured ON public.news USING btree (is_featured) WHERE (is_featured = true);

CREATE INDEX idx_news_interactions_date ON public.news_interactions USING btree (interacted_at);

CREATE INDEX idx_news_interactions_news ON public.news_interactions USING btree (news_id);

CREATE INDEX idx_news_interactions_type ON public.news_interactions USING btree (news_id, interaction_type);

CREATE INDEX idx_news_interactions_user ON public.news_interactions USING btree (user_id);

CREATE INDEX idx_news_priority ON public.news USING btree (priority DESC, display_order DESC);

CREATE INDEX idx_news_status ON public.news USING btree (status);

CREATE INDEX idx_news_tags ON public.news USING gin (tags);

CREATE INDEX idx_news_target ON public.news USING btree (target_audience);

CREATE INDEX idx_news_target_programs ON public.news USING gin (target_programs);

CREATE INDEX idx_news_views_date ON public.news_views USING btree (viewed_at);

CREATE INDEX idx_news_views_news ON public.news_views USING btree (news_id);

CREATE INDEX idx_news_views_news_user ON public.news_views USING btree (news_id, user_id);

CREATE INDEX idx_news_views_user ON public.news_views USING btree (user_id);

CREATE INDEX idx_secondary_documents_complete_document_id ON public.secondary_documents_complete USING btree (document_id);

CREATE INDEX idx_secondary_documents_complete_user_document ON public.secondary_documents_complete USING btree (user_id, document_id);

CREATE INDEX idx_secondary_documents_complete_user_id ON public.secondary_documents_complete USING btree (user_id);

CREATE INDEX idx_secondary_documents_pin_document_id ON public.secondary_documents_pin USING btree (document_id);

CREATE INDEX idx_secondary_documents_pin_is_pinned ON public.secondary_documents_pin USING btree (is_pinned) WHERE (is_pinned = true);

CREATE INDEX idx_secondary_documents_pin_user_document ON public.secondary_documents_pin USING btree (user_id, document_id);

CREATE INDEX idx_secondary_documents_pin_user_id ON public.secondary_documents_pin USING btree (user_id);

CREATE UNIQUE INDEX news_interactions_pkey ON public.news_interactions USING btree (id);

CREATE UNIQUE INDEX news_pkey ON public.news USING btree (id);

CREATE UNIQUE INDEX news_views_pkey ON public.news_views USING btree (id);

CREATE UNIQUE INDEX secondary_documents_complete_pkey ON public.secondary_documents_complete USING btree (id);

CREATE UNIQUE INDEX secondary_documents_complete_user_id_document_id_key ON public.secondary_documents_complete USING btree (user_id, document_id);

CREATE UNIQUE INDEX secondary_documents_pin_pkey ON public.secondary_documents_pin USING btree (id);

CREATE UNIQUE INDEX secondary_documents_pin_user_id_document_id_key ON public.secondary_documents_pin USING btree (user_id, document_id);

alter table "public"."news" add constraint "news_pkey" PRIMARY KEY using index "news_pkey";

alter table "public"."news_interactions" add constraint "news_interactions_pkey" PRIMARY KEY using index "news_interactions_pkey";

alter table "public"."news_views" add constraint "news_views_pkey" PRIMARY KEY using index "news_views_pkey";

alter table "public"."secondary_documents_complete" add constraint "secondary_documents_complete_pkey" PRIMARY KEY using index "secondary_documents_complete_pkey";

alter table "public"."secondary_documents_pin" add constraint "secondary_documents_pin_pkey" PRIMARY KEY using index "secondary_documents_pin_pkey";

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

alter table "public"."news_interactions" add constraint "news_interactions_news_id_fkey" FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE not valid;

alter table "public"."news_interactions" validate constraint "news_interactions_news_id_fkey";

alter table "public"."news_views" add constraint "news_views_news_id_fkey" FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE not valid;

alter table "public"."news_views" validate constraint "news_views_news_id_fkey";

alter table "public"."secondary_documents_complete" add constraint "secondary_documents_complete_document_id_fkey" FOREIGN KEY (document_id) REFERENCES secondary_documents(id) ON DELETE CASCADE not valid;

alter table "public"."secondary_documents_complete" validate constraint "secondary_documents_complete_document_id_fkey";

alter table "public"."secondary_documents_complete" add constraint "secondary_documents_complete_user_id_document_id_key" UNIQUE using index "secondary_documents_complete_user_id_document_id_key";

alter table "public"."secondary_documents_complete" add constraint "secondary_documents_complete_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."secondary_documents_complete" validate constraint "secondary_documents_complete_user_id_fkey";

alter table "public"."secondary_documents_pin" add constraint "secondary_documents_pin_document_id_fkey" FOREIGN KEY (document_id) REFERENCES secondary_documents(id) ON DELETE CASCADE not valid;

alter table "public"."secondary_documents_pin" validate constraint "secondary_documents_pin_document_id_fkey";

alter table "public"."secondary_documents_pin" add constraint "secondary_documents_pin_user_id_document_id_key" UNIQUE using index "secondary_documents_pin_user_id_document_id_key";

alter table "public"."secondary_documents_pin" add constraint "secondary_documents_pin_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."secondary_documents_pin" validate constraint "secondary_documents_pin_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_active_news_for_user(p_user_id uuid, p_user_type character varying DEFAULT 'all'::character varying, p_user_programs text DEFAULT '[]'::text, p_is_new_user boolean DEFAULT false, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title character varying, subtitle character varying, description text, content text, media_type character varying, media_url character varying, thumbnail_url character varying, media_alt_text character varying, video_duration integer, start_date timestamp with time zone, end_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, published_at timestamp with time zone, priority integer, display_order integer, status character varying, action_type character varying, action_data jsonb, target_audience character varying, is_featured boolean, show_badge boolean, badge_text character varying, badge_color character varying, background_color character varying, text_color character varying, card_style character varying, category character varying, tags jsonb, view_count integer, click_count integer, share_count integer, has_viewed boolean, user_view_count bigint, has_clicked boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.subtitle,
        n.description,
        n.content,
        n.media_type,
        n.media_url,
        n.thumbnail_url,
        n.media_alt_text,
        n.video_duration,
        n.start_date,
        n.end_date,
        n.created_at,
        n.updated_at,
        n.published_at,
        n.priority,
        n.display_order,
        n.status,
        n.action_type,
        n.action_data,
        n.target_audience,
        n.is_featured,
        n.show_badge,
        n.badge_text,
        n.badge_color,
        n.background_color,
        n.text_color,
        n.card_style,
        n.category,
        n.tags,
        n.view_count,
        n.click_count,
        n.share_count,
        -- Vérifier si l'utilisateur a déjà vu cette actualité
        EXISTS(
            SELECT 1 FROM news_views 
            WHERE news_id = n.id AND user_id = p_user_id
        ) as has_viewed,
        -- Compter le nombre de fois que l'utilisateur a vu cette actualité
        (
            SELECT COUNT(*) FROM news_views 
            WHERE news_id = n.id AND user_id = p_user_id
        ) as user_view_count,
        -- Vérifier si l'utilisateur a cliqué sur cette actualité
        EXISTS(
            SELECT 1 FROM news_interactions 
            WHERE news_id = n.id AND user_id = p_user_id AND interaction_type = 'click'
        ) as has_clicked
    FROM news n
    WHERE 
        -- Statut publié uniquement
        n.status = 'published'
        
        -- Vérifier les dates de début et fin
        AND n.start_date <= NOW()
        AND (n.end_date IS NULL OR n.end_date >= NOW())
        
        -- Vérifier le ciblage d'audience
        AND (
            n.target_audience = 'all'
            OR n.target_audience = p_user_type
            OR (
                n.target_audience = 'specific'
                AND (
                    n.target_programs IS NULL
                    OR n.target_programs @> p_user_programs::jsonb
                )
            )
        )
        
        -- Respecter le nombre max d'affichages
        AND (
            n.max_display_count IS NULL
            OR (
                SELECT COUNT(*) FROM news_views 
                WHERE news_id = n.id AND user_id = p_user_id
            ) < n.max_display_count
        )
        
        -- Filtre pour les nouveaux utilisateurs
        AND (
            n.show_for_new_users_only = FALSE
            OR (n.show_for_new_users_only = TRUE AND p_is_new_user = TRUE)
        )
    
    -- Ordre d'affichage
    ORDER BY 
        n.is_featured DESC,
        n.priority DESC,
        n.display_order DESC,
        n.published_at DESC
    
    LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_news_statistics(p_news_id uuid)
 RETURNS TABLE(news_id uuid, title character varying, total_views integer, total_clicks integer, total_shares integer, unique_viewers bigint, unique_clickers bigint, likes_count bigint, bookmarks_count bigint, click_rate_percentage numeric, last_interaction_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as news_id,
        n.title,
        n.view_count as total_views,
        n.click_count as total_clicks,
        n.share_count as total_shares,
        (SELECT COUNT(DISTINCT user_id) FROM news_views WHERE news_views.news_id = n.id) as unique_viewers,
        (SELECT COUNT(DISTINCT user_id) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'click') as unique_clickers,
        (SELECT COUNT(*) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'like') as likes_count,
        (SELECT COUNT(*) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'bookmark') as bookmarks_count,
        CASE 
            WHEN n.view_count > 0 THEN 
                ROUND((n.click_count::NUMERIC / n.view_count::NUMERIC) * 100, 2)
            ELSE 0 
        END as click_rate_percentage,
        (SELECT MAX(interacted_at) FROM news_interactions WHERE news_interactions.news_id = n.id) as last_interaction_at
    FROM news n
    WHERE n.id = p_news_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_news_visible_for_user(p_news_id uuid, p_user_id uuid, p_user_type character varying DEFAULT 'all'::character varying, p_user_programs jsonb DEFAULT '[]'::jsonb, p_is_new_user boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_news RECORD;
    v_view_count INT;
BEGIN
    -- Récupérer l'actualité
    SELECT * INTO v_news FROM news WHERE id = p_news_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le statut
    IF v_news.status != 'published' THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les dates
    IF v_news.start_date > NOW() OR (v_news.end_date IS NOT NULL AND v_news.end_date < NOW()) THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le nombre max d'affichages
    IF v_news.max_display_count IS NOT NULL THEN
        SELECT COUNT(*) INTO v_view_count FROM news_views WHERE news_id = p_news_id AND user_id = p_user_id;
        IF v_view_count >= v_news.max_display_count THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Vérifier le ciblage nouveaux utilisateurs
    IF v_news.show_for_new_users_only = TRUE AND p_is_new_user = FALSE THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le ciblage d'audience
    IF v_news.target_audience = 'all' THEN
        RETURN TRUE;
    ELSIF v_news.target_audience = p_user_type THEN
        RETURN TRUE;
    ELSIF v_news.target_audience = 'specific' THEN
        -- Vérifier les programmes
        IF v_news.target_programs IS NOT NULL AND NOT (v_news.target_programs @> p_user_programs) THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$function$
;

create materialized view "public"."news_stats" as  SELECT n.id AS news_id,
    n.title,
    n.status,
    n.category,
    n.created_at,
    n.published_at,
    count(DISTINCT nv.user_id) AS unique_viewers,
    count(nv.id) AS total_views,
    count(DISTINCT
        CASE
            WHEN ((ni.interaction_type)::text = 'click'::text) THEN ni.user_id
            ELSE NULL::uuid
        END) AS unique_clickers,
    count(
        CASE
            WHEN ((ni.interaction_type)::text = 'click'::text) THEN 1
            ELSE NULL::integer
        END) AS total_clicks,
    count(
        CASE
            WHEN ((ni.interaction_type)::text = 'share'::text) THEN 1
            ELSE NULL::integer
        END) AS total_shares,
    count(
        CASE
            WHEN ((ni.interaction_type)::text = 'like'::text) THEN 1
            ELSE NULL::integer
        END) AS total_likes,
    count(
        CASE
            WHEN ((ni.interaction_type)::text = 'bookmark'::text) THEN 1
            ELSE NULL::integer
        END) AS total_bookmarks,
    round((((count(
        CASE
            WHEN ((ni.interaction_type)::text = 'click'::text) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(nv.id), 0))::numeric) * (100)::numeric), 2) AS click_through_rate
   FROM ((news n
     LEFT JOIN news_views nv ON ((n.id = nv.news_id)))
     LEFT JOIN news_interactions ni ON ((n.id = ni.news_id)))
  GROUP BY n.id, n.title, n.status, n.category, n.created_at, n.published_at;


CREATE OR REPLACE FUNCTION public.record_news_interaction(p_news_id uuid, p_user_id uuid, p_interaction_type character varying, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer l'interaction
    INSERT INTO news_interactions (news_id, user_id, interaction_type, metadata)
    VALUES (p_news_id, p_user_id, p_interaction_type, p_metadata);
    
    -- Mettre à jour les compteurs selon le type d'interaction
    IF p_interaction_type = 'click' THEN
        UPDATE news SET click_count = click_count + 1 WHERE id = p_news_id;
    ELSIF p_interaction_type = 'share' THEN
        UPDATE news SET share_count = share_count + 1 WHERE id = p_news_id;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_news_view(p_news_id uuid, p_user_id uuid, p_session_id character varying DEFAULT NULL::character varying, p_device_info jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer la vue
    INSERT INTO news_views (news_id, user_id, session_id, device_info)
    VALUES (p_news_id, p_user_id, p_session_id, p_device_info);
    
    -- Incrémenter le compteur de vues
    UPDATE news 
    SET view_count = view_count + 1
    WHERE id = p_news_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_news_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secondary_documents_complete_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secondary_documents_pin_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$function$
;

CREATE UNIQUE INDEX idx_news_stats_news_id ON public.news_stats USING btree (news_id);

grant delete on table "public"."news" to "anon";

grant insert on table "public"."news" to "anon";

grant references on table "public"."news" to "anon";

grant select on table "public"."news" to "anon";

grant trigger on table "public"."news" to "anon";

grant truncate on table "public"."news" to "anon";

grant update on table "public"."news" to "anon";

grant delete on table "public"."news" to "authenticated";

grant insert on table "public"."news" to "authenticated";

grant references on table "public"."news" to "authenticated";

grant select on table "public"."news" to "authenticated";

grant trigger on table "public"."news" to "authenticated";

grant truncate on table "public"."news" to "authenticated";

grant update on table "public"."news" to "authenticated";

grant delete on table "public"."news" to "service_role";

grant insert on table "public"."news" to "service_role";

grant references on table "public"."news" to "service_role";

grant select on table "public"."news" to "service_role";

grant trigger on table "public"."news" to "service_role";

grant truncate on table "public"."news" to "service_role";

grant update on table "public"."news" to "service_role";

grant delete on table "public"."news_interactions" to "anon";

grant insert on table "public"."news_interactions" to "anon";

grant references on table "public"."news_interactions" to "anon";

grant select on table "public"."news_interactions" to "anon";

grant trigger on table "public"."news_interactions" to "anon";

grant truncate on table "public"."news_interactions" to "anon";

grant update on table "public"."news_interactions" to "anon";

grant delete on table "public"."news_interactions" to "authenticated";

grant insert on table "public"."news_interactions" to "authenticated";

grant references on table "public"."news_interactions" to "authenticated";

grant select on table "public"."news_interactions" to "authenticated";

grant trigger on table "public"."news_interactions" to "authenticated";

grant truncate on table "public"."news_interactions" to "authenticated";

grant update on table "public"."news_interactions" to "authenticated";

grant delete on table "public"."news_interactions" to "service_role";

grant insert on table "public"."news_interactions" to "service_role";

grant references on table "public"."news_interactions" to "service_role";

grant select on table "public"."news_interactions" to "service_role";

grant trigger on table "public"."news_interactions" to "service_role";

grant truncate on table "public"."news_interactions" to "service_role";

grant update on table "public"."news_interactions" to "service_role";

grant delete on table "public"."news_views" to "anon";

grant insert on table "public"."news_views" to "anon";

grant references on table "public"."news_views" to "anon";

grant select on table "public"."news_views" to "anon";

grant trigger on table "public"."news_views" to "anon";

grant truncate on table "public"."news_views" to "anon";

grant update on table "public"."news_views" to "anon";

grant delete on table "public"."news_views" to "authenticated";

grant insert on table "public"."news_views" to "authenticated";

grant references on table "public"."news_views" to "authenticated";

grant select on table "public"."news_views" to "authenticated";

grant trigger on table "public"."news_views" to "authenticated";

grant truncate on table "public"."news_views" to "authenticated";

grant update on table "public"."news_views" to "authenticated";

grant delete on table "public"."news_views" to "service_role";

grant insert on table "public"."news_views" to "service_role";

grant references on table "public"."news_views" to "service_role";

grant select on table "public"."news_views" to "service_role";

grant trigger on table "public"."news_views" to "service_role";

grant truncate on table "public"."news_views" to "service_role";

grant update on table "public"."news_views" to "service_role";

grant delete on table "public"."secondary_documents_complete" to "anon";

grant insert on table "public"."secondary_documents_complete" to "anon";

grant references on table "public"."secondary_documents_complete" to "anon";

grant select on table "public"."secondary_documents_complete" to "anon";

grant trigger on table "public"."secondary_documents_complete" to "anon";

grant truncate on table "public"."secondary_documents_complete" to "anon";

grant update on table "public"."secondary_documents_complete" to "anon";

grant delete on table "public"."secondary_documents_complete" to "authenticated";

grant insert on table "public"."secondary_documents_complete" to "authenticated";

grant references on table "public"."secondary_documents_complete" to "authenticated";

grant select on table "public"."secondary_documents_complete" to "authenticated";

grant trigger on table "public"."secondary_documents_complete" to "authenticated";

grant truncate on table "public"."secondary_documents_complete" to "authenticated";

grant update on table "public"."secondary_documents_complete" to "authenticated";

grant delete on table "public"."secondary_documents_complete" to "service_role";

grant insert on table "public"."secondary_documents_complete" to "service_role";

grant references on table "public"."secondary_documents_complete" to "service_role";

grant select on table "public"."secondary_documents_complete" to "service_role";

grant trigger on table "public"."secondary_documents_complete" to "service_role";

grant truncate on table "public"."secondary_documents_complete" to "service_role";

grant update on table "public"."secondary_documents_complete" to "service_role";

grant delete on table "public"."secondary_documents_pin" to "anon";

grant insert on table "public"."secondary_documents_pin" to "anon";

grant references on table "public"."secondary_documents_pin" to "anon";

grant select on table "public"."secondary_documents_pin" to "anon";

grant trigger on table "public"."secondary_documents_pin" to "anon";

grant truncate on table "public"."secondary_documents_pin" to "anon";

grant update on table "public"."secondary_documents_pin" to "anon";

grant delete on table "public"."secondary_documents_pin" to "authenticated";

grant insert on table "public"."secondary_documents_pin" to "authenticated";

grant references on table "public"."secondary_documents_pin" to "authenticated";

grant select on table "public"."secondary_documents_pin" to "authenticated";

grant trigger on table "public"."secondary_documents_pin" to "authenticated";

grant truncate on table "public"."secondary_documents_pin" to "authenticated";

grant update on table "public"."secondary_documents_pin" to "authenticated";

grant delete on table "public"."secondary_documents_pin" to "service_role";

grant insert on table "public"."secondary_documents_pin" to "service_role";

grant references on table "public"."secondary_documents_pin" to "service_role";

grant select on table "public"."secondary_documents_pin" to "service_role";

grant trigger on table "public"."secondary_documents_pin" to "service_role";

grant truncate on table "public"."secondary_documents_pin" to "service_role";

grant update on table "public"."secondary_documents_pin" to "service_role";

create policy "Users can view published news"
on "public"."news"
as permissive
for select
to public
using ((((status)::text = 'published'::text) AND (start_date <= now()) AND ((end_date IS NULL) OR (end_date >= now()))));


create policy "Users can create their own interactions"
on "public"."news_interactions"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own interactions"
on "public"."news_interactions"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create their own news views"
on "public"."news_views"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own news views"
on "public"."news_views"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own completed documents"
on "public"."secondary_documents_complete"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own completed documents"
on "public"."secondary_documents_complete"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own completed documents"
on "public"."secondary_documents_complete"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own completed documents"
on "public"."secondary_documents_complete"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own pinned documents"
on "public"."secondary_documents_pin"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own pinned documents"
on "public"."secondary_documents_pin"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own pinned documents"
on "public"."secondary_documents_pin"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own pinned documents"
on "public"."secondary_documents_pin"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER trigger_update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION update_news_updated_at();

CREATE TRIGGER trigger_update_secondary_documents_complete_updated_at BEFORE UPDATE ON public.secondary_documents_complete FOR EACH ROW EXECUTE FUNCTION update_secondary_documents_complete_updated_at();

CREATE TRIGGER trigger_update_secondary_documents_pin_updated_at BEFORE UPDATE ON public.secondary_documents_pin FOR EACH ROW EXECUTE FUNCTION update_secondary_documents_pin_updated_at();


