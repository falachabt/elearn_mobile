/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TaggedContentType = "course" | "quiz" | "exercise";

interface DiscussionMessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  text_content: string | null;
  image_url: string | null;
  tagged_content_type: TaggedContentType | null;
  tagged_content_id: string | null;
  parent_message_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: DiscussionMessageRecord;
  old_record: DiscussionMessageRecord | null;
}

interface AccountRow {
  id: string;
  firstname: string | null;
  lastname: string | null;
  metadata: Record<string, unknown> | null;
}

interface DeliveryRow {
  message_id: string;
  user_id: string;
  expo_push_token: string | null;
  status: "sent" | "skipped" | "error";
  ticket_id?: string | null;
  error_message?: string | null;
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;
const CONTENT_TYPE_LABELS: Record<TaggedContentType, string> = {
  course: "un cours",
  quiz: "un quiz",
  exercise: "un exercice",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getServiceRoleKey = () => {
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS");

  const parsed = JSON.parse(secretKeys) as Record<string, string>;
  const key = parsed.default ?? parsed.service_role ?? Object.values(parsed)[0];
  if (!key) throw new Error("SUPABASE_SECRET_KEYS does not contain a usable secret key");
  return key;
};

const isExpoPushToken = (token: unknown): token is string =>
  typeof token === "string" && /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const getAuthorName = (account: Pick<AccountRow, "firstname" | "lastname"> | null) => {
  const name = [account?.firstname?.trim(), account?.lastname?.trim()].filter(Boolean).join(" ");
  return name || "Un membre";
};

const getMessagePreview = (message: DiscussionMessageRecord) => {
  const text = message.text_content?.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  if (message.tagged_content_type) return `a partage ${CONTENT_TYPE_LABELS[message.tagged_content_type]}`;
  if (message.image_url) return "a envoye une image";
  return "a envoye un message";
};

const getDiscussionTitle = async (
  supabase: ReturnType<typeof createClient>,
  groupId: string
): Promise<string> => {
  const { data: group } = await supabase
    .from("discussion_groups")
    .select("group_number, secondary_program_id, concours_id")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return "Groupe de suivi";

  if (group.secondary_program_id) {
    return "Groupe de suivi";
  }

  if (group.concours_id) {
    const { data: concours } = await supabase
      .from("concours")
      .select("name")
      .eq("id", group.concours_id)
      .maybeSingle();
    return concours?.name ? `${concours.name} - groupe de suivi` : "Groupe de suivi";
  }

  return "Groupe de suivi";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const webhookSecret = Deno.env.get("DISCUSSION_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return jsonResponse({ error: "Missing DISCUSSION_WEBHOOK_SECRET" }, 500);
  }

  const providedSecret =
    req.headers.get("x-discussion-webhook-secret") ?? req.headers.get("x-webhook-secret");
  if (providedSecret !== webhookSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "discussion_messages") {
    return jsonResponse({ ignored: true, reason: "Unsupported webhook payload" });
  }

  const message = payload.record;
  if (!message?.id || !message.group_id || !message.user_id) {
    return jsonResponse({ error: "Invalid discussion message payload" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return jsonResponse({ error: "Missing SUPABASE_URL" }, 500);

  const supabase = createClient(supabaseUrl, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: members, error: membersError } = await supabase
    .from("discussion_group_members")
    .select("user_id")
    .eq("group_id", message.group_id)
    .neq("user_id", message.user_id);

  if (membersError) throw membersError;

  const recipientIds = [...new Set((members ?? []).map((member) => member.user_id).filter(Boolean))];
  if (recipientIds.length === 0) {
    return jsonResponse({ ok: true, sent: 0, skipped: 0, reason: "No recipient members" });
  }

  const [{ data: sender }, { data: accounts, error: accountsError }, discussionTitle] = await Promise.all([
    supabase.from("accounts").select("id, firstname, lastname").eq("id", message.user_id).maybeSingle(),
    supabase.from("accounts").select("id, firstname, lastname, metadata").in("id", recipientIds),
    getDiscussionTitle(supabase, message.group_id),
  ]);

  if (accountsError) throw accountsError;

  const senderName = getAuthorName(sender);
  const preview = getMessagePreview(message);
  const baseData = {
    type: "discussion_message",
    groupId: message.group_id,
    messageId: message.id,
    senderId: message.user_id,
    title: discussionTitle,
    screen: `/(app)/chat/${message.group_id}?title=${encodeURIComponent(discussionTitle)}`,
  };

  const deliveries: DeliveryRow[] = [];
  const pushMessages = (accounts ?? []).flatMap((account: AccountRow) => {
    const token = account.metadata?.expoPushToken;
    if (!isExpoPushToken(token)) {
      deliveries.push({
        message_id: message.id,
        user_id: account.id,
        expo_push_token: typeof token === "string" ? token : null,
        status: "skipped",
        error_message: "Missing or invalid Expo push token",
      });
      return [];
    }

    return [{
      account,
      token,
      payload: {
        to: token,
        sound: "default",
        title: discussionTitle,
        body: `${senderName}: ${preview}`,
        data: baseData,
        channelId: "default",
        priority: "high",
      },
    }];
  });

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

  for (const pushChunk of chunk(pushMessages, EXPO_CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
        },
        body: JSON.stringify(pushChunk.map((item) => item.payload)),
      });

      const result = await response.json().catch(() => null);
      const tickets = Array.isArray(result?.data) ? result.data : [];

      pushChunk.forEach((item, index) => {
        const ticket = tickets[index];
        const ok = response.ok && ticket?.status === "ok";
        deliveries.push({
          message_id: message.id,
          user_id: item.account.id,
          expo_push_token: item.token,
          status: ok ? "sent" : "error",
          ticket_id: ok ? ticket.id ?? null : null,
          error_message: ok
            ? null
            : ticket?.message ?? result?.errors?.[0]?.message ?? `Expo HTTP ${response.status}`,
        });
      });
    } catch (error) {
      pushChunk.forEach((item) => {
        deliveries.push({
          message_id: message.id,
          user_id: item.account.id,
          expo_push_token: item.token,
          status: "error",
          error_message: error instanceof Error ? error.message : "Unknown Expo send error",
        });
      });
    }
  }

  if (deliveries.length > 0) {
    const { error: logError } = await supabase
      .from("discussion_message_notification_deliveries")
      .upsert(deliveries, { onConflict: "message_id,user_id" });

    if (logError) console.error("Failed to log discussion notification deliveries", logError);
  }

  return jsonResponse({
    ok: true,
    sent: deliveries.filter((delivery) => delivery.status === "sent").length,
    skipped: deliveries.filter((delivery) => delivery.status === "skipped").length,
    errors: deliveries.filter((delivery) => delivery.status === "error").length,
  });
});
