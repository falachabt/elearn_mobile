import React from "react";
import { Dimensions, Platform, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

const { height } = Dimensions.get("window");

interface LeaveDocumentSheetProps {
  visible: boolean;
  isDark: boolean;
  onMarkComplete: () => void;
  onPin: () => void;
  onDismiss: () => void;
}

/**
 * Sheet affichée quand l'utilisateur quitte réellement (back/swipe/navigation)
 * un écran de visualisation de document sans l'avoir marqué complété ou épinglé.
 * Utilisée avec useLeaveDocumentIntercept sur tous les viewers de documents.
 */
export const LeaveDocumentSheet: React.FC<LeaveDocumentSheetProps> = ({
  visible,
  isDark,
  onMarkComplete,
  onPin,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onDismiss}
      onBackButtonPress={onDismiss}
      onSwipeComplete={onDismiss}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      statusBarTranslucent
      deviceHeight={height}
      propagateSwipe={Platform.OS === "ios"}
    >
      <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        <ThemedText style={[styles.title, isDark && styles.titleDark]}>
          Vous quittez ce document
        </ThemedText>
        <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>
          L'avez-vous terminé, ou voulez-vous l'épingler pour y revenir plus tard ?
        </ThemedText>

        <Pressable
          style={[styles.actionButton, styles.primaryButton]}
          onPress={onMarkComplete}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFFFFF" />
          <ThemedText style={styles.primaryButtonText}>Marquer comme complété</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.secondaryButton, isDark && styles.secondaryButtonDark]}
          onPress={onPin}
        >
          <MaterialCommunityIcons
            name="pin-outline"
            size={20}
            color={isDark ? theme.color.gray[200] : theme.color.gray[700]}
          />
          <ThemedText style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark]}>
            Épingler pour plus tard
          </ThemedText>
        </Pressable>

        <Pressable style={styles.dismissButton} onPress={onDismiss}>
          <ThemedText style={[styles.dismissButtonText, isDark && styles.dismissButtonTextDark]}>
            Quitter sans marquer
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  handleDark: { backgroundColor: theme.color.gray[600] },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },
  titleDark: { color: "#FFFFFF" },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 20,
  },
  subtitleDark: { color: theme.color.gray[400] },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  primaryButton: { backgroundColor: theme.color.primary[500] },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: { backgroundColor: "#F3F4F6" },
  secondaryButtonDark: { backgroundColor: theme.color.dark.background.primary },
  secondaryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: theme.color.gray[700],
  },
  secondaryButtonTextDark: { color: theme.color.gray[200] },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dismissButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[500],
  },
  dismissButtonTextDark: { color: theme.color.gray[400] },
});
