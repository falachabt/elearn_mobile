import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

export type ViewType = "content" | "videos" | "quizzes";

interface EmptyStateProps {
  type: ViewType;
  isDark: boolean;
}

export const EmptyState = ({ type, isDark }: EmptyStateProps) => {
  let icon: "file-document-outline" | "video-off-outline" | "help-circle-outline";
  let title: string;
  let description: string;

  switch (type) {
    case "content":
      icon = "file-document-outline";
      title = "Aucun contenu disponible";
      description = "Le contenu de ce cours est en cours de préparation.";
      break;
    case "videos":
      icon = "video-off-outline";
      title = "Aucune vidéo disponible";
      description = "Les vidéos de ce cours sont en cours de production.";
      break;
    case "quizzes":
      icon = "help-circle-outline";
      title = "Aucun quiz disponible";
      description = "Les quiz pour ce cours seront bientôt disponibles.";
      break;
  }

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon}
        size={48}
        color={isDark ? "#6EE7B7" : "#65B741"}
      />
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 24,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    textAlign: "center",
    color: "#6B7280",
    maxWidth: "80%",
  },
});
