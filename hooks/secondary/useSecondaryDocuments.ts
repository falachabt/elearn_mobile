import useSWR from "swr";

import {
  getSecondaryProgramDocuments,
  getSecondaryDocumentFolder,
  getSecondaryDocument,
  getSecondaryDocumentBreadcrumb,
} from "@/services/secondary/program.service";

/**
 * Hook to fetch folders and documents at a specific level
 */
export function useSecondaryDocuments(programId: string, folderId: string | null = null) {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? `secondary-documents-${programId}-${folderId || "root"}` : null,
    () => getSecondaryProgramDocuments(programId, folderId)
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
export function useSecondaryFolder(folderId: string | null) {
  const { data, error, isLoading } = useSWR(
    folderId ? `secondary-folder-${folderId}` : null,
    () => (folderId ? getSecondaryDocumentFolder(folderId) : null)
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
export function useSecondaryDocument(documentId: string | null) {
  const { data, error, isLoading } = useSWR(
    documentId ? `secondary-document-${documentId}` : null,
    () => (documentId ? getSecondaryDocument(documentId) : null)
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
export function useSecondaryDocumentBreadcrumb(folderId: string | null) {
  const { data, error, isLoading } = useSWR(
    folderId ? `secondary-breadcrumb-${folderId}` : null,
    () => (folderId ? getSecondaryDocumentBreadcrumb(folderId) : [])
  );

  return {
    breadcrumb: data || [],
    isLoading,
    isError: error,
  };
}
