import { useCallback } from 'react';
import { logger } from '@/utils/logger';
import useSWR from 'swr';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

interface PinnedStatus {
  archive_id: number;
  is_pinned: boolean;
}

interface CompletedStatus {
  archive_id: number;
}

// Fetcher for pinned status
const fetchPinnedData = async (url: string): Promise<PinnedStatus[]> => {
  if (!url) throw new Error("No URL provided");

  const parts = url.split("/");
  const userId = parts[parts.length - 2];
  const competitionId = parts[parts.length - 1];

  if (!userId || !competitionId)
    throw new Error("Missing userId or competitionId");

  // First get all archives for this competition to filter pinned data
  const { data: archivesData, error: archivesError } = await supabase
    .from("concours_archives")
    .select("id")
    .eq("concour_id", competitionId);

  if (archivesError) throw archivesError;
  if (!archivesData || archivesData.length === 0) return [];

  const archiveIds = archivesData.map((archive) => archive.id);

  const { data, error } = await supabase
    .from("user_pinned_archive")
    .select("archive_id, is_pinned")
    .in("archive_id", archiveIds)
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map(item => ({
    archive_id: Number(item.archive_id),
    is_pinned: item.is_pinned || false
  }));
};

// Fetcher for completed status
const fetchCompletedData = async (url: string): Promise<CompletedStatus[]> => {
  if (!url) throw new Error("No URL provided");

  const parts = url.split("/");
  const userId = parts[parts.length - 2];
  const competitionId = parts[parts.length - 1];

  if (!userId || !competitionId)
    throw new Error("Missing userId or competitionId");

  // First get all archives for this competition to filter completed data
  const { data: archivesData, error: archivesError } = await supabase
    .from("concours_archives")
    .select("id")
    .eq("concour_id", competitionId);

  if (archivesError) throw archivesError;
  if (!archivesData || archivesData.length === 0) return [];

  const archiveIds = archivesData.map((archive) => archive.id);

  const { data, error } = await supabase
    .from("user_completed_archives")
    .select("archive_id")
    .in("archive_id", archiveIds)
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map(item => ({
    archive_id: Number(item.archive_id)
  }));
};

/**
 * Hook partagé pour gérer les données pinned et completed des archives
 * Utilisé à la fois dans la liste et dans la page de vue
 */
export function useArchiveData(competitionId: string | undefined) {
  const { user } = useAuth();

  // SWR for pinned data
  const { 
    data: pinnedData, 
    mutate: mutatePinned,
    error: pinnedError 
  } = useSWR<PinnedStatus[]>(
    competitionId && user?.id ? `/pinned/${user.id}/${competitionId}` : null,
    fetchPinnedData,
    {
      revalidateOnFocus: true, // Revalidate quand la page reprend le focus
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 secondes pour éviter les appels trop fréquents
    }
  );

  // SWR for completed data
  const { 
    data: completedData, 
    mutate: mutateCompleted,
    error: completedError 
  } = useSWR<CompletedStatus[]>(
    competitionId && user?.id ? `/completed/${user.id}/${competitionId}` : null,
    fetchCompletedData,
    {
      revalidateOnFocus: true, // Revalidate quand la page reprend le focus
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 secondes pour éviter les appels trop fréquents
    }
  );

  // Toggle pin status
  const togglePin = useCallback(async (archiveId: number, currentStatus: boolean) => {
    if (!user?.id || !competitionId) return false;

    try {
      // Optimistic update
      const newPinnedStatus = !currentStatus;
      await mutatePinned(
        (currentData: PinnedStatus[] = []) => {
          const updatedData = [...currentData];
          const existingIndex = updatedData.findIndex(
            (item) => item.archive_id === archiveId
          );

          if (existingIndex >= 0) {
            updatedData[existingIndex].is_pinned = newPinnedStatus;
          } else {
            updatedData.push({ archive_id: archiveId, is_pinned: true });
          }

          return updatedData;
        },
        false
      );

      // Database update
      const { data: existingPin, error: fetchError } = await supabase
        .from("user_pinned_archive")
        .select("archive_id, is_pinned")
        .eq("archive_id", archiveId)
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (existingPin) {
        const { error: updateError } = await supabase
          .from("user_pinned_archive")
          .update({ is_pinned: !existingPin.is_pinned })
          .eq("archive_id", archiveId)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("user_pinned_archive")
          .insert({
            archive_id: archiveId,
            is_pinned: true,
            user_id: user.id,
          });
        if (insertError) throw insertError;
      }

      // Force revalidation
      await mutatePinned();
      return true;
    } catch (error) {
      logger.error("Error toggling pin status:", error);
      // Revert on error
      await mutatePinned();
      return false;
    }
  }, [user?.id, competitionId, mutatePinned]);

  // Toggle completed status
  const toggleCompleted = useCallback(async (archiveId: number, currentStatus: boolean) => {
    if (!user?.id || !competitionId) return false;

    try {
      // Optimistic update
      await mutateCompleted(
        (currentData: CompletedStatus[] = []) => {
          if (currentStatus) {
            return currentData.filter((item) => item.archive_id !== archiveId);
          } else {
            return [...currentData, { archive_id: archiveId }];
          }
        },
        false
      );

      // Database update
      if (currentStatus) {
        const { error } = await supabase
          .from("user_completed_archives")
          .delete()
          .eq("user_id", user.id)
          .eq("archive_id", archiveId);
        if (error) throw error;
      } else {
        // Check if record already exists
        const { data: existingRecord } = await supabase
          .from("user_completed_archives")
          .select("id")
          .eq("user_id", user.id)
          .eq("archive_id", archiveId);

        if (existingRecord && existingRecord.length > 0) {
          const { error } = await supabase
            .from("user_completed_archives")
            .update({ completed_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("archive_id", archiveId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_completed_archives")
            .insert({
              user_id: user.id,
              archive_id: archiveId,
              completed_at: new Date().toISOString(),
            });
          if (error) throw error;
        }
      }

      // Force revalidation
      await mutateCompleted();
      return true;
    } catch (error) {
      logger.error("Error toggling completed status:", error);
      // Revert on error
      await mutateCompleted();
      return false;
    }
  }, [user?.id, competitionId, mutateCompleted]);

  return {
    pinnedData,
    completedData,
    pinnedError,
    completedError,
    togglePin,
    toggleCompleted,
    mutatePinned,
    mutateCompleted,
  };
}
