import { useState } from 'react';
import { logger } from '@/utils/logger';
import useSWR, { mutate as globalMutate } from 'swr';

import { useAuth } from '@/contexts/auth';
import {
  markDocumentAsComplete,
  unmarkDocumentAsComplete,
  pinDocument,
  unpinDocument,
  getDocumentsStatus,
} from '@/services/secondary/document-actions.service';

/**
 * Hook pour gérer les actions sur un document (complete/pin)
 */
export function useDocumentActions(documentId: string) {
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);

  const {
    data: status,
    error,
    mutate,
  } = useSWR(
    user?.id && documentId ? ['document-status', documentId, user.id] : null,
    () => getDocumentsStatus(user!.id, [documentId])
  );

  const isCompleted = status?.completed.some(
    (c) => c.document_id === documentId && c.is_completed
  );
  const isPinned = status?.pinned.some((p) => p.document_id === documentId && p.is_pinned);

  const toggleComplete = async () => {
    if (!user?.id || isToggling) return;

    setIsToggling(true);
    try {
      if (isCompleted) {
        await unmarkDocumentAsComplete(user.id, documentId);
      } else {
        await markDocumentAsComplete(user.id, documentId);
      }
      await mutate();
      // Invalider tous les caches de statuts de documents pour rafraîchir la liste
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'documents-status',
        undefined,
        { revalidate: true }
      );
      // Invalider le cache de progression du programme pour mettre à jour les statistiques
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'secondary-program-progress',
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      logger.error('Error toggling complete:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const togglePin = async () => {
    if (!user?.id || isToggling) return;

    setIsToggling(true);
    try {
      if (isPinned) {
        await unpinDocument(user.id, documentId);
      } else {
        await pinDocument(user.id, documentId);
      }
      await mutate();
      // Invalider tous les caches de statuts de documents pour rafraîchir la liste
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'documents-status',
        undefined,
        { revalidate: true }
      );
      // Invalider le cache de progression du programme (pas nécessaire pour pin mais gardé pour cohérence)
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'secondary-program-progress',
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      logger.error('Error toggling pin:', error);
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

export type DocumentFilter = 'all' | 'completed' | 'not-completed' | 'pinned' | 'not-pinned';

/**
 * Hook pour récupérer les statuts de plusieurs documents et les filtrer
 */
export function useDocumentsStatus(documentIds: string[], filter: DocumentFilter = 'all') {
  const { user } = useAuth();

  const { data: status, error, isLoading } = useSWR(
    user?.id && documentIds.length > 0 ? ['documents-status', documentIds, user.id] : null,
    () => getDocumentsStatus(user!.id, documentIds)
  );

  const completedIds = new Set(
    status?.completed.filter((c) => c.is_completed).map((c) => c.document_id) || []
  );
  const pinnedIds = new Set(
    status?.pinned.filter((p) => p.is_pinned).map((p) => p.document_id) || []
  );

  // Filtrer les documents selon le filtre sélectionné
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
