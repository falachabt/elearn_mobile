import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface PreviewBannerProps {
  isDark: boolean;
  itemCount: number;
  itemType: "sections" | "vidéos" | "quiz";
  onPurchase: () => void;
}

export const PreviewBanner = ({
  isDark,
  itemCount,
  itemType,
  onPurchase,
}: PreviewBannerProps) => {
  return (
    <View style={[styles.banner, isDark && styles.bannerDark]}>
      <MaterialCommunityIcons
        name="lock"
        size={24}
        color={isDark ? "#6EE7B7" : "#65B741"}
      />
      <View style={styles.textContainer}>
        <ThemedText style={[styles.title, isDark && styles.titleDark]}>
          Accédez à {itemCount} {itemType} supplémentaires
        </ThemedText>
        <ThemedText style={styles.description}>
          Achetez ce {itemType === "sections" ? "cours" : "programme"} pour débloquer tout le contenu
        </ThemedText>
      </View>
      <Pressable style={styles.button} onPress={onPurchase}>
        <ThemedText style={styles.buttonText}>Acheter</ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  bannerDark: {
    backgroundColor: "#064E3B",
    borderColor: "#065F46",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#065F46",
    marginBottom: 2,
  },
  titleDark: {
    color: "#6EE7B7",
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#047857",
  },
  button: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
