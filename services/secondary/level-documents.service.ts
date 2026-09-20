import { supabase } from "@/lib/supabase";

// ===== "Documents par niveau" (secondary_levels) =====
// Mirrors the program-scoped document browsing in program.service.ts
// (getSecondaryProgramDocuments/getSecondaryDocumentFolder/getSecondaryDocument/
// getSecondaryDocumentBreadcrumb), scoped by level_id instead of program_id.
// Unlike secondary_documents, secondary_level_documents has no level_id of its
// own (only folder_id) -- a level's root only ever contains folders, documents
// only exist inside a folder.

export interface SecondaryLevel {
  id: string;
  level: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SecondaryLevelDocumentFolder {
  id: string;
  level_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  order_index: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SecondaryLevelDocument {
  id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  file_type: string | null;
  download_url: string;
  file_size: number | null;
  order_index: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get all secondary levels (ordered by level number)
 */
export async function getSecondaryLevels(): Promise<SecondaryLevel[]> {
  const { data, error } = await supabase
    .from("secondary_levels")
    .select("*")
    .order("level", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single level by id
 */
export async function getSecondaryLevel(levelId: string): Promise<SecondaryLevel> {
  const { data, error } = await supabase
    .from("secondary_levels")
    .select("*")
    .eq("id", levelId)
    .single();

  if (error) throw error;
  return data as SecondaryLevel;
}

/**
 * Get folders and documents at a specific level (root if folderId is null)
 */
export async function getLevelDocuments(levelId: string, folderId: string | null = null) {
  let foldersQuery = supabase
    .from("secondary_level_document_folders")
    .select("*")
    .eq("level_id", levelId);

  if (folderId) {
    foldersQuery = foldersQuery.eq("parent_folder_id", folderId);
  } else {
    foldersQuery = foldersQuery.is("parent_folder_id", null);
  }

  const { data: folders, error: foldersError } = await foldersQuery
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (foldersError) throw foldersError;

  // Root level never has documents directly -- secondary_level_documents has
  // no level_id of its own, only folder_id.
  let documents: SecondaryLevelDocument[] = [];
  if (folderId) {
    const { data: folderDocuments, error: documentsError } = await supabase
      .from("secondary_level_documents")
      .select("*")
      .eq("folder_id", folderId)
      .order("order_index", { ascending: true })
      .order("name", { ascending: true });

    if (documentsError) throw documentsError;
    documents = folderDocuments || [];
  }

  return {
    folders: folders || [],
    documents,
  };
}

/**
 * Get folder details by ID
 */
export async function getLevelDocumentFolder(
  folderId: string
): Promise<SecondaryLevelDocumentFolder> {
  const { data, error } = await supabase
    .from("secondary_level_document_folders")
    .select("*")
    .eq("id", folderId)
    .single();

  if (error) throw error;
  return data as SecondaryLevelDocumentFolder;
}

/**
 * Get document details by ID
 */
export async function getLevelDocument(documentId: string): Promise<SecondaryLevelDocument> {
  const { data, error } = await supabase
    .from("secondary_level_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) throw error;
  return data as SecondaryLevelDocument;
}

/**
 * Get breadcrumb trail for current folder
 */
export async function getLevelDocumentBreadcrumb(
  folderId: string | null
): Promise<SecondaryLevelDocumentFolder[]> {
  if (!folderId) return [];

  const breadcrumb: SecondaryLevelDocumentFolder[] = [];
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    const response = await supabase
      .from("secondary_level_document_folders")
      .select("*")
      .eq("id", currentFolderId)
      .single();

    const data = response.data as SecondaryLevelDocumentFolder | null;
    const error = response.error;
    if (error) throw error;
    if (!data) break;
    breadcrumb.unshift(data);
    currentFolderId = data.parent_folder_id;
  }

  return breadcrumb;
}
