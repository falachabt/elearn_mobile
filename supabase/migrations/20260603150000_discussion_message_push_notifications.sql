-- ============================================================================
-- Discussion message push notifications
-- ----------------------------------------------------------------------------
-- New discussion_messages rows enqueue an asynchronous pg_net request to the
-- discussion-message-push Edge Function. Secrets are not stored in this file:
--
--   alter database postgres set app.settings.supabase_url = 'https://<project-ref>.supabase.co';
--   alter database postgres set app.settings.discussion_webhook_secret = '<same value as Edge Function secret>';
--
-- Local development can use:
--
--   alter database postgres set app.settings.discussion_message_push_url =
--     'http://host.docker.internal:54321/functions/v1/discussion-message-push';
--
-- If no URL is configured, inserts still succeed and the trigger logs a skip.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.discussion_message_notification_deliveries (
    message_id UUID NOT NULL REFERENCES public.discussion_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    expo_push_token TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'error')),
    ticket_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_notification_deliveries_user
    ON public.discussion_message_notification_deliveries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discussion_notification_deliveries_status
    ON public.discussion_message_notification_deliveries(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_message_notification_deliveries TO service_role;

ALTER TABLE public.discussion_message_notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_discussion_notification_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_discussion_notification_delivery
    ON public.discussion_message_notification_deliveries;

CREATE TRIGGER trigger_touch_discussion_notification_delivery
BEFORE UPDATE ON public.discussion_message_notification_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.touch_discussion_notification_delivery();

CREATE OR REPLACE FUNCTION public.enqueue_discussion_message_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
    v_webhook_url TEXT;
    v_supabase_url TEXT;
    v_webhook_secret TEXT;
    v_headers JSONB;
BEGIN
    v_webhook_url := NULLIF(current_setting('app.settings.discussion_message_push_url', TRUE), '');
    v_supabase_url := NULLIF(current_setting('app.settings.supabase_url', TRUE), '');
    v_webhook_secret := NULLIF(current_setting('app.settings.discussion_webhook_secret', TRUE), '');

    IF v_webhook_url IS NULL AND v_supabase_url IS NOT NULL THEN
        v_webhook_url := RTRIM(v_supabase_url, '/') || '/functions/v1/discussion-message-push';
    END IF;

    IF v_webhook_url IS NULL THEN
        RAISE LOG 'discussion-message-push webhook skipped for message %, no app.settings.supabase_url or app.settings.discussion_message_push_url configured', NEW.id;
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

DROP TRIGGER IF EXISTS trigger_enqueue_discussion_message_push_notification
    ON public.discussion_messages;

CREATE TRIGGER trigger_enqueue_discussion_message_push_notification
AFTER INSERT ON public.discussion_messages
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_discussion_message_push_notification();
