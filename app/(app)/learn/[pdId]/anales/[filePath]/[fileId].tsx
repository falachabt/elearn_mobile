// FileViewerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useSWR, { type Fetcher } from 'swr';
import * as ScreenCapture from 'expo-screen-capture';

import { theme } from '@/constants/theme';
import { logger } from '@/utils/logger';
import { ThemedText } from "@/components/ThemedText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { FileViewer } from "@/components/shared/learn/anales/FileViewer/FileViewer.native";


// Define TypeScript interfaces for our data
interface ArchiveData {
  id: number;
  name: string;
  file_url: string;
  has_correction: boolean;
}

interface CorrectionData {
  id: number;
  file_url: string;
  archive_id: number;
}


interface CompletionData {
  id: number;
}

const fetchArchive: Fetcher<ArchiveData, string> = async (id) => {
  const { data, error } = await supabase
    .from('concours_archives')
    .select('id, name, file_url, has_correction')
    .eq('id', Number(id))
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name ?? '',
    file_url: data.file_url,
    has_correction: data.has_correction ?? false,
  };
};

const fetchCorrection: Fetcher<CorrectionData, string> = async (archiveId) => {
  const { data, error } = await supabase
    .from('concours_corrections')
    .select('id, file_url, archive_id')
    .eq('archive_id', Number(archiveId))
    .single();

  if (error) throw error;
  return data;
};

