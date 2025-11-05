import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SecondaryProgram } from "@/types/secondary.type";

// Import des icônes
const calendarIcon =
  require("@/assets/images/icons/calendar.png") as ImageSourcePropType;
const courseIcon =
  require("@/assets/images/icons/course.png") as ImageSourcePropType;
const quizIcon =
  require("@/assets/images/icons/quiz.png") as ImageSourcePropType;
const exerciceIcon =
  require("@/assets/images/icons/exercice.png") as ImageSourcePropType;
const documentIcon =
  require("@/assets/images/icons/document.png") as ImageSourcePropType;

interface SecondaryProgramCardProps {
  program: SecondaryProgram;
  minimalist?: boolean;
  onPress?: () => void;
}

const SecondaryProgramCard: React.FC<SecondaryProgramCardProps> = ({
  program,
  onPress,
  minimalist = false,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const router = useRouter();

  // Placeholder pour la date avant l'examen
  const daysBeforeExam = 42; // À remplacer par la vraie valeur plus tard
  // Placeholder pour la progression
  const progress = 75; // À remplacer par la vraie valeur plus tard

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/(app)/secondary/program/${program.id}`);
  };

  const programTitle = `${program.class?.name || "Classe"} - ${
    program.serie?.name || "Série"
  }`;
  const priceText = program.price ? `${program.price} FCFA` : "Gratuit";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isDarkMode && styles.cardDark,
        pressed && styles.cardPressed,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Programme ${programTitle}, ${priceText}`}
      accessibilityHint="Appuyez pour voir les détails du programme"
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, isDarkMode && styles.titleDark]}
          numberOfLines={1}
          accessible={true}
          accessibilityRole="text"
        >
          {programTitle}
        </Text>
        <Text
          style={[styles.price, isDarkMode && styles.priceDark]}
          accessible={true}
          accessibilityLabel={`Prix: ${priceText}`}
        >
          {priceText}
        </Text>
      </View>
      {/* Bloc stylé pour la date avant l'examen avec icône PNG */}
      <View
        style={[
          styles.examCountdown,
          isDarkMode && styles.examCountdownDark,
          daysBeforeExam < 30 && styles.urgentCountdown,
        ]}
      >
        <Image source={calendarIcon} style={styles.examIcon} />
        <Text
          style={[
            styles.examText,
            daysBeforeExam < 30 && styles.urgentExamText,
            isDarkMode && styles.examTextDark,
          ]}
        >
          {`J-${daysBeforeExam} avant l'examen`}
        </Text>
      </View>
      {/* Bloc stylé pour la progression (barre pleine largeur, sans texte) */}
      <View style={styles.progressContainerFull}>
        <View style={styles.progressBackgroundFull}>
          <View style={[styles.progressFillFull, { width: `${progress}%` }]} />
        </View>
      </View>

      {!minimalist && (
        <>
          <Text
            style={[styles.description, isDarkMode && styles.descriptionDark]}
            numberOfLines={2}
            accessible={true}
          >
            {program.description || "Aucune description"}
          </Text>
          <View
            style={[styles.statsRow, isDarkMode && styles.statsRowDark]}
            accessible={true}
            accessibilityLabel="Statistiques du programme"
          >
            <StatItem
              label="Cours"
              value={program.course_count ?? 0}
              icon={courseIcon}
              isDarkMode={isDarkMode}
            />
            <StatItem
              label="Quiz"
              value={program.quiz_count ?? 0}
              icon={quizIcon}
              isDarkMode={isDarkMode}
            />
            <StatItem
              label="Exos"
              value={program.exercise_count ?? 0}
              icon={exerciceIcon}
              isDarkMode={isDarkMode}
            />
            <StatItem
              label="Documents"
              value={program.document_count ?? 0}
              icon={documentIcon}
              isDarkMode={isDarkMode}
            />
          </View>
        </>
      )}
    </Pressable>
  );
};

const StatItem = ({
  label,
  value,
  icon,
  isDarkMode,
}: {
  label: string;
  value: number;
  icon: ImageSourcePropType;
  isDarkMode: boolean;
}) => (
  <View
    style={styles.statItem}
    accessible={true}
    accessibilityLabel={`${value} ${label}`}
  >
    <Image
      source={icon}
      style={[styles.statIcon, isDarkMode && styles.statIconDark]}
    />
    <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>
      {value}
    </Text>
    <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  examIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: "contain",
    opacity: 0.85,
  },
  progressContainerFull: {
    width: "100%",
    marginBottom: 8,
  },
  progressBackgroundFull: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFillFull: {
    height: "100%",
    backgroundColor: theme.color.primary[500],
    borderRadius: 3,
  },
  examCountdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  examCountdownDark: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
  },
  urgentCountdown: {
    backgroundColor: "rgba(225, 29, 72, 0.1)",
  },
  examText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "500",
    color: theme.color.primary[600],
  },
  examTextDark: {
    color: theme.color.primary[400],
  },
  urgentExamText: {
    color: "#E11D48",
  },
  progressContainer: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  progressBackground: {
    width: 50,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.color.primary[500],
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: theme.color.primary[600],
    marginTop: 2,
  },
  progressTextDark: {
    color: theme.color.primary[400],
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 16,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: "#374151",
    shadowColor: "#000",
    shadowOpacity: 0.3,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    fontFamily: theme.typography.fontFamily,
    lineHeight: 22,
  },
  titleDark: {
    color: "#F9FAFB",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.color.primary[600],
    fontFamily: theme.typography.fontFamily,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.color.primary[50],
    borderRadius: 6,
  },
  priceDark: {
    color: theme.color.primary[300],
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  description: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 20,
  },
  descriptionDark: {
    color: "#D1D5DB",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  statsRowDark: {
    backgroundColor: "rgba(55, 65, 81, 0.5)",
  },
  statItem: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    opacity: 0.8,
  },
  statIconDark: {
    opacity: 0.9,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.color.primary[700],
    fontFamily: theme.typography.fontFamily,
  },
  statValueDark: {
    color: theme.color.primary[300],
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: theme.typography.fontFamily,
    fontWeight: "500",
  },
  statLabelDark: {
    color: "#9CA3AF",
  },
});

export default React.memo(SecondaryProgramCard);
