set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_account_on_auth_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cleaned_phone text;
  normalized_phone numeric;
BEGIN
  cleaned_phone := nullif(regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g'), '');

  IF cleaned_phone IS NULL THEN
    normalized_phone := NULL;
  ELSIF cleaned_phone LIKE '237%' AND length(cleaned_phone) = 12 THEN
    normalized_phone := right(cleaned_phone, 9)::numeric;
  ELSE
    normalized_phone := cleaned_phone::numeric;
  END IF;

  INSERT INTO public.accounts (authId, email, phone, type, onboarding_done)
  VALUES (NEW.id, NEW.email, normalized_phone, 'student', false)
  ON CONFLICT (authId) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.accounts.email),
        phone = COALESCE(EXCLUDED.phone, public.accounts.phone);

  RETURN NEW;
END;
$function$
;
