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
import { SafeAreaView } from "react-native-safe-area-context";

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
      description: "Entraîne-toi sur les sujets des années précédentes",
      icon: "file-document-outline",
      route: "/manuel/anciens-sujets",
      available: true,
    },
    {
      id: "fiches",
      title: "Fiches de révision",
      description: "Résumés clés par matière pour réviser vite",
      icon: "bookmark-outline",
      route: "/manuel/fiches",
      available: false,
    },
    {
      id: "corriges",
      title: "Corrigés détaillés",
      description: "Corrections expliquées pas à pas",
      icon: "check-circle-outline",
      route: "/manuel/corriges",
      available: false,
    },
    {
      id: "formules",
      title: "Formulaires & mémos",
      description: "Formules et tableaux à garder sous la main",
      icon: "table-of-contents",
      route: "/manuel/formules",
      available: false,
    },
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
          Ressources
        </Text>
        <Text style={[styles.headerSubtitle, isDarkMode && styles.textLightDark]}>
          Tout ce qu'il te faut pour réviser
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
              style={[
                styles.sectionCard,
                isDarkMode && styles.sectionCardDark,
                !section.available && styles.sectionCardDisabled,
                !section.available && isDarkMode && styles.sectionCardDisabledDark,
              ]}
              onPress={() => section.available && handleNavigate(section.route)}
              activeOpacity={section.available ? 0.7 : 1}
            >
              <View style={[
                styles.sectionIconContainer,
                !section.available && styles.sectionIconContainerDisabled,
              ]}>
                <MaterialCommunityIcons
                  name={section.icon as any}
                  size={28}
                  color={section.available ? theme.color.primary[500] : (isDarkMode ? "#475569" : "#9CA3AF")}
                />
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[
                    styles.sectionTitle,
                    isDarkMode && styles.textDark,
                    !section.available && styles.textDisabled,
                  ]}>
                    {section.title}
                  </Text>
                  {!section.available && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Bientôt</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.sectionDescription,
                  isDarkMode && styles.textLightDark,
                  !section.available && styles.textDisabled,
                ]}>
                  {section.description}
                </Text>
              </View>
              {section.available && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={isDarkMode ? theme.color.gray[400] : theme.color.gray[600]}
                />
              )}
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
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 2,
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  sectionDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.color.gray[600],
  },
  sectionCardDisabled: {
    opacity: 0.7,
    backgroundColor: "#F9FAFB",
  },
  sectionCardDisabledDark: {
    backgroundColor: "#0F172A",
  },
  sectionIconContainerDisabled: {
    backgroundColor: "#F3F4F6",
  },
  textDisabled: {
    color: "#9CA3AF",
  },
  comingSoonBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default ManuelScreen;
