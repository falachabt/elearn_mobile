-- Migration: add_course_summaries
-- Generated via: supabase db diff -f add_course_summaries (2026-03-09)
-- Purpose: Create the course_summaries table used by generate-course-summaries.cjs
--          One AI-generated summary per course, upserted on conflict(course_id).

create table "public"."course_summaries" (
    "id"                   bigint generated always as identity not null,
    "course_id"            bigint not null,
    "name"                 text not null default ''::text,
    "content"              jsonb not null,
    "source_content_ids"   bigint[] not null default '{}'::bigint[],
    "source_content_count" integer not null default 0,
    "metadata"             jsonb,
    "created_at"           timestamp with time zone not null default now(),
    "updated_at"           timestamp with time zone not null default now()
);

CREATE UNIQUE INDEX course_summaries_pkey ON public.course_summaries USING btree (id);

CREATE UNIQUE INDEX course_summaries_course_id_key ON public.course_summaries USING btree (course_id);

CREATE INDEX idx_course_summaries_course_id ON public.course_summaries USING btree (course_id);

alter table "public"."course_summaries" add constraint "course_summaries_pkey" PRIMARY KEY using index "course_summaries_pkey";

alter table "public"."course_summaries" add constraint "course_summaries_course_id_key" UNIQUE using index "course_summaries_course_id_key";

alter table "public"."course_summaries" add constraint "course_summaries_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."course_summaries" validate constraint "course_summaries_course_id_fkey";
