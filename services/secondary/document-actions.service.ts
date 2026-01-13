import { supabase } from "@/lib/supabase";

/**
 * Marquer un document comme complété
 */
export async function markDocumentAsComplete(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_documents_complete")
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
 * Démarquer un document comme complété
 */
export async function unmarkDocumentAsComplete(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_documents_complete")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) throw error;
}

/**
 * Épingler un document
 */
export async function pinDocument(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_documents_pin")
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
 * Désépingler un document
 */
export async function unpinDocument(
  userId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("secondary_documents_pin")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) throw error;
}

/**
 * Récupérer les statuts de tous les documents d'un programme pour un utilisateur
 */
export async function getDocumentsStatus(
  userId: string,
  documentIds: string[]
) {
  if (documentIds.length === 0) {
    return { completed: [], pinned: [] };
  }

  const [completedRes, pinnedRes] = await Promise.all([
    supabase
      .from("secondary_documents_complete")
      .select("document_id, is_completed")
      .eq("user_id", userId)
      .in("document_id", documentIds),
    supabase
      .from("secondary_documents_pin")
      .select("document_id, is_pinned")
      .eq("user_id", userId)
      .in("document_id", documentIds),
  ]);

  return {
    completed: completedRes.data || [],
    pinned: pinnedRes.data || [],
  };
}
