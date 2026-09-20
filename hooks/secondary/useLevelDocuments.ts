import useSWR from "swr";

import {
  getSecondaryLevels,
  getSecondaryLevel,
  getLevelDocuments,
  getLevelDocumentFolder,
  getLevelDocument,
  getLevelDocumentBreadcrumb,
} from "@/services/secondary/level-documents.service";

/**
 * Hook to fetch the list of secondary levels ("documents par niveau")
 */
export function useLevels() {
  const { data, error, isLoading } = useSWR("secondary-levels", getSecondaryLevels);

  return {
    levels: data || [],
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch a single level's details
 */
export function useLevel(levelId: string | null) {
  const { data, error, isLoading } = useSWR(
    levelId ? `secondary-level-${levelId}` : null,
    () => (levelId ? getSecondaryLevel(levelId) : null)
  );

  return {
    level: data,
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch folders and documents at a specific level (root if folderId is null)
 */
export function useLevelDocuments(levelId: string, folderId: string | null = null) {
  const { data, error, isLoading, mutate } = useSWR(
    levelId ? `level-documents-${levelId}-${folderId || "root"}` : null,
    () => getLevelDocuments(levelId, folderId)
  );

  return {
    folders: data?.folders || [],
    documents: data?.documents || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch folder details
 */
export function useLevelFolder(folderId: string | null) {
  const { data, error, isLoading } = useSWR(
    folderId ? `level-folder-${folderId}` : null,
    () => (folderId ? getLevelDocumentFolder(folderId) : null)
  );

  return {
    folder: data,
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch document details
 */
export function useLevelDocument(documentId: string | null) {
  const { data, error, isLoading } = useSWR(
    documentId ? `level-document-${documentId}` : null,
    () => (documentId ? getLevelDocument(documentId) : null)
  );

  return {
    document: data,
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch breadcrumb trail
 */
export function useLevelDocumentBreadcrumb(folderId: string | null) {
  const { data, error, isLoading } = useSWR(
    folderId ? `level-breadcrumb-${folderId}` : null,
    () => (folderId ? getLevelDocumentBreadcrumb(folderId) : [])
  );

  return {
    breadcrumb: data || [],
    isLoading,
    isError: error,
  };
}
