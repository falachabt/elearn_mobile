import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import useSWR from "swr";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useSecondaryDailyContentForPrograms } from "@/hooks/secondary/useSecondaryDailyContent";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getSecondaryDailyContentStats } from "@/services/secondary/dailyContent.service";
import { getSecondaryPrograms } from "@/services/secondary/program.service";
import { SecondaryDailyContent, SecondaryProgram } from "@/types/secondary.type";
import {
  getSecondaryProgramLabel,
  isSameTrack,
  matchesPreferredSecondaryProgram,
  parseSecondaryPreferences,
} from "@/utils/secondaryPreferences";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getEndOfDay = (targetDate?: string): Date => {
  if (targetDate) {
    const [year, month, day] = targetDate.split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatCountdown = (target: Date, now: Date): string => {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "Renouvellement imminent";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m} min`;
};

const formatShortDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
};

// ─── Types ────────────────────────────────────────────────────────────────────

// Extendable activity type — later: "weekly" | "blanc" | "challenge"
type ActivityType = "daily";

interface ActivitySlot {
  id: string;
  type: ActivityType;
  label: string;
  emoji: string;
  description: string;
  targetDate: string;
  totalItems: number;
  completedItems: number;
  pendingCount: number;
  primaryQuizId?: string;
  primaryDailyItemId?: string;
}

const buildDailySlot = (dailyContent: SecondaryDailyContent): ActivitySlot => {
  const { total, completed, pending } = getSecondaryDailyContentStats(dailyContent);

  const primaryQuiz = dailyContent.quizzes[0];

  return {
    id: `daily-${dailyContent.id}`,
    type: "daily",
    label: "Du jour",
    emoji: "⚡",
    description: formatShortDate(dailyContent.targetDate),
    targetDate: dailyContent.targetDate,
    totalItems: total,
    completedItems: completed,
    pendingCount: pending,
    primaryQuizId: primaryQuiz?.quizId,
    primaryDailyItemId: primaryQuiz?.dailyContentItemId,
  };
};

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityCard({
  slot,
  programId,
  now,
  cardWidth,
  isDarkMode,
}: {
  slot: ActivitySlot;
  programId: string;
  now: Date;
  cardWidth: number;
  isDarkMode: boolean;
}) {
  const router = useRouter();
  const pct = slot.totalItems > 0 ? Math.round((slot.completedItems / slot.totalItems) * 100) : 0;
  const allDone = slot.pendingCount === 0 && slot.totalItems > 0;
  const countdown = formatCountdown(getEndOfDay(slot.targetDate), now);

  const onPress = () => {
    router.push(
      `/(app)/activity/detail?programId=${programId}&targetDate=${slot.targetDate}&label=${encodeURIComponent(slot.label)}&backTo=${encodeURIComponent("/(app)/activity")}` as Href
    );
  };

  return (
    <Pressable
      style={[styles.card, { width: cardWidth }, isDarkMode && styles.cardDark]}
      onPress={onPress}
    >
      {/* Top row: type badge + countdown */}
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, allDone && styles.typeBadgeDone]}>
          <Text style={styles.typeBadgeEmoji}>{slot.emoji}</Text>
          <Text style={styles.typeBadgeText}>{slot.label}</Text>
        </View>
        <View style={[styles.countdownPill, isDarkMode && styles.countdownPillDark]}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={12}
            color={isDarkMode ? "#FCD34D" : "#92400E"}
          />
          <Text style={[styles.countdownText, isDarkMode && styles.countdownTextDark]}>
            {countdown}
          </Text>
        </View>
      </View>

      {/* Date label */}
      <Text style={[styles.cardDate, isDarkMode && styles.cardDateDark]}>{slot.description}</Text>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%` as `${number}%` },
              allDone && styles.progressFillDone,
            ]}
          />
        </View>
        <Text style={[styles.progressPct, isDarkMode && styles.progressPctDark]}>{pct}%</Text>
      </View>

      {/* Summary row */}
      <View style={styles.cardBottom}>
        <Text style={[styles.cardSummary, isDarkMode && styles.cardSummaryDark]}>
          {allDone
            ? "Activité terminée 🎉"
            : `${slot.completedItems} / ${slot.totalItems} réalisées`}
        </Text>
        <View style={[styles.openPill, isDarkMode && styles.openPillDark]}>
          <Text style={[styles.openPillText, isDarkMode && styles.openPillTextDark]}>Voir</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={theme.color.primary[500]}
          />
        </View>
      </View>
    </Pressable>
  );
}