const fetchCompletion: Fetcher<CompletionData | null, readonly [string, number]> = async ([userId, archiveId]) => {
  const { data, error } = await supabase
    .from('user_completed_archives')
    .select('id')
    .eq('user_id', userId)
    .eq('archive_id', archiveId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
};

export const FileViewerScreen = () => {
  const params = useLocalSearchParams();
  const fileIdParam = params.fileId;
  const fileId = typeof fileIdParam === 'string' ? Number(fileIdParam) : Number(fileIdParam?.[0]);

  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user } = useAuth();
  const [isViewingCorrection, setIsViewingCorrection] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [archiveId, setArchiveId] = useState<number | null>(null);

  // First check if we're viewing a correction directly
  useEffect(() => {
    const checkIfCorrection = async () => {
      if (!Number.isFinite(fileId)) return;

      try {
        const { data } = await supabase
            .from('concours_corrections')
            .select('id, file_url, archive_id')
            .eq('id', fileId)
            .single();

        if (data) {
          setIsViewingCorrection(true);
          setArchiveId(data.archive_id);
        } else {
          setArchiveId(fileId);
        }
      } catch {
        // Not a correction, so fileId is the archive ID
        setArchiveId(fileId);
      }
    };

    checkIfCorrection();
  }, [fileId]);

  // Prevent screenshots
  useEffect(() => {
    const preventScreenshots = async () => {
      try {
        // Prevent screenshots
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        logger.error('Error preventing screen capture:', error);
      }
    };

    preventScreenshots();

    // Re-enable screenshots when component unmounts
    return () => {
      const allowScreenshots = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (error) {
          logger.error('Error allowing screen capture:', error);
        }
      };

      allowScreenshots();
    };
  }, []);

  // Fetch archive data
  const { data: archiveData, isLoading: archiveLoading } = useSWR(
      archiveId ? String(archiveId) : null,
      fetchArchive
  );

  // Fetch correction data if available
  const { data: correctionData, isLoading: correctionLoading } = useSWR(
      archiveData?.has_correction ? String(archiveData.id) : null,
      fetchCorrection
  );

  // Fetch completion status
  const { data: completionData, isLoading: completionLoading, mutate } = useSWR(
      user?.id && archiveData?.id ? [user.id, archiveData.id] as const : null,
      fetchCompletion
  );

  const toggleView = () => {
    // Switch between viewing the original file and the correction
    setIsViewingCorrection(!isViewingCorrection);
  };

  // Toggle completed status
  const toggleCompletedStatus = async () => {
    if (!user?.id || !archiveData?.id) return;

    setCompletedLoading(true);
    try {
      const targetArchiveId = archiveData.id;
      const isCompleted = !!completionData;

      if (isCompleted) {
        // Remove from completed
        const { error } = await supabase
            .from('user_completed_archives')
            .delete()
            .eq('user_id', user.id)
            .eq('archive_id', targetArchiveId);

        if (error) throw error;

        // Update local state optimistically
        mutate(null, false);
      } else {
        // Check if a record already exists (to prevent duplicate key constraint error)
        const { data: existingRecord } = await supabase
            .from('user_completed_archives')
            .select('id')
            .eq('user_id', user.id)
            .eq('archive_id', targetArchiveId);

        if (existingRecord && existingRecord.length > 0) {
          // Record exists but might be in a different state
          // Update it instead of inserting
          const { error } = await supabase
              .from('user_completed_archives')
              .update({ completed_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('archive_id', targetArchiveId);

          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
              .from('user_completed_archives')
              .insert({
                user_id: user.id,
                archive_id: targetArchiveId,
                completed_at: new Date().toISOString(),
              });

          if (error) throw error;
        }

        // Update local state optimistically
        mutate({ id: -1 }, false);
      }

      // Properly refresh data after operation
      mutate();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Impossible de mettre à jour le statut de complétion. Veuillez réessayer.';
      logger.error('Error toggling completion status:', error);
      Alert.alert(
          'Erreur',
          message
      );
    } finally {
      setCompletedLoading(false);
    }
  };

  // Determine which file to display based on current view mode
  const currentFile = isViewingCorrection && correctionData
      ? { id: correctionData.id, file_url: correctionData.file_url }
      : archiveData
          ? { id: archiveData.id, file_url: archiveData.file_url }
          : null;

  // Check if data is still loading
  const isLoading = archiveLoading ||
      (archiveData?.has_correction && correctionLoading) ||
      completionLoading;

  // Determine if the archive is completed
  const isCompleted = !!completionData;

  return (
      <View style={[viewerStyles.container, isDark && viewerStyles.containerDark]}>
        <View style={viewerStyles.header}>
          <View style={viewerStyles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={viewerStyles.backButton}>
              <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
              />
            </TouchableOpacity>
            {/* Hidden title per your latest update */}
            {/* <ThemedText style={viewerStyles.title} numberOfLines={1}>
            {archiveData?.name || ""}
          </ThemedText> */}
          </View>

          <View style={viewerStyles.headerRight}>
            {/* Mark as completed button */}
            {archiveData && (
                <TouchableOpacity
                    onPress={toggleCompletedStatus}
                    disabled={completedLoading}
                    style={[
                      viewerStyles.completedButton,
                      isDark && viewerStyles.completedButtonDark,
                      isCompleted && viewerStyles.completedButtonActive
                    ]}
                >
                  {completedLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                      <>
                        <MaterialCommunityIcons
                            name={isCompleted ? "check-circle" : "circle-outline"}
                            size={18}
                            color="#FFFFFF"
                        />
                        <ThemedText style={viewerStyles.toggleButtonText}>
                          {isCompleted ? "Terminé" : "Marquer terminé"}
                        </ThemedText>
                      </>
                  )}
                </TouchableOpacity>
            )}

            {/* Toggle button between subject and correction */}
            {correctionData && archiveData && (
                <TouchableOpacity
                    onPress={toggleView}
                    style={[
                      viewerStyles.toggleButton,
                      isDark && viewerStyles.toggleButtonDark,
                      isViewingCorrection ? viewerStyles.subjectButton : viewerStyles.correctionButton
                    ]}
                >
                  <MaterialCommunityIcons
                      name={isViewingCorrection ? "file-document-outline" : "check-circle-outline"}
                      size={18}
                      color="#FFFFFF"
                  />
                  <ThemedText style={viewerStyles.toggleButtonText}>
                    {isViewingCorrection ? "Voir le sujet" : "Voir la correction"}
                  </ThemedText>
                </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ?
            <ActivityIndicator
                size="large"
                color={theme.color.primary[500]}
                style={viewerStyles.loader}
            />
         :
            currentFile ?

                <FileViewer
                    file={{
                      file_url: currentFile.file_url,
                    }}
                    style={viewerStyles.viewer}
                />
                : null

        }
      </View>
  );
};

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontFamily : theme.typography.fontFamily,
fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  viewer: {
    flex: 1,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    marginLeft: 8,
  },
  toggleButtonDark: {
    backgroundColor: theme.color.primary[600],
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontFamily : theme.typography.fontFamily,
fontSize: 14,
    marginLeft: 4,
  },
  correctionButton: {
    backgroundColor: theme.color.primary["600"],
  },
  subjectButton: {
    backgroundColor: theme.color.primary["600"],
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.gray[800],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
  },
  completedButtonDark: {
    backgroundColor: theme.color.gray[600],
  },
  completedButtonActive: {
    backgroundColor: theme.color.primary["900"],
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FileViewerScreen;
