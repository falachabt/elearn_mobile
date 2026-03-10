import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface CourseSummaryCardProps {
  isDark: boolean;
  onPress: () => void;
  sourceContentCount?: number | null;
}

export const CourseSummaryCard = ({
  isDark,
  onPress,
  sourceContentCount,
}: CourseSummaryCardProps) => {
  const hasSourceCount = typeof sourceContentCount === "number" && sourceContentCount > 0;

  return (
    <Pressable
      style={[styles.container, isDark && styles.containerDark]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, isDark && styles.iconWrapDark]}>
        <MaterialCommunityIcons
          name="text-box-check-outline"
          size={24}
          color={isDark ? "#6EE7B7" : "#059669"}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, isDark && styles.titleDark]}>
            Resume du cours
          </ThemedText>
          {hasSourceCount && (
            <View style={[styles.badge, isDark && styles.badgeDark]}>
              <ThemedText style={[styles.badgeText, isDark && styles.badgeTextDark]}>
                {sourceContentCount} source{sourceContentCount > 1 ? "s" : ""}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={[styles.description, isDark && styles.descriptionDark]}>
          Voir la synthese complete du cours avant les chapitres.
        </ThemedText>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={isDark ? "#9CA3AF" : "#6B7280"}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  containerDark: {
    backgroundColor: "#052E2B",
    borderColor: "#065F46",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
    marginRight: 12,
  },
  iconWrapDark: {
    backgroundColor: "#064E3B",
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#064E3B",
    flexShrink: 1,
  },
  titleDark: {
    color: "#D1FAE5",
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#047857",
  },
  descriptionDark: {
    color: "#A7F3D0",
  },
  badge: {
    backgroundColor: "#D1FAE5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDark: {
    backgroundColor: "#065F46",
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
  badgeTextDark: {
    color: "#D1FAE5",
  },
});
