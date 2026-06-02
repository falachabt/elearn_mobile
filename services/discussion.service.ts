import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import type {
  DiscussionAttachment,
  DiscussionAuthor,
  DiscussionGroup,
  DiscussionGroupContext,
  DiscussionMessage,
  PendingAttachment,
  SendMessageInput,
} from "@/types/discussion.type";

const ATTACHMENT_BUCKET = "elearn";

// The discussion_* tables are not in the generated Supabase types yet, so we
// reach them through an untyped client to avoid `never` typing errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MESSAGES_PAGE_SIZE = 30;

interface ResolveGroupArgs {
  userId: string;
  secondaryProgramId?: string | null;
  concoursId?: string | null;
}

/**
 * Find the discussion group the user belongs to for a given program/concours.
 * Returns null when the user has no membership (e.g. not enrolled yet).
 */
export async function getMyGroupForContext({
  userId,
  secondaryProgramId,
  concoursId,
}: ResolveGroupArgs): Promise<DiscussionGroupContext | null> {
  if (!userId || (!secondaryProgramId && !concoursId)) return null;

  let query = db
    .from("discussion_group_members")
    .select(
      `
      id,
      joined_at,
      group:discussion_groups!inner(
        id,
        concours_id,
        secondary_program_id,
        group_number,
        capacity,
        current_member_count,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", userId);

  query = secondaryProgramId
    ? query.eq("group.secondary_program_id", secondaryProgramId)
    : query.eq("group.concours_id", concoursId);

  // A user may (due to legacy data) have more than one membership for the same
  // context, so take the first rather than erroring on multiple rows.
  const { data, error } = await query.limit(1);

  if (error) {
    logger.error("[discussion] getMyGroupForContext error:", error);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.group) return null;

  return {
    group: row.group as DiscussionGroup,
    membershipId: row.id as string,
    joinedAt: row.joined_at as string,
  };
}

/** Fetch author info for a set of user ids (no FK exists, so join manually). */
async function fetchAuthors(userIds: string[]): Promise<Map<string, DiscussionAuthor>> {
  const map = new Map<string, DiscussionAuthor>();
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  if (unique.length === 0) return map;

  const { data, error } = await db
    .from("accounts")
    .select("id, firstname, lastname, image")
    .in("id", unique);

  if (error) {
    logger.error("[discussion] fetchAuthors error:", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id, row as DiscussionAuthor);
  }
  return map;
}

/** Resolve a single author (used when a realtime message arrives). */
export async function getAuthor(userId: string): Promise<DiscussionAuthor | null> {
  const map = await fetchAuthors([userId]);
  return map.get(userId) ?? null;
}

/** Fetch attachments for one message (realtime payloads omit embedded rows). */
export async function getMessageAttachments(messageId: string): Promise<DiscussionAttachment[]> {
  const { data, error } = await db
    .from("discussion_message_attachments")
    .select("id, message_id, file_url, file_name, file_type, file_size, created_at")
    .eq("message_id", messageId);
  if (error) {
    logger.error("[discussion] getMessageAttachments error:", error);
    return [];
  }
  return (data ?? []) as DiscussionAttachment[];
}

interface GetMessagesArgs {
  groupId: string;
  /** Fetch messages strictly older than this ISO timestamp (pagination). */
  before?: string | null;
  limit?: number;
}

/**
 * Fetch a page of messages (newest first internally, returned chronological).
 * Returns `hasMore` so the UI can keep paginating on scroll-to-top.
 */
export async function getGroupMessages({
  groupId,
  before,
  limit = MESSAGES_PAGE_SIZE,
}: GetMessagesArgs): Promise<{ messages: DiscussionMessage[]; hasMore: boolean }> {
  let query = db
    .from("discussion_messages")
    .select(
      `
      id, group_id, user_id, text_content, image_url,
      tagged_content_type, tagged_content_id, parent_message_id,
      created_at, updated_at,
      attachments:discussion_message_attachments(
        id, message_id, file_url, file_name, file_type, file_size, created_at
      )
    `
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) {
    logger.error("[discussion] getGroupMessages error:", error);
    throw error;
  }

  const rows = (data ?? []) as DiscussionMessage[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const authors = await fetchAuthors(page.map((m) => m.user_id));
  const withAuthors = page.map((m) => ({ ...m, author: authors.get(m.user_id) ?? null }));

  // Return chronological (oldest -> newest).
  return { messages: withAuthors.reverse(), hasMore };
}

/**
 * Upload a locally-picked file to the chat bucket and return its attachment
 * metadata (not yet linked to a message). The `elearn` bucket is public, so the
 * returned URL is permanent.
 */
export async function uploadChatAttachment(
  groupId: string,
  file: PendingAttachment
): Promise<Omit<DiscussionAttachment, "id" | "message_id">> {
  const safeName = (file.name || "file").replace(/[^\w.\-]+/g, "_");
  const objectPath = `discussion/${groupId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: safeName,
    type: file.mimeType,
  } as unknown as Blob);

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(objectPath, formData.get("file") as unknown as Blob, {
      contentType: file.mimeType,
      upsert: true,
    });

  if (error) {
    logger.error("[discussion] uploadChatAttachment error:", error);
    throw error;
  }

  const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(objectPath);
  return {
    file_url: data.publicUrl,
    file_name: file.name,
    file_type: file.mimeType,
    file_size: file.size ?? null,
  };
}

