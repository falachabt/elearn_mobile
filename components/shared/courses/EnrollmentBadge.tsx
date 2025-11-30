import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface EnrollmentBadgeProps {
  isEnrolled: boolean;
}

export const EnrollmentBadge = ({ isEnrolled }: EnrollmentBadgeProps) => {
  if (isEnrolled) {
    return (
      <View style={[styles.badge, styles.enrolledBadge]}>
        <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
        <ThemedText style={styles.enrolledText}>Inscrit</ThemedText>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.previewBadge]}>
      <MaterialCommunityIcons name="eye-outline" size={14} color="#F59E0B" />
      <ThemedText style={styles.previewText}>Aperçu</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enrolledBadge: {
    backgroundColor: "#DCFCE7",
  },
  enrolledText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  previewBadge: {
    backgroundColor: "#FEF3C7",
  },
  previewText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 4,
  },
});
