import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useAppConfig } from "@/contexts/useAppConfig";
import {
  useSecondaryDailyContent,
  useSecondaryDailyQuizLeaderboard,
} from "@/hooks/secondary/useSecondaryDailyContent";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getSecondaryDailyContentStats } from "@/services/secondary/dailyContent.service";
import {
  SecondaryDailyContent,
  SecondaryDailyCourseItem,
  SecondaryDailyExerciseItem,
  SecondaryDailyQuizItem,
  SecondaryDailyQuizLeaderboardEntry,
} from "@/types/secondary.type";

// ─── Config ───────────────────────────────────────────────────────────────────

const ITEM_CONFIG = {
  course: {
    icon: "book-open-variant" as const,
    label: "Cours",
    color: "#2563EB",
    bgLight: "#EFF6FF",
    bgDark: "rgba(37,99,235,0.12)",
  },
  quiz: {
    icon: "help-circle-outline" as const,
    label: "Quiz",
    color: "#D97706",
    bgLight: "#FFFBEB",
    bgDark: "rgba(217,119,6,0.12)",
  },
  exercise: {
    icon: "pencil-outline" as const,
    label: "Exercice",
    color: "#7C3AED",
    bgLight: "#F5F3FF",
    bgDark: "rgba(124,58,237,0.12)",
  },
};

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildRoute = (
  programId: string,
  type: "course" | "quiz" | "exercise",
  itemId: string | number,
  dailyContentItemId: string
): Href => {
  const base = `/(app)/secondary/program/${programId}`;
  const q = `?dailyContentItemId=${dailyContentItemId}`;
  if (type === "course") return `${base}/courses/${itemId}${q}` as Href;
  if (type === "quiz") return `${base}/quizzes/${itemId}${q}` as Href;
  return `${base}/exercices/${itemId}${q}` as Href;
};

const formatShortDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({
  type,
  name,
  meta,
  isCompleted,
  isDarkMode,
  onPress,
}: {
  type: "course" | "quiz" | "exercise";
  name: string;
  meta?: string;
  isCompleted: boolean;
  isDarkMode: boolean;
  onPress: () => void;
}) {
  const cfg = ITEM_CONFIG[type];

  return (
    <Pressable
      style={[styles.itemRow, isDarkMode && styles.itemRowDark]}
      onPress={onPress}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: isDarkMode ? cfg.bgDark : cfg.bgLight },
        ]}
      >
        <MaterialCommunityIcons
          name={isCompleted ? "check-circle-outline" : cfg.icon}
          size={20}
          color={isCompleted ? theme.color.primary[500] : cfg.color}
        />
      </View>

      <View style={styles.itemBody}>
        <Text style={[styles.itemType, { color: cfg.color }]}>
          {cfg.label}
          {meta ? ` · ${meta}` : ""}
        </Text>
        <Text
          style={[
            styles.itemName,
            isDarkMode && styles.itemNameDark,
            isCompleted && styles.itemNameDone,
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </View>

      {isCompleted ? (
        <View style={styles.donePill}>
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color={theme.color.primary[600]}
          />
          <Text style={styles.donePillText}>Fait</Text>
        </View>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={isDarkMode ? "#64748B" : "#CBD5E1"}
        />
      )}
    </Pressable>
  );
}

