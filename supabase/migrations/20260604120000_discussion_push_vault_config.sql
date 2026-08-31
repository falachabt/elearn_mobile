-- ============================================================================
-- Discussion push notifications — read webhook config from Supabase Vault
-- ----------------------------------------------------------------------------
-- The managed platform forbids `ALTER DATABASE ... SET app.settings.*`, so the
-- enqueue trigger can no longer rely on custom GUCs. It now reads the webhook
-- URL + shared secret from Supabase Vault (encrypted at rest), and still falls
-- back to the GUCs / a derived URL when a vault entry is absent (local dev).
--
-- Expected vault secrets (create via vault.create_secret):
--   'discussion_message_push_url'  -> full Edge Function URL
--   'discussion_webhook_secret'    -> same value as the Edge Function secret
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_discussion_message_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
    v_webhook_url TEXT;
    v_supabase_url TEXT;
    v_webhook_secret TEXT;
    v_headers JSONB;
BEGIN
    -- Vault first (managed prod), then GUC fallback (local dev).
    BEGIN
        SELECT decrypted_secret INTO v_webhook_url
        FROM vault.decrypted_secrets WHERE name = 'discussion_message_push_url' LIMIT 1;

        SELECT decrypted_secret INTO v_webhook_secret
        FROM vault.decrypted_secrets WHERE name = 'discussion_webhook_secret' LIMIT 1;

        SELECT decrypted_secret INTO v_supabase_url
        FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'discussion-message-push vault read skipped for message %: %', NEW.id, SQLERRM;
    END;

    v_webhook_url := COALESCE(NULLIF(v_webhook_url, ''), NULLIF(current_setting('app.settings.discussion_message_push_url', TRUE), ''));
    v_supabase_url := COALESCE(NULLIF(v_supabase_url, ''), NULLIF(current_setting('app.settings.supabase_url', TRUE), ''));
    v_webhook_secret := COALESCE(NULLIF(v_webhook_secret, ''), NULLIF(current_setting('app.settings.discussion_webhook_secret', TRUE), ''));

    IF v_webhook_url IS NULL AND v_supabase_url IS NOT NULL THEN
        v_webhook_url := RTRIM(v_supabase_url, '/') || '/functions/v1/discussion-message-push';
    END IF;

    IF v_webhook_url IS NULL THEN
        RAISE LOG 'discussion-message-push webhook skipped for message %, no vault/GUC url configured', NEW.id;
        RETURN NEW;
    END IF;

    v_headers := jsonb_build_object('Content-Type', 'application/json');
    IF v_webhook_secret IS NOT NULL THEN
        v_headers := v_headers || jsonb_build_object('x-discussion-webhook-secret', v_webhook_secret);
    END IF;

    PERFORM net.http_post(
        url := v_webhook_url,
        body := jsonb_build_object(
            'type', 'INSERT',
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', to_jsonb(NEW),
            'old_record', NULL
        ),
        headers := v_headers,
        timeout_milliseconds := 1000
    );

    RETURN NEW;
EXCEPTION
    WHEN invalid_schema_name OR undefined_function THEN
        RAISE LOG 'discussion-message-push webhook skipped for message %, pg_net is not available: %', NEW.id, SQLERRM;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE LOG 'discussion-message-push webhook enqueue failed for message %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;
