import React, { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useSecondaryDocument } from "@/hooks/secondary/useSecondaryDocuments";
import {FileViewer} from "@/components/shared/learn/anales/FileViewer/FileViewer.native";
import {FileViewer as FileViewerNative} from "@/components/shared/learn/anales/FileViewer/FileViewer.native";
import { useSecondaryProgram } from "@/hooks/secondary/useSecondaryPrograms";
import { useDocumentActions } from "@/hooks/secondary/useDocumentActions";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

const DocumentViewerScreen = () => {
  const { programId, documentId } = useLocalSearchParams<{ programId: string; documentId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { trigger } = useHaptics();

  const { document, isLoading, isError } = useSecondaryDocument(documentId);
  const correctionId = (document?.correction_document_id as string | null) ?? null;
  const { document: correction, isLoading: isCorrectionLoading } = useSecondaryDocument(correctionId);

  const hasCorrection = !!correctionId;
  const [isViewingCorrection, setIsViewingCorrection] = useState(false);

  // Actions sur le document (complete/pin)
  const {
    isCompleted,
    isPinned,
    toggleComplete,
    togglePin,
    isToggling,
  } = useDocumentActions(documentId);

  // Programme pour afficher le header cohérent avec la liste
  const { program } = useSecondaryProgram(programId);
  const programTitle = program?.class?.name && program?.serie?.name
    ? `${program.class.name} - ${program.serie.name}`
    : "Programme";

  // Prevent screenshots
  useEffect(() => {
    const preventScreenshots = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        logger.error("Error preventing screen capture:", error);
      }
    };

    preventScreenshots();

    return () => {
      const allowScreenshots = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (error) {
          logger.error("Error allowing screen capture:", error);
        }
      };

      allowScreenshots();
    };
  }, []);

  const anyLoading = isLoading || (correctionId && isCorrectionLoading);

  if (anyLoading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ActivityIndicator size="large" color={theme.color.primary[600]} />
        <ThemedText style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement du document...
        </ThemedText>
      </View>
    );
  }

  if (isError || !document) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          Erreur lors du chargement du document
        </ThemedText>
      </View>
    );
  }

  const activeDocument = isViewingCorrection && hasCorrection && correction ? correction : document;

  // Vérifier que le document actif a un download_url
  if (!activeDocument.download_url) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          URL du document non disponible
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header programme + document */}
      <View style={[styles.titleHeader, isDark && styles.titleHeaderDark]}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>

          <ThemedText style={[styles.titleText, isDark && styles.titleTextDark]}>
            {programTitle}
          </ThemedText>
        </View>

        <View style={styles.docHeaderRow}>
          <ThemedText
            style={[styles.subtitleText, isDark && styles.subtitleTextDark]}
            numberOfLines={1}
          >
            {activeDocument.name}
          </ThemedText>

          {(isViewingCorrection || activeDocument.is_correction) && (
            <View style={[styles.correctionBadge, isDark && styles.correctionBadgeDark]}>
              <ThemedText style={styles.correctionBadgeText}>Correction</ThemedText>
            </View>
          )}
        </View>

        {hasCorrection && (
          <TouchableOpacity
            onPress={() => setIsViewingCorrection((prev) => !prev)}
            style={[
              styles.correctionToggleButton,
              isViewingCorrection && styles.correctionToggleButtonActive,
            ]}
            disabled={isCorrectionLoading}
          >
            <ThemedText style={[
              styles.correctionToggleButtonText,
              isViewingCorrection && styles.correctionToggleButtonTextActive,
            ]}>
              {isViewingCorrection ? "Voir le sujet" : "Voir la correction"}
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Boutons d'actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => {
              trigger(HapticType.MEDIUM);
              togglePin();
            }}
            style={[
              styles.actionButton,
              isPinned && styles.actionButtonActive,
              isDark && styles.actionButtonDark,
            ]}
            disabled={isToggling}
          >
            <MaterialCommunityIcons
              name={isPinned ? "pin" : "pin-outline"}
              size={20}
              color={isPinned ? theme.color.primary[600] : (isDark ? "#9CA3AF" : "#6B7280")}
            />
            <ThemedText
              style={[
                styles.actionButtonText,
                isPinned && styles.actionButtonTextActive,
                isDark && styles.actionButtonTextDark,
              ]}
            >
              {isPinned ? "Épinglé" : "Épingler"}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              trigger(HapticType.MEDIUM);
              toggleComplete();
            }}
            style={[
              styles.actionButton,
              isCompleted && styles.actionButtonActiveComplete,
              isDark && styles.actionButtonDark,
            ]}
            disabled={isToggling}
          >
            <MaterialCommunityIcons
              name={isCompleted ? "check-circle" : "circle-outline"}
              size={20}
              color={isCompleted ? "#10B981" : (isDark ? "#9CA3AF" : "#6B7280")}
            />
            <ThemedText
              style={[
                styles.actionButtonText,
                isCompleted && styles.actionButtonTextActiveComplete,
                isDark && styles.actionButtonTextDark,
              ]}
            >
              {isCompleted ? "Complété" : "Marquer comme complété"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {Platform.OS === "web" ? (
        <FileViewer 
          file={activeDocument}
          fileName={activeDocument.name}
        />
      ) : (
        <FileViewerNative 
          file={activeDocument}
          fileName={activeDocument.name}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  titleHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  titleHeaderDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: "#374151",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  titleTextDark: {
    color: "#F9FAFB",
  },
  docHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
    fontFamily: theme.typography.fontFamily,
  },
  subtitleTextDark: {
    color: "#9CA3AF",
  },
  correctionBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.color.primary[100],
  },
  correctionBadgeDark: {
    backgroundColor: theme.color.primary[700],
  },
  correctionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.color.primary[700],
    fontFamily: theme.typography.fontFamily,
  },
  correctionToggleButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.primary[500],
  },
  correctionToggleButtonActive: {
    backgroundColor: theme.color.primary[500],
  },
  correctionToggleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.color.primary[600],
    fontFamily: theme.typography.fontFamily,
  },
  correctionToggleButtonTextActive: {
    color: "#FFFFFF",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    gap: 6,
    flex: 1,
  },
  actionButtonDark: {
    backgroundColor: "#374151",
  },
  actionButtonActive: {
    backgroundColor: theme.color.primary[50],
    borderWidth: 1,
    borderColor: theme.color.primary[600],
  },
  actionButtonActiveComplete: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
  },
  actionButtonTextDark: {
    color: "#9CA3AF",
  },
  actionButtonTextActive: {
    color: theme.color.primary[700],
    fontWeight: "600",
  },
  actionButtonTextActiveComplete: {
    color: "#059669",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
  },
  loadingTextDark: {
    color: "#9CA3AF",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: {
    color: "#EF4444",
  },
});

export default DocumentViewerScreen;
