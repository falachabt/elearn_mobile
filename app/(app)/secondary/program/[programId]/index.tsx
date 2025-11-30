import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSecondaryProgram } from "@/hooks/secondary/useSecondaryPrograms";
import SecondaryProgramCard from "@/components/shared/secondary/SecondaryProgramCard";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

type CardRoute =
  | "/(app)/secondary/program/[programId]/courses"
  | "/(app)/secondary/program/[programId]/quizzes"
  | "/(app)/secondary/program/[programId]/exercises"
  | "/(app)/secondary/program/[programId]/documents";

interface ActionCard {
  id: string;
  title: string;
  subtitle?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  icon: JSX.Element;
  route: string;
  color: string;
  rightContent?: React.ReactNode;
}

const SecondaryProgramDetails = () => {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { trigger } = useHaptics();

  const { program, isLoading, isError } = useSecondaryProgram(programId);

  // Dummy data - à remplacer plus tard par les vraies données
  const isEnrolled = true; // Simuler l'inscription
  const progression = {
    courses: { current: 8, total: program?.course_count || 0, percentage: 65 },
    quizzes: { current: 5, total: program?.quiz_count || 0, percentage: 50 },
    exercises: {
      current: 15,
      total: program?.exercise_count || 0,
      percentage: 75,
    },
    documents: {
      current: 3,
      total: program?.document_count || 0,
      percentage: 37,
    },
  };

  // Action cards
  const actionCards = useMemo<ActionCard[]>(() => {
    if (!program) return [];

    return [
      {
        id: "courses",
        title: "Cours",
        subtitle: isEnrolled
          ? "Continuez votre apprentissage"
          : "Accédez aux cours du programme",
        progress: isEnrolled ? progression.courses : undefined,
        icon: (
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={24}
            color={isDark ? "#6EE7B7" : "#4CAF50"}
          />
        ),
        route: `/(app)/secondary/program/${programId}/courses`,
        color: isDark ? "#6EE7B7" : "#4CAF50",
        rightContent: isEnrolled ? (
          <View style={styles.progressIndicator}>
            <ThemedText
              style={[styles.progressText, isDark && styles.progressTextDark]}
            >
              {progression.courses.current}/{program.course_count}
            </ThemedText>
            <ThemedText
              style={[styles.progressLabel, isDark && styles.progressLabelDark]}
            >
              cours complétés
            </ThemedText>
          </View>
        ) : undefined,
      },
      {
        id: "quizzes",
        title: "Quiz",
        subtitle: isEnrolled
          ? "Testez vos connaissances"
          : "Accédez aux quiz d'évaluation",
        progress: isEnrolled ? progression.quizzes : undefined,
        icon: (
          <MaterialCommunityIcons
            name="pencil-box-multiple"
            size={24}
            color={isDark ? "#60A5FA" : "#2196F3"}
          />
        ),
        route: `/(app)/secondary/program/${programId}/quizzes`,
        color: isDark ? "#60A5FA" : "#2196F3",
        rightContent: isEnrolled ? (
          <View style={styles.progressIndicator}>
            <ThemedText
              style={[styles.progressText, isDark && styles.progressTextDark]}
            >
              {progression.quizzes.current}/{program.quiz_count}
            </ThemedText>
            <ThemedText
              style={[styles.progressLabel, isDark && styles.progressLabelDark]}
            >
              quiz complétés
            </ThemedText>
          </View>
        ) : undefined,
      },
      {
        id: "exercises",
        title: "Exercices",
        subtitle: isEnrolled
          ? "Pratiquez régulièrement"
          : "Accédez aux exercices",
        progress: isEnrolled ? progression.exercises : undefined,
        icon: (
          <MaterialCommunityIcons
            name="card-text-outline"
            size={24}
            color={isDark ? "#E879F9" : "#9C27B0"}
          />
        ),
        route: `/(app)/secondary/program/${programId}/exercices`,
        color: isDark ? "#E879F9" : "#9C27B0",
        rightContent: isEnrolled ? (
          <View style={styles.progressIndicator}>
            <ThemedText
              style={[styles.progressText, isDark && styles.progressTextDark]}
            >
              {progression.exercises.current}/{program.exercise_count}
            </ThemedText>
            <ThemedText
              style={[styles.progressLabel, isDark && styles.progressLabelDark]}
            >
              exercices complétés
            </ThemedText>
          </View>
        ) : undefined,
      },
      {
        id: "documents",
        title: "Documents",
        subtitle: isEnrolled
          ? "Consultez les ressources"
          : "Accédez aux documents",
        progress: isEnrolled ? progression.documents : undefined,
        icon: (
          <MaterialCommunityIcons
            name="file-document-multiple"
            size={24}
            color={isDark ? "#FBBF24" : "#FF9800"}
          />
        ),
        route: `/(app)/secondary/program/${programId}/documents`,
        color: isDark ? "#FBBF24" : "#FF9800",
        rightContent: isEnrolled ? (
          <View style={styles.progressIndicator}>
            <ThemedText
              style={[styles.progressText, isDark && styles.progressTextDark]}
            >
              {progression.documents.current}/{program.document_count || 0}
            </ThemedText>
            <ThemedText
              style={[styles.progressLabel, isDark && styles.progressLabelDark]}
            >
              documents consultés
            </ThemedText>
          </View>
        ) : undefined,
      },
    ];
  }, [program, programId, isEnrolled, isDark, progression]);

  const handleCardPress = (card: ActionCard) => {
    trigger(HapticType.LIGHT);
    router.push(card.route as CardRoute);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          isDark && styles.containerDark,
          styles.centered,
        ]}
      >
        <ThemedText style={[styles.text, isDark && styles.textDark]}>
          Chargement du programme...
        </ThemedText>
      </View>
    );
  }

  if (isError || !program) {
    return (
      <View
        style={[
          styles.container,
          isDark && styles.containerDark,
          styles.centered,
        ]}
      >
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          Erreur lors du chargement du programme
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <ThemedText style={[styles.title, isDark && styles.titleDark]}>
            {program.class?.name} - {program.serie?.name}
          </ThemedText>
          {program.description && (
            <ThemedText
              style={[styles.description, isDark && styles.descriptionDark]}
            >
              {program.description}
            </ThemedText>
          )}
        </View>

        {/* Enrollment Status */}
        {!isEnrolled && (
          <View style={[styles.statusBanner, styles.notEnrolledBanner]}>
            <ThemedText style={styles.statusText}>
              {/* Vous n'êtes pas encore inscrit à ce programmeTODO add action button here to enrol */}
              Vous n'êtes pas encore inscrit à ce programme
            </ThemedText>
          </View>
        )}

        {/* Program Card */}
        <View style={styles.cardContainer}>
          <SecondaryProgramCard program={program} minimalist />
        </View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          {actionCards.map((card) => (
            <Pressable
              key={card.id}
              style={[styles.card, isDark && styles.cardDark]}
              onPress={() => handleCardPress(card)}
            >
              <View style={styles.cardMain}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: card.color + (isDark ? "20" : "10") },
                  ]}
                >
                  {card.icon}
                </View>
                <View style={styles.cardContent}>
                  <ThemedText
                    style={[styles.cardTitle, isDark && styles.cardTitleDark]}
                  >
                    {card.title}
                  </ThemedText>
                  {card.subtitle && (
                    <ThemedText
                      style={[
                        styles.cardSubtitle,
                        isDark && styles.cardSubtitleDark,
                      ]}
                    >
                      {card.subtitle}
                    </ThemedText>
                  )}
                </View>
                {card.rightContent}
              </View>

              {card.progress && (
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      isDark && styles.progressBarDark,
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${card.progress.percentage}%`,
                          backgroundColor: card.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 16,
    marginBottom: 16,
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
    marginBottom: 8,
  },
  titleDark: {
    color: "#F9FAFB",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
    lineHeight: 20,
  },
  descriptionDark: {
    color: "#9CA3AF",
  },
  statusBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notEnrolledBanner: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.color.primary[600],
    fontFamily: theme.typography.fontFamily,
    textAlign: "center",
  },
  cardContainer: {
    marginBottom: 16,
  },
  progressSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  progressSectionDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: "#F9FAFB",
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardTitleDark: {
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  cardSubtitleDark: {
    color: "#9CA3AF",
  },
  progressIndicator: {
    alignItems: "flex-end",
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  progressTextDark: {
    color: "#D1D5DB",
  },
  progressLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
  },
  progressLabelDark: {
    color: "#9CA3AF",
  },
  progressBarContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarDark: {
    backgroundColor: "#4B5563",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  text: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
  },
  textDark: {
    color: "#9CA3AF",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: {
    color: "#F87171",
  },
});

export default SecondaryProgramDetails;