// ─── ProgramSection ───────────────────────────────────────────────────────────

function ProgramSection({
  program,
  dailyContent,
  now,
  cardWidth,
  isDarkMode,
}: {
  program: SecondaryProgram;
  dailyContent: SecondaryDailyContent | null;
  now: Date;
  cardWidth: number;
  isDarkMode: boolean;
}) {
  const label = getSecondaryProgramLabel(program);

  const slots: ActivitySlot[] = useMemo(() => {
    if (!dailyContent) return [];
    return [buildDailySlot(dailyContent)];
    // Later: add weeklySlot, blancSlot, etc.
  }, [dailyContent]);

  if (!dailyContent) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>{label}</Text>
        <View style={[styles.skeletonCard, { width: cardWidth }, isDarkMode && styles.skeletonCardDark]}>
          <ActivityIndicator color={theme.color.primary[500]} />
          <Text style={[styles.skeletonText, isDarkMode && styles.skeletonTextDark]}>
            Préparation...
          </Text>
        </View>
      </View>
    );
  }

  if (!slots.length) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>{label}</Text>
      <FlatList
        data={slots}
        horizontal
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}
        renderItem={({ item }) => (
          <ActivityCard
            slot={item}
            programId={program.id}
            now={now}
            cardWidth={cardWidth}
            isDarkMode={isDarkMode}
          />
        )}
      />
    </View>
  );
}

