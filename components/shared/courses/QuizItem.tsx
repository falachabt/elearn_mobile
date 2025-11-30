import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface QuizItemProps {
  quiz: {
    id: number;
    name: string;
    questions?: { id: number }[];
    estimated_time?: number;
  };
  index: number;
  highestScore?: number;
  isDark: boolean;
  isLocked?: boolean;
  onPress: () => void;
}

export const QuizItem = ({
  quiz,
  index,
  highestScore = 0,
  isDark,
  isLocked = false,
  onPress,
}: QuizItemProps) => {
  return (
    <Pressable
      style={[styles.container, isDark && styles.containerDark]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconContainer,
          isDark ? styles.iconContainerDark : styles.iconContainerLight,
        ]}
      >
        <MaterialCommunityIcons
          name={isLocked ? "lock" : "help-circle-outline"}
          size={24}
          color={isDark ? "#818CF8" : "#6366F1"}
        />
      </View>
      <View style={styles.textContent}>
        <ThemedText
          style={[styles.title, isDark && styles.titleDark]}
          numberOfLines={2}
        >
          {quiz?.name || `Quiz ${index + 1}`}
        </ThemedText>
        <View style={styles.metaContainer}>
          <View
            style={[
              styles.chip,
              isDark ? styles.chipDark : styles.chipLight,
            ]}
          >
            <ThemedText style={styles.chipText}>
              {quiz?.questions?.length || 0} questions
            </ThemedText>
          </View>

          {quiz?.estimated_time && (
            <View
              style={[
                styles.chip,
                isDark ? styles.chipDark : styles.chipLight,
              ]}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={isDark ? "#818CF8" : "#6366F1"}
                style={styles.chipIcon}
              />
              <ThemedText style={styles.chipText}>
                {quiz.estimated_time} min
              </ThemedText>
            </View>
          )}

          {!isLocked && (
            <View
              style={[
                styles.chip,
                isDark ? styles.chipDark : styles.chipLight,
              ]}
            >
              <MaterialCommunityIcons
                name="star-outline"
                size={14}
                color={isDark ? "#818CF8" : "#6366F1"}
                style={styles.chipIcon}
              />
              <ThemedText style={styles.chipText}>
                Score: {highestScore}%
              </ThemedText>
            </View>
          )}
        </View>
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
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
  },
  containerDark: {
    backgroundColor: "#1F2937",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainerLight: {
    backgroundColor: "#EEF2FF",
  },
  iconContainerDark: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 8,
  },
  titleDark: {
    color: "#F3F4F6",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipLight: {
    backgroundColor: "#EEF2FF",
  },
  chipDark: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
  },
});