/** Post a message to the group. The author is the current authenticated user. */
export async function sendMessage(input: SendMessageInput): Promise<DiscussionMessage> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const text = input.textContent?.trim();
  const hasAttachments = (input.attachments?.length ?? 0) > 0;
  if (!text && !input.imageUrl && !hasAttachments && !input.taggedContentId) {
    throw new Error("Message vide");
  }

  const { data, error } = await db
    .from("discussion_messages")
    .insert({
      group_id: input.groupId,
      user_id: user.id,
      text_content: text || null,
      image_url: input.imageUrl ?? null,
      tagged_content_type: input.taggedContentType ?? null,
      tagged_content_id: input.taggedContentId ?? null,
      parent_message_id: input.parentMessageId ?? null,
    })
    .select(
      `
      id, group_id, user_id, text_content, image_url,
      tagged_content_type, tagged_content_id, parent_message_id,
      created_at, updated_at
    `
    )
    .single();

  if (error) {
    logger.error("[discussion] sendMessage error:", error);
    throw error;
  }

  const message = data as DiscussionMessage;
  message.tagged_content_label = input.taggedContentLabel ?? null;

  // Persist attachment rows linked to the new message.
  if (hasAttachments) {
    const rows = input.attachments!.map((a) => ({
      message_id: message.id,
      file_url: a.file_url,
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size,
    }));
    const { data: inserted, error: attErr } = await db
      .from("discussion_message_attachments")
      .insert(rows)
      .select("id, message_id, file_url, file_name, file_type, file_size, created_at");
    if (attErr) {
      logger.error("[discussion] attachment insert error:", attErr);
    } else {
      message.attachments = inserted as DiscussionAttachment[];
    }
  }

  return message;
}

/**
 * Mark a group as read up to now (upsert the user's last_read_at). Called when
 * the chat opens and when new messages arrive while it is open.
 */
export async function markGroupRead(groupId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await db
    .from("discussion_group_reads")
    .upsert(
      { group_id: groupId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "group_id,user_id" }
    );
  if (error) logger.error("[discussion] markGroupRead error:", error);
}

/** Unread message count for one group (messages from others after last_read_at). */
export async function getUnreadCount(groupId: string): Promise<number> {
  const { data, error } = await db.rpc("get_discussion_unread_counts");
  if (error) {
    // RPC not deployed yet -> degrade to 0 rather than throwing.
    return 0;
  }
  const row = (data as { group_id: string; unread_count: number }[] | null)?.find(
    (r) => r.group_id === groupId
  );
  return row ? Number(row.unread_count) : 0;
}

/** Members of a group with their account info (for the header count + avatars). */
export async function getGroupMembers(groupId: string): Promise<DiscussionAuthor[]> {
  const { data, error } = await db
    .from("discussion_group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error) {
    logger.error("[discussion] getGroupMembers error:", error);
    throw error;
  }
  const authors = await fetchAuthors((data ?? []).map((m: { user_id: string }) => m.user_id));
  return Array.from(authors.values());
}

/**
 * Subscribe to new messages in a group via Supabase Realtime.
 * Returns an unsubscribe function — call it on screen unmount to release the
 * connection (keeps Realtime cost scoped to the open chat).
 */
export function subscribeToGroupMessages(
  groupId: string,
  onInsert: (message: DiscussionMessage) => void
): () => void {
  const channel = supabase
    .channel(`discussion-group-${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "discussion_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onInsert(payload.new as DiscussionMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
