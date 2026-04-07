import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  SecondaryDailyContent,
  SecondaryDailyQuizLeaderboard,
} from "@/types/secondary.type";

interface SecondaryDailyContentPanelProps {
  dailyContent: SecondaryDailyContent;
  programId: string;
  variant?: "compact" | "full";
  leaderboard?: SecondaryDailyQuizLeaderboard | null;
}

const buildRoute = (
  programId: string,
  type: "course" | "quiz" | "exercise",
  itemId: string | number,
  dailyContentItemId: string
) => {
  if (type === "course") {
    return `/(app)/secondary/program/${programId}/courses/${itemId}?dailyContentItemId=${dailyContentItemId}`;
  }

  if (type === "quiz") {
    return `/(app)/secondary/program/${programId}/quizzes/${itemId}?dailyContentItemId=${dailyContentItemId}`;
  }

  return `/(app)/secondary/program/${programId}/exercices/${itemId}?dailyContentItemId=${dailyContentItemId}`;
};

export default function SecondaryDailyContentPanel({
  dailyContent,
  programId,
  variant = "compact",
  leaderboard,
}: SecondaryDailyContentPanelProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const router = useRouter();

  const hasContent =
    dailyContent.courses.length > 0 ||
    dailyContent.quizzes.length > 0 ||
    dailyContent.exercises.length > 0;

  if (!hasContent) return null;

  const navigateTo = (
    type: "course" | "quiz" | "exercise",
    itemId: string | number,
    dailyContentItemId: string
  ) => {
    router.push(
      buildRoute(programId, type, itemId, dailyContentItemId) as Href
    );
  };

  const renderStatus = (isCompleted: boolean) => (
    <View
      style={[
        styles.statusBadge,
        isCompleted ? styles.statusDone : styles.statusPending,
      ]}
    >
      <MaterialCommunityIcons
        name={isCompleted ? "check-circle" : "clock-outline"}
        size={14}
        color={isCompleted ? "#065F46" : "#1D4ED8"}
      />
      <Text style={[styles.statusText, isCompleted && styles.statusTextDone]}>
        {isCompleted ? "Fait" : "À faire"}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        variant === "full" && styles.containerFull,
        isDarkMode && styles.containerDark,
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            Aujourd&apos;hui
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
            {dailyContent.pendingCount > 0
              ? `${dailyContent.pendingCount} contenu${dailyContent.pendingCount > 1 ? "s" : ""} restant${dailyContent.pendingCount > 1 ? "s" : ""}`
              : "Tout est terminé pour aujourd'hui"}
          </Text>
        </View>
        <View
          style={[
            styles.datePill,
            isDarkMode && styles.datePillDark,
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-star"
            size={16}
            color={theme.color.primary[500]}
          />
          <Text style={[styles.dateText, isDarkMode && styles.dateTextDark]}>
            Du jour
          </Text>
        </View>
      </View>

      {dailyContent.courses.map((course) => (
        <Pressable
          key={course.dailyContentItemId}
          style={[styles.itemCard, isDarkMode && styles.itemCardDark]}
          onPress={() =>
            navigateTo("course", course.courseId, course.dailyContentItemId)
          }
        >
          <View style={styles.itemIcon}>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={20}
              color="#2563EB"
            />
          </View>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemEyebrow, isDarkMode && styles.itemEyebrowDark]}>
              Cours du jour
            </Text>
            <Text style={[styles.itemTitle, isDarkMode && styles.itemTitleDark]}>
              {course.name}
            </Text>
            <Text style={[styles.itemMeta, isDarkMode && styles.itemMetaDark]}>
              {Math.round(course.progressPercentage)}% de progression
            </Text>
          </View>
          {renderStatus(course.isCompleted)}
        </Pressable>
      ))}

      {dailyContent.quizzes.map((quiz, index) => (
        <Pressable
          key={quiz.dailyContentItemId}
          style={[styles.itemCard, isDarkMode && styles.itemCardDark]}
          onPress={() =>
            navigateTo("quiz", quiz.quizId, quiz.dailyContentItemId)
          }
        >
          <View style={styles.itemIcon}>
            <MaterialCommunityIcons
              name={index === 0 ? "trophy-outline" : "pencil-box-multiple"}
              size={20}
              color="#7C3AED"
            />
          </View>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemEyebrow, isDarkMode && styles.itemEyebrowDark]}>
              {index === 0 ? "Quiz du jour" : `Quiz du jour ${index + 1}`}
            </Text>
            <Text style={[styles.itemTitle, isDarkMode && styles.itemTitleDark]}>
              {quiz.name}
            </Text>
            <Text style={[styles.itemMeta, isDarkMode && styles.itemMetaDark]}>
              {quiz.questionCount} questions
              {quiz.bestScore > 0 ? ` • ${Math.round(quiz.bestScore)}% meilleur score` : ""}
            </Text>
          </View>
          {renderStatus(quiz.isCompleted)}
        </Pressable>
      ))}

      {dailyContent.exercises.map((exercise, index) => (
        <Pressable
          key={exercise.dailyContentItemId}
          style={[styles.itemCard, isDarkMode && styles.itemCardDark]}
          onPress={() =>
            navigateTo("exercise", exercise.exerciseId, exercise.dailyContentItemId)
          }
        >
          <View style={styles.itemIcon}>
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={20}
              color="#059669"
            />
          </View>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemEyebrow, isDarkMode && styles.itemEyebrowDark]}>
              {index === 0 ? "Exercice du jour" : `Exercice du jour ${index + 1}`}
            </Text>
            <Text style={[styles.itemTitle, isDarkMode && styles.itemTitleDark]}>
              {exercise.title}
            </Text>
            {exercise.description ? (
              <Text
                numberOfLines={1}
                style={[styles.itemMeta, isDarkMode && styles.itemMetaDark]}
              >
                {exercise.description}
              </Text>
            ) : null}
          </View>
          {renderStatus(exercise.isCompleted)}
        </Pressable>
      ))}

      {variant === "full" && leaderboard?.entries?.length ? (
        <View style={[styles.leaderboard, isDarkMode && styles.leaderboardDark]}>
          <View style={styles.leaderboardHeader}>
            <Text style={[styles.leaderboardTitle, isDarkMode && styles.titleDark]}>
              Classement du quiz du jour
            </Text>
            <Text style={[styles.leaderboardMeta, isDarkMode && styles.subtitleDark]}>
              Top {leaderboard.entries.length}
            </Text>
          </View>
          {leaderboard.entries.slice(0, 5).map((entry) => (
            <View key={`${entry.userId}-${entry.attemptId}`} style={styles.leaderboardRow}>
              <View style={styles.leaderboardRank}>
                <Text style={[styles.rankText, isDarkMode && styles.titleDark]}>
                  #{entry.rank}
                </Text>
              </View>
              <View style={styles.leaderboardUser}>
                <Text style={[styles.leaderboardName, isDarkMode && styles.itemTitleDark]}>
                  {[entry.firstname, entry.lastname].filter(Boolean).join(" ") || "Élève"}
                </Text>
                <Text style={[styles.leaderboardScore, isDarkMode && styles.itemMetaDark]}>
                  {Math.round(entry.score)}% • {entry.timeSpent}s
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    backgroundColor: "#F0FDF4",
    padding: 14,
    gap: 10,
  },
  containerFull: {
    marginTop: 0,
  },
  containerDark: {
    backgroundColor: "rgba(15, 118, 110, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  titleDark: {
    color: "#FFFFFF",
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  subtitleDark: {
    color: "#D1D5DB",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
  },
  datePillDark: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
  },
  dateText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  dateTextDark: {
    color: "#BFDBFE",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  itemCardDark: {
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemEyebrow: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
    textTransform: "uppercase",
  },
  itemEyebrowDark: {
    color: "#6EE7B7",
  },
  itemTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  itemTitleDark: {
    color: "#F9FAFB",
  },
  itemMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
  },
  itemMetaDark: {
    color: "#9CA3AF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: "#DBEAFE",
  },
  statusDone: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  statusTextDone: {
    color: "#065F46",
  },
  leaderboard: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 185, 129, 0.2)",
    gap: 10,
  },
  leaderboardDark: {
    borderTopColor: "rgba(16, 185, 129, 0.25)",
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaderboardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  leaderboardMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leaderboardRank: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  rankText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  leaderboardUser: {
    flex: 1,
  },
  leaderboardName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  leaderboardScore: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});
