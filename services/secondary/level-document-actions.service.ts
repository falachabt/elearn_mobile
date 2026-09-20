import { supabase } from "@/lib/supabase";
import type { SecondaryLevelDocument } from "@/services/secondary/level-documents.service";

// Clone of document-actions.service.ts targeting secondary_level_documents_complete/_pin
// (see level-documents.service.ts for the "documents par niveau" browsing layer).

/**
 * Marquer un document de niveau comme complété
 */
export async function markLevelDocumentAsComplete(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_level_documents_complete")
    .upsert(
      {
        user_id: userId,
        document_id: documentId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,document_id",
      }
    );

  if (error) throw error;
}

/**
 * Démarquer un document de niveau comme complété
 */
export async function unmarkLevelDocumentAsComplete(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_level_documents_complete")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) throw error;
}

/**
 * Épingler un document de niveau
 */
export async function pinLevelDocument(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_level_documents_pin")
    .upsert(
      {
        user_id: userId,
        document_id: documentId,
        is_pinned: true,
        pinned_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,document_id",
      }
    );

  if (error) throw error;
}

/**
 * Désépingler un document de niveau
 */
export async function unpinLevelDocument(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_level_documents_pin")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) throw error;
}

/**
 * Récupérer les statuts (complete/pin) de plusieurs documents de niveau pour un utilisateur
 */
/**
 * Récupérer tous les documents épinglés par l'utilisateur pour un niveau donné,
 * peu importe le (sous-)dossier -- utilisé par le dossier virtuel "Mes documents épinglés".
 */
export async function getPinnedLevelDocuments(
  userId: string,
  levelId: string
): Promise<SecondaryLevelDocument[]> {
  const { data: folders, error: foldersError } = await supabase
    .from("secondary_level_document_folders")
    .select("id")
    .eq("level_id", levelId);

  if (foldersError) throw foldersError;
  const folderIds = (folders || []).map((f) => f.id);
  if (folderIds.length === 0) return [];

  const { data: pins, error: pinsError } = await supabase
    .from("secondary_level_documents_pin")
    .select("document_id")
    .eq("user_id", userId)
    .eq("is_pinned", true);

  if (pinsError) throw pinsError;
  const pinnedDocIds = (pins || []).map((p) => p.document_id);
  if (pinnedDocIds.length === 0) return [];

  const { data: docs, error: docsError } = await supabase
    .from("secondary_level_documents")
    .select("*")
    .in("id", pinnedDocIds)
    .in("folder_id", folderIds)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (docsError) throw docsError;
  return docs || [];
}

export async function getLevelDocumentsStatus(userId: string, documentIds: string[]) {
  if (documentIds.length === 0) {
    return { completed: [], pinned: [] };
  }

  const [completedRes, pinnedRes] = await Promise.all([
    supabase
      .from("secondary_level_documents_complete")
      .select("document_id, is_completed")
      .eq("user_id", userId)
      .in("document_id", documentIds),
    supabase
      .from("secondary_level_documents_pin")
      .select("document_id, is_pinned")
      .eq("user_id", userId)
      .in("document_id", documentIds),
  ]);

  return {
    completed: completedRes.data || [],
    pinned: pinnedRes.data || [],
  };
}