// ─── ActivityScreen ───────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const { session, user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.round(screenWidth * 0.78);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const secondaryPreferences = useMemo(() => {
    const p = parseSecondaryPreferences(user?.metadata);
    if (
      !p.preferredTrack &&
      typeof user?.gradelevel === "string" &&
      /^terminale/i.test(user.gradelevel.trim())
    ) {
      const parts = user.gradelevel.trim().split(/\s+/);
      return {
        ...p,
        preferredTrack: user.gradelevel.trim(),
        preferredClassName: parts[0] ?? null,
        preferredSeriesName: parts[1] ?? null,
      };
    }
    return p;
  }, [user?.gradelevel, user?.metadata]);

  const {
    data: secondaryPrograms,
    isLoading: programsLoading,
    error: programsError,
    mutate: mutatePrograms,
  } = useSWR<SecondaryProgram[] | null>("secondary-program", () => getSecondaryPrograms());

  const preferredPrograms = useMemo(
    () =>
      (secondaryPrograms ?? []).filter((p) =>
        matchesPreferredSecondaryProgram(p, secondaryPreferences)
      ),
    [secondaryPreferences, secondaryPrograms]
  );

  const selectedExtraPrograms = useMemo(
    () =>
      (secondaryPrograms ?? []).filter((p) =>
        secondaryPreferences.selectedTracks.some((t) =>
          isSameTrack(t, getSecondaryProgramLabel(p))
        )
      ),
    [secondaryPreferences.selectedTracks, secondaryPrograms]
  );

  const visiblePrograms = useMemo(
    () => [
      ...preferredPrograms,
      ...selectedExtraPrograms.filter(
        (p) => !preferredPrograms.some((pp) => pp.id === p.id)
      ),
    ],
    [preferredPrograms, selectedExtraPrograms]
  );

  const visibleProgramIds = useMemo(
    () => visiblePrograms.map((p) => p.id),
    [visiblePrograms]
  );

  const {
    dailyContents,
    isLoading: dailyLoading,
    mutate: mutateDaily,
  } = useSecondaryDailyContentForPrograms(visibleProgramIds, user?.id);

  const dailyByProgram = useMemo(
    () => new Map(dailyContents.map((d) => [d.programId, d])),
    [dailyContents]
  );

  const totalPending = useMemo(
    () =>
      dailyContents.reduce(
        (sum, dailyContent) => sum + getSecondaryDailyContentStats(dailyContent).pending,
        0,
      ),
    [dailyContents]
  );

  const tomorrowUnlock = useMemo(() => {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(6, 0, 0, 0);
    return t;
  }, [now]);

  if (!session) {
    router.replace("/(auth)/login");
    return null;
  }

  if (programsLoading) {
    return (
      <View style={[styles.center, isDarkMode && styles.centerDark]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  if (programsError) {
    return (
      <View style={[styles.center, isDarkMode && styles.centerDark]}>
        <Text style={[styles.centerText, isDarkMode && styles.centerTextDark]}>
          Impossible de charger les activités
        </Text>
        <Pressable style={styles.retryBtn} onPress={() => void mutatePrograms()}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={programsLoading || dailyLoading}
          onRefresh={() => {
            void mutatePrograms();
            void mutateDaily();
          }}
          colors={[theme.color.primary[500]]}
          tintColor={theme.color.primary[500]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Activité</Text>
        {totalPending > 0 ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{totalPending}</Text>
          </View>
        ) : null}
      </View>

      {/* No class configured */}
      {!secondaryPreferences.preferredTrack ? (
        <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
          <MaterialCommunityIcons
            name="school-outline"
            size={44}
            color={theme.color.primary[500]}
          />
          <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
            Choisissez votre Terminale
          </Text>
          <Text style={[styles.emptyBody, isDarkMode && styles.emptyBodyDark]}>
            Vos activités quotidiennes apparaîtront ici.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/secondary")}>
            <Text style={styles.primaryBtnText}>Aller à Collège</Text>
          </Pressable>
        </View>
      ) : visiblePrograms.length === 0 ? (
        <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={40}
            color={isDarkMode ? "#94A3B8" : "#6B7280"}
          />
          <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
            Aucune classe active
          </Text>
          <Text style={[styles.emptyBody, isDarkMode && styles.emptyBodyDark]}>
            Ajoutez une Terminale dans l&apos;onglet Collège.
          </Text>
        </View>
      ) : (
        visiblePrograms.map((program) => (
          <ProgramSection
            key={program.id}
            program={program}
            dailyContent={dailyByProgram.get(program.id) ?? null}
            now={now}
            cardWidth={cardWidth}
            isDarkMode={isDarkMode}
          />
        ))
      )}

      {/* Upcoming strip */}
      {visiblePrograms.length > 0 ? (
        <View style={styles.upcomingRow}>
          <View style={[styles.upcomingChip, isDarkMode && styles.upcomingChipDark]}>
            <MaterialCommunityIcons
              name="timer-sand"
              size={14}
              color={isDarkMode ? "#FCD34D" : "#92400E"}
            />
            <Text style={[styles.upcomingText, isDarkMode && styles.upcomingTextDark]}>
              Nouvelles activités dans {formatCountdown(tomorrowUnlock, now)}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
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
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 120,
    gap: 24,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  headerTitleDark: { color: "#F8FAFC" },
  pendingBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.color.primary[500],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pendingBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Section
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
  },
  sectionTitleDark: { color: "#F8FAFC" },

  // Carousel
  carousel: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Activity card
  card: {
    borderRadius: 14,
    padding: 20,
    backgroundColor: "#FFFFFF",
    height: 190,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: theme.color.dark.border,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.color.primary[500],
  },
  typeBadgeDone: {
    backgroundColor: theme.color.primary[600],
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
  },
  countdownPillDark: {
    backgroundColor: "rgba(217,119,6,0.15)",
  },
  countdownText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  countdownTextDark: { color: "#FCD34D" },

  cardDate: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize",
  },
  cardDateDark: { color: "#F8FAFC" },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressTrackDark: { backgroundColor: "#334155" },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.color.primary[400],
  },
  progressFillDone: { backgroundColor: theme.color.primary[600] },
  progressPct: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    width: 32,
    textAlign: "right",
  },
  progressPctDark: { color: "#94A3B8" },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSummary: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: "#6B7280",
  },
  cardSummaryDark: { color: "#94A3B8" },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: `${theme.color.primary[500]}12`,
  },
  openPillDark: {
    backgroundColor: `${theme.color.primary[500]}20`,
  },
  openPillText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.primary[500],
  },
  openPillTextDark: { color: theme.color.primary[400] },

  // Skeleton
  skeletonCard: {
    marginHorizontal: 20,
    height: 130,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  skeletonCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  skeletonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
  },
  skeletonTextDark: { color: "#94A3B8" },

  // Upcoming
  upcomingRow: { paddingHorizontal: 20 },
  upcomingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  upcomingChipDark: {
    backgroundColor: "rgba(217,119,6,0.12)",
    borderColor: "rgba(217,119,6,0.25)",
  },
  upcomingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
  },
  upcomingTextDark: { color: "#FCD34D" },

  // Center states
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#F1F5F9",
  },
  centerDark: { backgroundColor: theme.color.dark.background.primary },
  centerText: {
    marginTop: 14,
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  centerTextDark: { color: "#94A3B8" },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.color.primary[500],
  },
  retryBtnText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Empty
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: theme.color.dark.border,
  },
  emptyTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily,
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptyTitleDark: { color: "#F8FAFC" },
  emptyBody: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBodyDark: { color: "#94A3B8" },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.color.primary[500],
  },
  primaryBtnText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
