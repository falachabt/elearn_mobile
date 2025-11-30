import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

export interface SectionProgress {
  sectionid: number;
  completed: number;
  total: number;
}

interface ContentItemProps {
  section: {
    id: number;
    name: string;
    order?: number;
  };
  index: number;
  progress?: SectionProgress;
  isDark: boolean;
  isLocked?: boolean;
  onPress: () => void;
}

export const ContentItem = ({
  section,
  index,
  progress,
  isDark,
  isLocked = false,
  onPress,
}: ContentItemProps) => {
  const progressPercentage = progress
    ? (progress.completed / progress.total) * 100
    : 0;

  return (
    <Pressable
      style={[styles.container, isDark && styles.containerDark]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.sectionNumber,
            isDark ? styles.sectionNumberDark : styles.sectionNumberLight,
          ]}
        >
          <ThemedText style={styles.sectionNumberText}>{index + 1}</ThemedText>
        </View>
        <View style={styles.textContainer}>
          <ThemedText
            style={[styles.title, isDark && styles.titleDark]}
            numberOfLines={1}
          >
            {section.name}
          </ThemedText>

          {progress && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                <View
                  style={[
                    styles.progressFill,
                    isDark && styles.progressFillDark,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
        {isLocked ? (
          <MaterialCommunityIcons
            name="lock"
            size={20}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
        ) : progress && progress.completed === progress.total ? (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={isDark ? "#6EE7B7" : "#65B741"}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  containerDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionNumberLight: {
    backgroundColor: "#F3F4F6",
  },
  sectionNumberDark: {
    backgroundColor: "#374151",
  },
  sectionNumberText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  titleDark: {
    color: "#FFFFFF",
  },
  progressContainer: {
    marginTop: 8,
    width: "100%",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarDark: {
    backgroundColor: "#374151",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#65B741",
    borderRadius: 2,
  },
  progressFillDark: {
    backgroundColor: "#059669",
  },
});