// ─── LeaderboardSection ───────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  index,
  isDarkMode,
}: {
  entry: SecondaryDailyQuizLeaderboardEntry;
  index: number;
  isDarkMode: boolean;
}) {
  const name =
    [entry.firstname, entry.lastname].filter(Boolean).join(" ").trim() ||
    "Anonyme";
  const timeMin = entry.timeSpent > 0 ? Math.round(entry.timeSpent / 60) : null;

  return (
    <View style={[styles.lbRow, isDarkMode && styles.lbRowDark]}>
      <Text style={styles.lbRank}>
        {index < 3 ? RANK_EMOJIS[index] : `#${entry.rank}`}
      </Text>
      <Text
        style={[styles.lbName, isDarkMode && styles.lbNameDark]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <View style={styles.lbRight}>
        <Text style={[styles.lbScore, isDarkMode && styles.lbScoreDark]}>
          {entry.score} pts
        </Text>
        {timeMin !== null ? (
          <Text style={[styles.lbTime, isDarkMode && styles.lbTimeDark]}>
            {timeMin}min
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function LeaderboardSection({
  programId,
  quiz,
  targetDate,
  isDarkMode,
}: {
  programId: string;
  quiz: SecondaryDailyQuizItem;
  targetDate: string;
  isDarkMode: boolean;
}) {
  const { leaderboard, isLoading } = useSecondaryDailyQuizLeaderboard(
    programId,
    {
      dailyContentItemId: quiz.dailyContentItemId,
      quizId: quiz.quizId,
      targetDate,
      limit: 10,
    }
  );

  return (
    <View style={[styles.lbCard, isDarkMode && styles.lbCardDark]}>
      <View style={styles.lbHeader}>
        <MaterialCommunityIcons
          name="trophy-outline"
          size={18}
          color={isDarkMode ? "#FCD34D" : "#92400E"}
        />
        <View>
          <Text style={[styles.lbTitle, isDarkMode && styles.lbTitleDark]}>
            Classement du jour
          </Text>
          <Text style={[styles.lbSubtitle, isDarkMode && styles.lbSubtitleDark]}>
            {quiz.name}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={theme.color.primary[500]}
          style={{ marginTop: 12 }}
        />
      ) : !leaderboard?.entries.length ? (
        <Text style={[styles.lbEmpty, isDarkMode && styles.lbEmptyDark]}>
          Personne n&apos;a encore fait ce quiz aujourd&apos;hui.{"\n"}Sois le
          premier !
        </Text>
      ) : (
        <View style={styles.lbList}>
          {leaderboard.entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.attemptId}
              entry={entry}
              index={i}
              isDarkMode={isDarkMode}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── ActivityProgressBar ──────────────────────────────────────────────────────

function ActivityProgress({
  daily,
  isDarkMode,
}: {
  daily: SecondaryDailyContent;
  isDarkMode: boolean;
}) {
  const { total, completed } = getSecondaryDailyContentStats(daily);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;

  return (
    <View style={[styles.progressCard, isDarkMode && styles.progressCardDark]}>
      <View style={styles.progressTop}>
        <Text style={[styles.progressLabel, isDarkMode && styles.progressLabelDark]}>
          {allDone ? "Activité terminée 🎉" : `${completed} / ${total} activités réalisées`}
        </Text>
        <Text style={[styles.progressPct, isDarkMode && styles.progressPctDark]}>
          {pct}%
        </Text>
      </View>
      <View style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%` as `${number}%` },
            allDone && styles.progressFillDone,
          ]}
        />
      </View>
    </View>
  );
}

// ─── ActivityDetailScreen ─────────────────────────────────────────────────────

export default function ActivityDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { user } = useAuth();
  const { isFeatureEnabled } = useAppConfig();

  const {
    programId: rawProgramId,
    targetDate: rawTargetDate,
    label: rawLabel,
    backTo: rawBackTo,
  } = useLocalSearchParams<{
    programId: string;
    targetDate: string;
    label?: string;
    backTo?: string;
  }>();

  const programId = rawProgramId ?? "";
  const targetDate = rawTargetDate ?? "";
  const label = rawLabel ? decodeURIComponent(rawLabel) : "Du jour";
  const backHref = (rawBackTo
    ? decodeURIComponent(rawBackTo)
    : programId
      ? `/(app)/secondary/program/${programId}`
      : "/(app)") as Href;
  const handleBack = () => {
    router.replace(backHref);
  };

  const { dailyContent, isLoading } = useSecondaryDailyContent(
    programId,
    user?.id,
    targetDate
  );

  const primaryQuiz = useMemo(
    () => dailyContent?.quizzes[0] ?? null,
    [dailyContent]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.navbar, isDarkMode && styles.navbarDark]}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={isDarkMode ? "#E2E8F0" : "#374151"}
            />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.color.primary[500]} />
        </View>
      </View>
    );
  }

  if (!dailyContent) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.navbar, isDarkMode && styles.navbarDark]}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={isDarkMode ? "#E2E8F0" : "#374151"}
            />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
            Aucune activité pour cette date
          </Text>
        </View>
      </View>
    );
  }

  const dateLabel = formatShortDate(targetDate);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Navbar */}
      <View style={[styles.navbar, isDarkMode && styles.navbarDark]}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDarkMode ? "#E2E8F0" : "#374151"}
          />
        </Pressable>
        <View style={[styles.typeBadge]}>
          <Text style={styles.typeBadgeEmoji}>⚡</Text>
          <Text style={styles.typeBadgeText}>Activité {label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date heading */}
        <Text
          style={[styles.dateHeading, isDarkMode && styles.dateHeadingDark]}
        >
          {dateLabel}
        </Text>

        {/* Progress summary */}
        <ActivityProgress daily={dailyContent} isDarkMode={isDarkMode} />

        {/* Items list */}
        <View style={[styles.itemsCard, isDarkMode && styles.itemsCardDark]}>
          {dailyContent.courses.map((course: SecondaryDailyCourseItem) => (
            <ItemRow
              key={course.dailyContentItemId}
              type="course"
              name={course.name}
              meta={
                course.progressPercentage > 0 && !course.isCompleted
                  ? `${Math.round(course.progressPercentage)}% de progression`
                  : undefined
              }
              isCompleted={course.isCompleted}
              isDarkMode={isDarkMode}
              onPress={() =>
                router.push(
                  buildRoute(
                    programId,
                    "course",
                    course.courseId,
                    course.dailyContentItemId
                  )
                )
              }
            />
          ))}

          {dailyContent.quizzes.map((quiz: SecondaryDailyQuizItem) => (
            <ItemRow
              key={quiz.dailyContentItemId}
              type="quiz"
              name={quiz.name}
              meta={`${quiz.questionCount} q.`}
              isCompleted={quiz.isCompleted}
              isDarkMode={isDarkMode}
              onPress={() =>
                router.push(
                  buildRoute(
                    programId,
                    "quiz",
                    quiz.quizId,
                    quiz.dailyContentItemId
                  )
                )
              }
            />
          ))}

          {dailyContent.exercises.map((ex: SecondaryDailyExerciseItem) => (
            <ItemRow
              key={ex.dailyContentItemId}
              type="exercise"
              name={ex.title}
              isCompleted={ex.isCompleted}
              isDarkMode={isDarkMode}
              onPress={() =>
                router.push(
                  buildRoute(
                    programId,
                    "exercise",
                    ex.exerciseId,
                    ex.dailyContentItemId
                  )
                )
              }
            />
          ))}
        </View>

        {/* Leaderboard — quiz du jour */}
        {isFeatureEnabled("daily_activity_leaderboard_enabled") && primaryQuiz ? (
          <LeaderboardSection
            programId={programId}
            quiz={primaryQuiz}
            targetDate={targetDate}
            isDarkMode={isDarkMode}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  errorTextDark: { color: "#94A3B8" },

  // Navbar
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navbarDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.color.primary[500],
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },

  // Date heading
  dateHeading: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize",
  },
  dateHeadingDark: { color: "#F8FAFC" },

  // Progress card
  progressCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: theme.color.dark.border,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressLabelDark: { color: "#E2E8F0" },
  progressPct: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: theme.color.primary[500],
  },
  progressPctDark: { color: theme.color.primary[400] },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressTrackDark: { backgroundColor: "#334155" },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.color.primary[500],
  },
  progressFillDone: { backgroundColor: theme.color.primary[600] },

  // Items card
  itemsCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemsCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: theme.color.dark.border,
  },

  // Item row
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  itemRowDark: {
    borderBottomColor: "#1E293B",
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemBody: { flex: 1, gap: 2 },
  itemType: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  itemNameDark: { color: "#E2E8F0" },
  itemNameDone: { color: "#9CA3AF" },
  donePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: `${theme.color.primary[500]}15`,
  },
  donePillText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.primary[600],
  },

  // Leaderboard
  lbCard: {
    borderRadius: 14,
    padding: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lbCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: theme.color.dark.border,
  },
  lbHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  lbTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  lbTitleDark: { color: "#FCD34D" },
  lbSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#B45309",
  },
  lbSubtitleDark: { color: "#F59E0B" },
  lbEmpty: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: 8,
  },
  lbEmptyDark: { color: "#94A3B8" },
  lbList: { gap: 10 },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  lbRowDark: {},
  lbRank: { fontSize: 18, width: 28 },
  lbName: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  lbNameDark: { color: "#E2E8F0" },
  lbRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  lbScore: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  lbScoreDark: { color: "#F8FAFC" },
  lbTime: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: "#9CA3AF",
  },
  lbTimeDark: { color: "#64748B" },
});
