import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

const QuizScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== "light";
  const { trigger } = useHaptics();

  const handleBack = () => {
    trigger(HapticType.LIGHT);
    router.back();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          Quiz
        </Text>
      </View>

      <View style={styles.content}>
        <MaterialCommunityIcons
          name="help-circle-outline"
          size={64}
          color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
        />
        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          Fonctionnalité à venir
        </Text>
        <Text style={[styles.description, isDarkMode && styles.textLightDark]}>
          Cette section est en cours de développement. Revenez bientôt pour tester vos connaissances avec des quiz interactifs.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  textDark: {
    color: "#FFFFFF",
  },
  textLightDark: {
    color: theme.color.gray[400],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[600],
    textAlign: "center",
    maxWidth: 300,
  },
});

export default QuizScreen;