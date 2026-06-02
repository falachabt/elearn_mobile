import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth";
import { logger } from "@/utils/logger";
import {
  getAuthor,
  getGroupMessages,
  getMessageAttachments,
  sendMessage as sendMessageService,
  subscribeToGroupMessages,
  uploadChatAttachment,
} from "@/services/discussion.service";
import type {
  DiscussionAttachment,
  DiscussionMessage,
  PendingAttachment,
  TaggedContentType,
} from "@/types/discussion.type";

export interface SendArgs {
  textContent: string;
  attachments?: PendingAttachment[];
  taggedContentType?: TaggedContentType | null;
  taggedContentId?: string | null;
  taggedContentLabel?: string | null;
}

interface UseDiscussionChatResult {
  messages: DiscussionMessage[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  send: (args: SendArgs) => Promise<void>;
  retry: (localId: string) => void;
  refresh: () => void;
}

const tempId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Manages a single group's chat: load, pagination, realtime inserts, and
 * optimistic sends (a message appears immediately as "sending", then flips to
 * "sent" once persisted, or "failed" with retry). Realtime is subscribed only
 * while mounted so the connection is released when the chat closes.
 */
export function useDiscussionChat(groupId: string | undefined): UseDiscussionChatResult {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Server ids we've already rendered — dedupes realtime echoes of our sends.
  const knownIds = useRef<Set<string>>(new Set());
  // Keep the original SendArgs of optimistic messages for retry.
  const pendingArgs = useRef<Map<string, SendArgs>>(new Map());

  const upsertById = useCallback(
    (id: string, patch: Partial<DiscussionMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    []
  );

  const appendServer = useCallback((incoming: DiscussionMessage[]) => {
    setMessages((prev) => {
      const fresh = incoming.filter((m) => !knownIds.current.has(m.id));
      fresh.forEach((m) => knownIds.current.add(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh];
    });
  }, []);

  const initialLoad = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { messages: page, hasMore: more } = await getGroupMessages({ groupId });
      knownIds.current = new Set(page.map((m) => m.id));
      setMessages(page);
      setHasMore(more);
    } catch (e) {
      logger.error("[useDiscussionChat] initial load failed:", e);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  // Realtime: messages from other members (and our own from other devices).
  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = subscribeToGroupMessages(groupId, async (raw) => {
      if (knownIds.current.has(raw.id)) return;
      let author = null;
      let attachments: DiscussionAttachment[] = [];
      try {
        [author, attachments] = await Promise.all([
          raw.user_id ? getAuthor(raw.user_id) : Promise.resolve(null),
          getMessageAttachments(raw.id),
        ]);
      } catch {
        /* best-effort enrichment */
      }
      appendServer([{ ...raw, author, attachments, _status: "sent" }]);
    });
    return unsubscribe;
  }, [groupId, appendServer]);

  const loadMore = useCallback(async () => {
    if (!groupId || !hasMore || isLoadingMore) return;
    const oldestServer = messages.find((m) => !m._status || m._status === "sent");
    if (!oldestServer) return;
    setIsLoadingMore(true);
    try {
      const { messages: page, hasMore: more } = await getGroupMessages({
        groupId,
        before: oldestServer.created_at,
      });
      const fresh = page.filter((m) => !knownIds.current.has(m.id));
      fresh.forEach((m) => knownIds.current.add(m.id));
      if (fresh.length) setMessages((prev) => [...fresh, ...prev]);
      setHasMore(more);
    } catch (e) {
      logger.error("[useDiscussionChat] loadMore failed:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [groupId, hasMore, isLoadingMore, messages]);

  // Core delivery: upload attachments, persist, then swap optimistic -> server.
  const deliver = useCallback(
    async (localId: string, args: SendArgs) => {
      if (!groupId) return;
      try {
        const uploaded: DiscussionAttachment[] = [];
        for (const file of args.attachments ?? []) {
          const meta = await uploadChatAttachment(groupId, file);
          uploaded.push({ id: "", message_id: "", ...meta });
        }

        const saved = await sendMessageService({
          groupId,
          textContent: args.textContent,
          taggedContentType: args.taggedContentType ?? null,
          taggedContentId: args.taggedContentId ?? null,
          taggedContentLabel: args.taggedContentLabel ?? null,
          attachments: uploaded.length ? uploaded : undefined,
        });

        knownIds.current.add(saved.id);
        pendingArgs.current.delete(localId);
        // Replace the optimistic row in place (keeps list position).
        upsertById(localId, {
          ...saved,
          author: user
            ? {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                image: user.image as { url?: string } | null,
              }
            : null,
          _status: "sent",
          _pendingAttachments: undefined,
        });
      } catch (e) {
        logger.error("[useDiscussionChat] deliver failed:", e);
        upsertById(localId, { _status: "failed" });
      }
    },
    [groupId, upsertById, user]
  );

  const send = useCallback(
    async (args: SendArgs) => {
      if (!groupId) return;
      const localId = tempId();
      pendingArgs.current.set(localId, args);

      const optimistic: DiscussionMessage = {
        id: localId,
        group_id: groupId,
        user_id: user?.id ?? "",
        text_content: args.textContent?.trim() || null,
        image_url: null,
        tagged_content_type: args.taggedContentType ?? null,
        tagged_content_id: args.taggedContentId ?? null,
        tagged_content_label: args.taggedContentLabel ?? null,
        parent_message_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: user
          ? {
              id: user.id,
              firstname: user.firstname,
              lastname: user.lastname,
              image: user.image as { url?: string } | null,
            }
          : null,
        attachments: [],
        _pendingAttachments: args.attachments,
        _status: "sending",
      };

      setMessages((prev) => [...prev, optimistic]);
      await deliver(localId, args);
    },
    [groupId, user, deliver]
  );

  const retry = useCallback(
    (localId: string) => {
      const args = pendingArgs.current.get(localId);
      if (!args) return;
      upsertById(localId, { _status: "sending" });
      void deliver(localId, args);
    },
    [deliver, upsertById]
  );

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    send,
    retry,
    refresh: initialLoad,
  };
}
