import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

interface VideoItemProps {
  video: {
    id: number;
    title: string;
    duration?: number;
  };
  index: number;
  isDark: boolean;
  isLocked?: boolean;
  onPress: () => void;
}

export const VideoItem = ({
  video,
  index,
  isDark,
  isLocked = false,
  onPress,
}: VideoItemProps) => {
  return (
    <Pressable
      style={[styles.container, isDark && styles.containerDark]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={isLocked ? "lock" : "play-circle"}
          size={28}
          color={isDark ? "#6EE7B7" : "#65B741"}
        />
      </View>
      <View style={styles.textContent}>
        <ThemedText
          style={[styles.title, isDark && styles.titleDark]}
          numberOfLines={2}
        >
          {video.title || `Video ${index + 1}`}
        </ThemedText>
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <ThemedText style={styles.metaText}>
              {Math.floor((video?.duration || 0) / 60)} min
            </ThemedText>
          </View>
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
    marginRight: 12,
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
    marginBottom: 4,
  },
  titleDark: {
    color: "#F3F4F6",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  metaText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
});
