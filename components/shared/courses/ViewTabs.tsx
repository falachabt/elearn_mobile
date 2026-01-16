import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";

export type ViewType = "content" | "videos" | "quizzes";

interface ViewTabsProps {
  selectedView: ViewType;
  onViewChange: (view: ViewType) => void;
  isDark: boolean;
}

export const ViewTabs = ({ selectedView, onViewChange, isDark }: ViewTabsProps) => {
  const tabs = [
    {
      key: "content" as ViewType,
      label: "Contenu",
      icon: "text-box-outline",
    },
    {
      key: "videos" as ViewType,
      label: "Vidéos",
      icon: "play-circle-outline",
    },
    {
      key: "quizzes" as ViewType,
      label: "Quiz",
      icon: "help-circle-outline",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scrollView, isDark && styles.scrollViewDark]}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.chip,
              isDark && styles.chipDark,
              selectedView === tab.key && styles.selectedChip,
              selectedView === tab.key && isDark && styles.selectedChipDark,
            ]}
            onPress={() => onViewChange(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={18}
              color={
                selectedView === tab.key
                  ? "#FFFFFF"
                  : isDark
                  ? "#D1D5DB"
                  : "#4B5563"
              }
            />
            <ThemedText
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                selectedView === tab.key && styles.selectedChipText,
              ]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
  },
  scrollView: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  scrollViewDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    height: "100%",
    alignItems: "center",
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    gap: 6,
  },
  chipDark: {
    backgroundColor: "#374151",
  },
  selectedChip: {
    backgroundColor: "#65B741",
  },
  selectedChipDark: {
    backgroundColor: "#059669",
  },
  chipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextDark: {
    color: "#D1D5DB",
  },
  selectedChipText: {
    color: "#FFFFFF",
  },
});
