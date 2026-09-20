import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFeatureFlag } from "posthog-react-native";

import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useLevels } from "@/hooks/secondary/useLevelDocuments";

const ManuelScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== "light";
  const { trigger } = useHaptics();
  const { levels } = useLevels();
  const documentsParNiveauEnabled = useFeatureFlag("documents_par_niveau_enabled") === true;

  const handleNavigate = (route: string) => {
    trigger(HapticType.SELECTION);
    router.push(route as any);
  };

  const sections = [
    {
      id: "anciens-sujets",
      title: "Anciens sujets de concours",
      description: "Consultez les anciens sujets de concours",
      icon: "file-document-outline",
      route: "/manuel/anciens-sujets",
    },
    ...(documentsParNiveauEnabled
      ? levels.map((level) => ({
          id: `level-${level.id}`,
          title: level.name,
          description: level.description || "Cours et fiches classés par niveau",
          icon: "folder-multiple-outline",
          route: `/manuel/niveaux/${level.id}`,
        }))
      : []),
    // {
    //   id: "exercices",
    //   title: "Exercices",
    //   description: "Pratiquez avec des exercices",
    //   icon: "pencil-outline",
    //   route: "/manuel/exercices",
    // },
    // {
    //   id: "quiz",
    //   title: "Quiz",
    //   description: "Testez vos connaissances avec des quiz",
    //   icon: "help-circle-outline",
    //   route: "/manuel/quiz",
    // },
  ];

  return (
    <View
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          Documents
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionsContainer}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}
              onPress={() => handleNavigate(section.route)}
            >
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons
                  name={section.icon as any}
                  size={22}
                  color={theme.color.primary[500]}
                />
              </View>
              <View style={styles.sectionContent}>
                <Text
                  style={[styles.sectionTitle, isDarkMode && styles.textDark]}
                  numberOfLines={1}
                >
                  {section.title}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  textDark: {
    color: "#FFFFFF",
  },
  textLightDark: {
    color: theme.color.gray[400],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionsContainer: {
    gap: 12,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.medium,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.color.primary[500]}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});

export default ManuelScreen;
