import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { logger } from "@/utils/logger";
import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useLevel, useLevelDocument, useLevelDocuments } from "@/hooks/secondary/useLevelDocuments";
import {
  FileViewer,
  type FileViewerFile,
} from "@/components/shared/learn/anales/FileViewer/FileViewer.native";
import { useLevelDocumentActions } from "@/hooks/secondary/useLevelDocumentActions";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useLeaveDocumentIntercept } from "@/hooks/useLeaveDocumentIntercept";
import { LeaveDocumentSheet } from "@/components/shared/documents/LeaveDocumentSheet";
import { useFeatureFlag } from "posthog-react-native";
import { useLevelDocumentsPayment } from "@/hooks/useLevelDocumentsPayment";
import { LevelDocumentsPaymentBottomSheet } from "@/components/shared/documents/LevelDocumentsPaymentBottomSheet";

const LevelDocumentViewerScreen = () => {
  const { levelId, documentId } = useLocalSearchParams<{ levelId: string; documentId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { trigger } = useHaptics();
  const documentsParNiveauEnabled = useFeatureFlag("documents_par_niveau_enabled");
  const { hasAccess, accessLoading, checkAccess } = useLevelDocumentsPayment(levelId);
  const [showPaymentSheet, setShowPaymentSheet] = React.useState(false);

  useEffect(() => {
    if (documentsParNiveauEnabled === false) {
      router.replace("/(app)/manuel" as any);
    }
  }, [documentsParNiveauEnabled]);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { document, isLoading, isError } = useLevelDocument(documentId);
  const { level } = useLevel(levelId);
  const { documents: siblingDocuments, isLoading: siblingsLoading } = useLevelDocuments(
    levelId,
    document?.folder_id ?? null
  );
  const isFirstDocumentInFolder = !!document && siblingDocuments[0]?.id === document.id;

  const { isCompleted, isPinned, toggleComplete, togglePin, isToggling } =
    useLevelDocumentActions(documentId);

  const { showSheet, handleMarkComplete, handlePin, handleDismiss } = useLeaveDocumentIntercept({
    enabled: !isCompleted,
    onMarkComplete: toggleComplete,
    onPin: togglePin,
  });

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

  if (isLoading || accessLoading || hasAccess === null || (document && siblingsLoading)) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ActivityIndicator size="large" color={theme.color.primary[600]} />
        <ThemedText style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Chargement du document...
        </ThemedText>
      </View>
    );
  }

  if (hasAccess === false && !isFirstDocumentInFolder) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={64}
          color={isDark ? theme.color.primary[400] : theme.color.primary[500]}
        />
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark, { color: isDark ? "#FFFFFF" : "#111827" }]}>
          Accès restreint
        </ThemedText>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: theme.color.primary[500],
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            marginTop: 16,
          }}
          onPress={() => setShowPaymentSheet(true)}
        >
          <MaterialCommunityIcons name="lock-open-variant-outline" size={20} color="#FFFFFF" />
          <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Débloquer maintenant</ThemedText>
        </TouchableOpacity>

        <LevelDocumentsPaymentBottomSheet
          visible={showPaymentSheet}
          levelId={levelId}
          levelName={level?.name}
          onClose={() => setShowPaymentSheet(false)}
          onPaymentSuccess={() => {
            setShowPaymentSheet(false);
            checkAccess(true);
          }}
        />
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

  if (!document.download_url) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          URL du document non disponible
        </ThemedText>
      </View>
    );
  }

  const viewerFile: FileViewerFile = { download_url: document.download_url };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.titleHeader, isDark && styles.titleHeaderDark]}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>

          <ThemedText style={[styles.titleText, isDark && styles.titleTextDark]}>
            {level?.name || "Documents"}
          </ThemedText>
        </View>

        <ThemedText
          style={[styles.subtitleText, isDark && styles.subtitleTextDark]}
          numberOfLines={1}
        >
          {document.name}
        </ThemedText>

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
              color={isPinned ? theme.color.primary[600] : isDark ? "#9CA3AF" : "#6B7280"}
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
              color={isCompleted ? "#10B981" : isDark ? "#9CA3AF" : "#6B7280"}
            />
            <ThemedText
              style={[
                styles.actionButtonText,
                isCompleted && styles.actionButtonTextActiveComplete,
                isDark && styles.actionButtonTextDark,
              ]}
            >
              {isCompleted ? "Complété" : "Compléter"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <FileViewer file={viewerFile} />

      <LeaveDocumentSheet
        visible={showSheet}
        isDark={isDark}
        onMarkComplete={handleMarkComplete}
        onPin={handlePin}
        onDismiss={handleDismiss}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  centered: { justifyContent: "center", alignItems: "center" },
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
  titleRow: { flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 8, padding: 4 },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
  },
  titleTextDark: { color: "#F9FAFB" },
  subtitleText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
  },
  subtitleTextDark: { color: "#9CA3AF" },
  actionButtons: { flexDirection: "row", marginTop: 12, gap: 8 },
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
  actionButtonDark: { backgroundColor: "#374151" },
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
  actionButtonTextDark: { color: "#9CA3AF" },
  actionButtonTextActive: { color: theme.color.primary[700], fontWeight: "600" },
  actionButtonTextActiveComplete: { color: "#059669", fontWeight: "600" },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
  },
  loadingTextDark: { color: "#9CA3AF" },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    marginTop: 16,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: { color: "#EF4444" },
});

export default LevelDocumentViewerScreen;
