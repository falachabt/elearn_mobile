// Discussion-group chat types.
// The generated Supabase types file (types/supabase.ts) predates these tables,
// so we declare the row shapes here and the service casts its queries to them.

export type TaggedContentType = "course" | "quiz" | "exercise";

/** Client-side delivery state for optimistic rendering (not stored in DB). */
export type MessageStatus = "sending" | "sent" | "failed";

export interface DiscussionAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string | null;
  /** MIME type, e.g. image/jpeg, video/mp4, application/pdf. */
  file_type: string | null;
  file_size: number | null;
  created_at?: string;
}

/** A locally-picked file not yet uploaded (used while composing/sending). */
export interface PendingAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface DiscussionGroup {
  id: string;
  concours_id: string | null;
  secondary_program_id: string | null;
  group_number: number;
  capacity: number;
  current_member_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscussionGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

/** Minimal author info joined from the `accounts` table for chat rendering. */
export interface DiscussionAuthor {
  id: string;
  firstname: string | null;
  lastname: string | null;
  image: { url?: string } | null;
}

export interface DiscussionMessage {
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
  /** Populated when fetched with the author join. */
  author?: DiscussionAuthor | null;
  /** Populated when fetched with the attachments join. */
  attachments?: DiscussionAttachment[];
  /** Client-only optimistic state; absent for confirmed server rows. */
  _status?: MessageStatus;
  /** Client-only: locally-picked attachments shown while uploading. */
  _pendingAttachments?: PendingAttachment[];
  /** Client-only: tag label resolved for display before navigation. */
  tagged_content_label?: string | null;
}

export interface SendMessageInput {
  groupId: string;
  textContent: string;
  imageUrl?: string | null;
  taggedContentType?: TaggedContentType | null;
  taggedContentId?: string | null;
  taggedContentLabel?: string | null;
  parentMessageId?: string | null;
  /** Already-uploaded attachments to persist with the message. */
  attachments?: DiscussionAttachment[];
}

/** A user's group resolved for a given program/concours context. */
export interface DiscussionGroupContext {
  group: DiscussionGroup;
  membershipId: string;
  joinedAt: string;
}
