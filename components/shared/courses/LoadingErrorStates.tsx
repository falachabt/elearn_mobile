import { View, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface LoadingStateProps {
  isDark: boolean;
  message?: string;
}

export const LoadingState = ({ isDark, message = "Chargement du cours..." }: LoadingStateProps) => {
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#65B741"} />
      <ThemedText style={styles.text}>{message}</ThemedText>
    </View>
  );
};

interface ErrorStateProps {
  isDark: boolean;
  message?: string;
  onRetry: () => void;
}

export const ErrorState = ({
  isDark,
  message = "Une erreur s'est produite lors du chargement du cours.",
  onRetry,
}: ErrorStateProps) => {
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
      <ThemedText style={styles.errorText}>{message}</ThemedText>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" style={styles.retryIcon} />
        <ThemedText style={styles.retryText}>Réessayer</ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  text: {
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginVertical: 16,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#65B741",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: theme.typography.fontFamily,
  },
});
