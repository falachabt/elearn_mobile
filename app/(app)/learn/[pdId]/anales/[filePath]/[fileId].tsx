// FileViewerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { Archive } from '..';
import { ThemedText } from "@/components/ThemedText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import useSWR from 'swr';
import {FileViewer} from "@/components/shared/learn/anales/FileViewer/FileViewer.web";
import {FileViewer as FileViewerNative } from "@/components/shared/learn/anales/FileViewer/FileViewer.web";

// Define TypeScript interfaces for our data
interface ArchiveData {
  id: string;
  name: string;
  file_url: string;
  has_correction: boolean;
}

interface CorrectionData {
  id: string;
  file_url: string;
  archive_id: string;
}


interface CompletionData {
  id: string;
}

// Custom fetcher for SWR with Supabase
const fetcher = async (url: string) => {
  // Parse the URL to extract table and query parameters
  const [_, table, method, ...params] = url.split('/');

  if (!table) throw new Error('No table specified');

  if (method === 'get') {
    const id = params[0];
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
  }

  if (method === 'getCorrection') {
    const archiveId = params[0];
    const { data, error } = await supabase
        .from('concours_corrections')
        .select('id, file_url, archive_id')
        .eq('archive_id', archiveId)
        .single();

    if (error) throw error;
    return data;
  }

  if (method === 'getCompletion') {
    const userId = params[0];
    const archiveId = params[1];

    try {
      const { data, error } = await supabase
          .from('user_completed_archives')
          .select('id')
          .eq('user_id', userId)
          .eq('archive_id', archiveId)
          .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found is expected and OK
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      // Handle error gracefully and return null to indicate not completed
      console.error('Error fetching completion status:', error);
      return null;
    }
  }

  throw new Error(`Unsupported method: ${method}`);
};

export const FileViewerScreen = () => {
  const params = useLocalSearchParams();
  const fileId = params.fileId as string;
  const filePath = params.filePath as string;
  const pdId = params.pdId as string;

  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user } = useAuth();
  const [isViewingCorrection, setIsViewingCorrection] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  // First check if we're viewing a correction directly
  useEffect(() => {
    const checkIfCorrection = async () => {
      if (!fileId) return;

      try {
        const { data, error } = await supabase
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
      } catch (error) {
        // Not a correction, so fileId is the archive ID
        setArchiveId(fileId);
      }
    };

    checkIfCorrection();
  }, [fileId]);

  // Fetch archive data
  const { data: archiveData, error: archiveError, isLoading: archiveLoading } = useSWR<ArchiveData>(
      archiveId ? `/concours_archives/get/${archiveId}` : null,
      fetcher
  );

  // Fetch correction data if available
  const { data: correctionData, error: correctionError, isLoading: correctionLoading } = useSWR<CorrectionData>(
      archiveData?.has_correction ? `/concours_archives/getCorrection/${archiveData.id}` : null,
      fetcher
  );

  // Fetch completion status
  const { data: completionData, error: completionError, isLoading: completionLoading, mutate } = useSWR<CompletionData | null>(
      user?.id && archiveData?.id ? `/user_completed_archives/getCompletion/${user.id}/${archiveData.id}` : null,
      fetcher
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
        mutate({ id: 'temp-id' }, false);
      }

      // Properly refresh data after operation
      mutate();
    } catch (error: any) {
      console.error('Error toggling completion status:', error);
      Alert.alert(
          'Erreur',
          error.message || 'Impossible de mettre à jour le statut de complétion. Veuillez réessayer.'
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

                // Use the appropriate FileViewer component based on the platform
                Platform.OS === 'web' ?
                    <FileViewer
                        file={{
                            id: currentFile.id + new Date().toISOString(),
                            file_url: currentFile.file_url,
                            file_type: typeof currentFile.file_url === 'string' &&
                            currentFile.file_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other'
                        } as Archive}
                        style={viewerStyles.viewer}
                    />
                :
                <FileViewerNative
                    file={{
                      id: currentFile.id+ new Date().toISOString(),
                      file_url: currentFile.file_url,
                      file_type: typeof currentFile.file_url === 'string' &&
                      currentFile.file_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other'
                    } as Archive}
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