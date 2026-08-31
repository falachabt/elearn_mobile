create table "public"."generation_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "type" text not null,
    "status" text not null default 'pending'::text,
    "progress" jsonb default '{"total": 0, "current": 0}'::jsonb,
    "current_step" jsonb,
    "config" jsonb,
    "result" jsonb,
    "error_message" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."generation_jobs" enable row level security;

CREATE UNIQUE INDEX generation_jobs_pkey ON public.generation_jobs USING btree (id);

CREATE INDEX idx_generation_jobs_status ON public.generation_jobs USING btree (status);

CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs USING btree (user_id);

alter table "public"."generation_jobs" add constraint "generation_jobs_pkey" PRIMARY KEY using index "generation_jobs_pkey";

alter table "public"."generation_jobs" add constraint "generation_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."generation_jobs" validate constraint "generation_jobs_user_id_fkey";

grant delete on table "public"."generation_jobs" to "anon";

grant insert on table "public"."generation_jobs" to "anon";

grant references on table "public"."generation_jobs" to "anon";

grant select on table "public"."generation_jobs" to "anon";

grant trigger on table "public"."generation_jobs" to "anon";

grant truncate on table "public"."generation_jobs" to "anon";

grant update on table "public"."generation_jobs" to "anon";

grant delete on table "public"."generation_jobs" to "authenticated";

grant insert on table "public"."generation_jobs" to "authenticated";

grant references on table "public"."generation_jobs" to "authenticated";

grant select on table "public"."generation_jobs" to "authenticated";

grant trigger on table "public"."generation_jobs" to "authenticated";

grant truncate on table "public"."generation_jobs" to "authenticated";

grant update on table "public"."generation_jobs" to "authenticated";

grant delete on table "public"."generation_jobs" to "service_role";

grant insert on table "public"."generation_jobs" to "service_role";

grant references on table "public"."generation_jobs" to "service_role";

grant select on table "public"."generation_jobs" to "service_role";

grant trigger on table "public"."generation_jobs" to "service_role";

grant truncate on table "public"."generation_jobs" to "service_role";

grant update on table "public"."generation_jobs" to "service_role";

create policy "Users can insert their own jobs"
on "public"."generation_jobs"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own jobs"
on "public"."generation_jobs"
as permissive
for select
to public
using ((auth.uid() = user_id));



