set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_account_unique_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_account_on_auth_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- These constraints originally referenced accounts(id) without ON UPDATE CASCADE.
-- Make them cascade before aligning existing accounts.id with auth.users.id.
ALTER TABLE IF EXISTS public.content_interactions
  DROP CONSTRAINT IF EXISTS content_interactions_user_id_fkey;
ALTER TABLE IF EXISTS public.content_interactions
  ADD CONSTRAINT content_interactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.accounts(id) ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public.xp_history
  DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE IF EXISTS public.xp_history
  ADD CONSTRAINT fk_user
  FOREIGN KEY (userid) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.resource_permissions
  DROP CONSTRAINT IF EXISTS resource_permissions_user_id_fkey;
ALTER TABLE IF EXISTS public.resource_permissions
  ADD CONSTRAINT resource_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.accounts(id) ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public.staff_invitations
  DROP CONSTRAINT IF EXISTS staff_invitations_invited_by_fkey;
ALTER TABLE IF EXISTS public.staff_invitations
  ADD CONSTRAINT staff_invitations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.accounts(id) ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public.user_notification_history
  DROP CONSTRAINT IF EXISTS user_notification_history_user_id_fkey;
ALTER TABLE IF EXISTS public.user_notification_history
  ADD CONSTRAINT user_notification_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- These news tables store account ids but do not declare a FK, so they will not cascade.
UPDATE public.news_views AS news_view
SET user_id = account."authId"
FROM public.accounts AS account
WHERE news_view.user_id = account.id
  AND account."authId" IS NOT NULL
  AND account.id IS DISTINCT FROM account."authId";

UPDATE public.news_interactions AS news_interaction
SET user_id = account."authId"
FROM public.accounts AS account
WHERE news_interaction.user_id = account.id
  AND account."authId" IS NOT NULL
  AND account.id IS DISTINCT FROM account."authId";

-- Backfill existing accounts so public.accounts.id matches auth.users.id.
-- Most dependent tables already cascade; the constraints above cover the remaining ones.
UPDATE public.accounts
SET id = "authId"
WHERE "authId" IS NOT NULL
  AND id IS DISTINCT FROM "authId";

-- Backfill firebase_uid from Supabase auth metadata for users created by Firebase phone auth.
UPDATE public.accounts AS account
SET firebase_uid = coalesce(
  nullif(auth_user.raw_user_meta_data->>'firebase_uid', ''),
  nullif(auth_user.raw_app_meta_data->>'firebase_uid', ''),
  account.firebase_uid
)
FROM auth.users AS auth_user
WHERE account."authId" = auth_user.id
  AND account.firebase_uid IS NULL
  AND (
    auth_user.raw_user_meta_data ? 'firebase_uid'
    OR auth_user.raw_app_meta_data ? 'firebase_uid'
  );
