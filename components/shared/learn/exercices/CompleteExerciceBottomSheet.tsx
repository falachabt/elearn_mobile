import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface CompleteExerciceBottomSheetProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

export default function CompleteExerciceBottomSheet({
  visible,
  onComplete,
  onDismiss,
}: CompleteExerciceBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [isCompleting, setIsCompleting] = React.useState(false);
 const [updateError, setUpdateError] = React.useState<string | null>(null);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const backgroundColor = isDarkMode
    ? theme.color.dark.background.primary
    : theme.color.light.background.primary;

  const textColor = isDarkMode
    ? theme.color.dark.text.primary
    : theme.color.light.text.primary;

  const secondaryTextColor = isDarkMode
    ? theme.color.dark.text.secondary
    : theme.color.light.text.secondary;

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleComplete = async () => {
        setIsCompleting(true);

    try {
      await onComplete();
    } catch {
      setUpdateError("Une erreur est survenue lors de la mise à jour de l'exercice.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Backdrop */}
      <Pressable
        onPress={handleDismiss}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        {/* Sheet — stopPropagation so tapping inside doesn't close */}
        <Pressable onPress={() => {}}>
          <Animated.View
            style={{
              backgroundColor,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              transform: [{ translateY }],
            }}
          >
            {/* Handle indicator */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDarkMode
                  ? theme.color.gray[600]
                  : theme.color.gray[400],
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            {/* Header */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: theme.color.primary[500],
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: textColor,
                  fontFamily: theme.typography.fontFamily,
                  textAlign: "center",
                }}
              >
                Exercice terminé ?
              </Text>
            </View>

            {/* Content */}
            <Text
              style={{
                fontSize: 16,
                color: secondaryTextColor,
                fontFamily: theme.typography.fontFamily,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 24,
              }}
            >
              Vous semblez être en train de quitter l'exercice sans le marquer
              comme complété. Voulez-vous le marquer comme complété avant de
              continuer ?
            </Text>

            {/* Error message */}
            {updateError && (
              <View
                style={{
                  backgroundColor: "#ffebee",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: theme.color.danger,
                    fontSize: 14,
                    fontFamily: theme.typography.fontFamily,
                    textAlign: "center",
                  }}
                >
                  {updateError}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={isCompleting}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDarkMode
                    ? theme.color.dark.border
                    : theme.color.light.border,
                  backgroundColor: "transparent",
                  alignItems: "center",
                  opacity: isCompleting ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: textColor,
                    fontFamily: theme.typography.fontFamily,
                  }}
                >
                  Plus tard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleComplete}
                disabled={isCompleting}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: theme.color.primary[500],
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isCompleting ? 0.8 : 1,
                }}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                    fontFamily: theme.typography.fontFamily,
                  }}
                >
                  {isCompleting ? "complété..." : "Terminer" }
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
