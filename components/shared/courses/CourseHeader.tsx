import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface CourseHeaderProps {
  courseName: string;
  categoryName?: string;
  sectionsCount: number;
  videosCount: number;
  isEnrolled: boolean;
  isDark: boolean;
  onBack: () => void;
}

export const CourseHeader = ({
  courseName,
  categoryName,
  sectionsCount,
  videosCount,
  isEnrolled,
  isDark,
  onBack,
}: CourseHeaderProps) => {
  return (
    <View style={[styles.header, isDark && styles.headerDark]}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={isDark ? "#FFFFFF" : "#111827"}
        />
      </Pressable>
      <View style={styles.headerContent}>
        <View style={styles.headerTitleRow}>
          <ThemedText
            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
            numberOfLines={1}
          >
            {courseName}
          </ThemedText>
          <View style={[styles.badge, isEnrolled ? styles.enrolledBadge : styles.previewBadge]}>
            <MaterialCommunityIcons
              name={isEnrolled ? "check-circle" : "eye-outline"}
              size={14}
              color={isEnrolled ? "#10B981" : "#F59E0B"}
            />
            <ThemedText style={isEnrolled ? styles.enrolledText : styles.previewText}>
              {isEnrolled ? "Inscrit" : "Aperçu"}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.courseInfo, isDark && styles.courseInfoDark]}>
          {categoryName ? `${categoryName} • ` : ""}
          {sectionsCount} sections • {videosCount} vidéos
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  courseTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  courseTitleDark: {
    color: "#FFFFFF",
  },
  courseInfo: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
  },
  courseInfoDark: {
    color: "#9CA3AF",
  },
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
