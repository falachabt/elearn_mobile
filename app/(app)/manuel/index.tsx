import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

const ManuelScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== "light";
  const { trigger } = useHaptics();

  const handleNavigate = (route: string) => {
    trigger(HapticType.SELECTION);
    router.push(route as any);
  };

  const sections = [
    {
      id: "anciens-sujets",
      title: "Anciens sujets",
      description: "Consultez les anciens sujets de concours",
      icon: "file-document-outline",
      route: "/manuel/anciens-sujets",
    },
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
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          Manuel
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
                  size={32}
                  color={theme.color.primary[500]}
                />
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDescription, isDarkMode && styles.textLightDark]}>
                  {section.description}
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
    </SafeAreaView>
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
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.color.primary[500]}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sectionDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
});

export default ManuelScreen;