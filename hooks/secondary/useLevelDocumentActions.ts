import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/auth';
import {
  markLevelDocumentAsComplete,
  unmarkLevelDocumentAsComplete,
  pinLevelDocument,
  unpinLevelDocument,
  getLevelDocumentsStatus,
  getPinnedLevelDocuments,
} from '@/services/secondary/level-document-actions.service';

/**
 * Hook pour gérer les actions sur un document de niveau (complete/pin)
 */
export function useLevelDocumentActions(documentId: string) {
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  // The app's SWRConfig uses a custom `provider` (asyncStorageProvider), so
  // the bare `mutate` imported from 'swr' targets SWR's *default* cache, not
  // the one every useSWR() in this app actually reads from -- it silently
  // no-ops. useSWRConfig() returns the mutate bound to the real active cache.
  const { mutate: globalMutate } = useSWRConfig();

  const {
    data: status,
    error,
    mutate,
  } = useSWR(
    user?.id && documentId ? ['level-document-status', documentId, user.id] : null,
    () => getLevelDocumentsStatus(user!.id, [documentId])
  );

  const isCompleted = status?.completed.some(
    (c) => c.document_id === documentId && c.is_completed
  );
  const isPinned = status?.pinned.some((p) => p.document_id === documentId && p.is_pinned);

  const toggleComplete = async () => {
    if (!user?.id || isToggling) return;

    const newState = !isCompleted;
    setIsToggling(true);
    try {
      await mutate(
        (current) => ({
          completed: newState ? [{ document_id: documentId, is_completed: true }] : [],
          pinned: current?.pinned ?? [],
        }),
        { revalidate: false }
      );

      if (newState) {
        await markLevelDocumentAsComplete(user.id, documentId);
      } else {
        await unmarkLevelDocumentAsComplete(user.id, documentId);
      }

      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'level-documents-status',
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      logger.error('Error toggling level document complete:', error);
      mutate();
    } finally {
      setIsToggling(false);
    }
  };

  const togglePin = async () => {
    if (!user?.id || isToggling) return;

    const newState = !isPinned;
    setIsToggling(true);
    try {
      await mutate(
        (current) => ({
          completed: current?.completed ?? [],
          pinned: newState ? [{ document_id: documentId, is_pinned: true }] : [],
        }),
        { revalidate: false }
      );

      if (newState) {
        await pinLevelDocument(user.id, documentId);
      } else {
        await unpinLevelDocument(user.id, documentId);
      }

      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'level-documents-status',
        undefined,
        { revalidate: true }
      );
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'level-pinned-documents',
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      logger.error('Error toggling level document pin:', error);
      mutate();
    } finally {
      setIsToggling(false);
    }
  };

  return {
    isCompleted: !!isCompleted,
    isPinned: !!isPinned,
    toggleComplete,
    togglePin,
    isLoading: !error && !status,
    isToggling,
  };
}

/**
 * Hook pour récupérer tous les documents épinglés d'un niveau (tous dossiers confondus)
 */
export function usePinnedLevelDocuments(levelId: string) {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user?.id && levelId ? ['level-pinned-documents', levelId, user.id] : null,
    () => getPinnedLevelDocuments(user!.id, levelId)
  );

  return {
    pinnedDocuments: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export type LevelDocumentFilter = 'all' | 'completed' | 'not-completed' | 'pinned' | 'not-pinned';

/**
 * Hook pour récupérer les statuts de plusieurs documents de niveau et les filtrer
 */
export function useLevelDocumentsStatus(
  documentIds: string[],
  filter: LevelDocumentFilter = 'all'
) {
  const { user } = useAuth();

  const { data: status, error, isLoading } = useSWR(
    user?.id && documentIds.length > 0 ? ['level-documents-status', documentIds, user.id] : null,
    () => getLevelDocumentsStatus(user!.id, documentIds)
  );

  const completedIds = new Set(
    status?.completed.filter((c) => c.is_completed).map((c) => c.document_id) || []
  );
  const pinnedIds = new Set(
    status?.pinned.filter((p) => p.is_pinned).map((p) => p.document_id) || []
  );

  const filteredDocumentIds = documentIds.filter((id) => {
    switch (filter) {
      case 'completed':
        return completedIds.has(id);
      case 'not-completed':
        return !completedIds.has(id);
      case 'pinned':
        return pinnedIds.has(id);
      case 'not-pinned':
        return !pinnedIds.has(id);
      case 'all':
      default:
        return true;
    }
  });

  return {
    completedIds,
    pinnedIds,
    filteredDocumentIds,
    isLoading,
    error,
  };
}
