import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { RefObject, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import useSWR from "swr";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { useSecondaryDailyContentForPrograms } from "@/hooks/secondary/useSecondaryDailyContent";
import { getSecondaryDailyContentStats } from "@/services/secondary/dailyContent.service";
import { getSecondaryPrograms } from "@/services/secondary/program.service";
import { SecondaryDailyContent, SecondaryProgram } from "@/types/secondary.type";
import {
  getSecondaryProgramLabel,
  isSameTrack,
  matchesPreferredSecondaryProgram,
  parseSecondaryPreferences,
} from "@/utils/secondaryPreferences";

interface Props {
  isDarkMode: boolean;
  tourRef?: RefObject<View | null>;
  onVisibilityChange?: (visible: boolean) => void;
}

interface TodoItem {
  programId: string;
  programLabel: string;
  targetDate: string;
  pendingCount: number;
  totalCount: number;
}

const buildTodoItems = (
  programs: SecondaryProgram[],
  dailyContents: SecondaryDailyContent[]
): TodoItem[] => {
  const byProgram = new Map(dailyContents.map((d) => [d.programId, d]));

  return programs
    .map((program) => {
      const daily = byProgram.get(program.id);
      if (!daily) return null;

      const { total, pending } = getSecondaryDailyContentStats(daily);
      if (total === 0) return null;

      return {
        programId: program.id,
        programLabel: getSecondaryProgramLabel(program),
        targetDate: daily.targetDate,
        pendingCount: pending,
        totalCount: total,
      } satisfies TodoItem;
    })
    .filter((item): item is TodoItem => item !== null);
};

export default function DailyTodoSection({
  isDarkMode,
  tourRef,
  onVisibilityChange,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const borderRotation = useRef(new Animated.Value(0)).current;

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

  const { data: secondaryPrograms } = useSWR<SecondaryProgram[] | null>(
    "secondary-program",
    () => getSecondaryPrograms()
  );

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

  const { dailyContents } = useSecondaryDailyContentForPrograms(
    visibleProgramIds,
    user?.id
  );

  const todoItems = useMemo(
    () => buildTodoItems(visiblePrograms, dailyContents),
    [visiblePrograms, dailyContents]
  );

  const shouldPulseBorder = useMemo(() => {
    return todoItems.some((item) => {
      if (item.totalCount === 0) {
        return false;
      }

      const progress = ((item.totalCount - item.pendingCount) / item.totalCount) * 100;
      return progress < 80;
    });
  }, [todoItems]);

  useEffect(() => {
    onVisibilityChange?.(todoItems.length > 0);
  }, [onVisibilityChange, todoItems.length]);

  useEffect(() => {
    if (!shouldPulseBorder) {
      borderRotation.stopAnimation();
      borderRotation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(borderRotation, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [borderRotation, shouldPulseBorder]);

  // Nothing to show only when there is no configured class/day content at all
  if (!todoItems.length) return null;

  const rotatingBorderStyle = {
    transform: [
      {
        rotate: borderRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  return (
    <View ref={tourRef} collapsable={false} style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          À faire aujourd&apos;hui
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {todoItems.reduce((s, i) => s + i.pendingCount, 0)}
          </Text>
        </View>
      </View>

      <View style={styles.cardShell}>
        {shouldPulseBorder && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rotatingBorderBeam,
              isDarkMode
                ? styles.rotatingBorderBeamDark
                : styles.rotatingBorderBeamLight,
              rotatingBorderStyle,
            ]}
          />
        )}

        <View
          style={[
            styles.card,
            styles.cardInner,
            isDarkMode && styles.cardDark,
          ]}
        >
          {todoItems.map((item, idx) => {
            const pct = Math.round(
              ((item.totalCount - item.pendingCount) / item.totalCount) * 100
            );
            const isLast = idx === todoItems.length - 1;

            return (
              <Pressable
                key={item.programId}
                style={[styles.row, !isLast && styles.rowBorder, isDarkMode && styles.rowBorderDark]}
                onPress={() =>
                  router.push(
                    `/(app)/activity/detail?programId=${item.programId}&targetDate=${item.targetDate}&label=${encodeURIComponent("Du jour")}&backTo=${encodeURIComponent("/(app)")}` as Href
                  )
                }
              >
                <View
                  style={[
                    styles.iconWrap,
                    isDarkMode ? styles.iconWrapDark : styles.iconWrapLight,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar-star"
                    size={18}
                    color={isDarkMode ? "#FCD34D" : "#B45309"}
                  />
                </View>

                <View style={styles.rowBody}>
                  <Text
                    style={[styles.rowLabel, isDarkMode && styles.rowLabelDark]}
                    numberOfLines={1}
                  >
                    {item.programLabel}
                  </Text>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}>
                      <View
                        style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]}
                      />
                    </View>
                    <Text style={[styles.progressPct, isDarkMode && styles.progressPctDark]}>
                      {pct}%
                    </Text>
                  </View>
                </View>

                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>{item.pendingCount}</Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={isDarkMode ? "#475569" : "#CBD5E1"}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  sectionTitleDark: { color: "#F8FAFC" },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.color.primary[500],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cardShell: {
    borderRadius: theme.border.radius.small,
    overflow: "hidden",
    padding: 1.5,
  },
  rotatingBorderBeam: {
    position: "absolute",
    top: -70,
    left: "50%",
    width: "42%",
    height: 220,
    marginLeft: "-21%",
    borderRadius: 999,
    opacity: 0.9,
    zIndex: 0,
  },
  rotatingBorderBeamLight: {
    backgroundColor: "rgba(16, 185, 129, 0.85)",
  },
  rotatingBorderBeamDark: {
    backgroundColor: "rgba(52, 211, 153, 0.9)",
  },
  card: {
    borderRadius: theme.border.radius.small,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: {
    zIndex: 1,
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    shadowOpacity: 0,
    borderColor: theme.color.dark.border,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  rowBorderDark: { borderBottomColor: "#1E293B" },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapLight: { backgroundColor: "#FFFBEB" },
  iconWrapDark: { backgroundColor: "rgba(217,119,6,0.12)" },

  rowBody: { flex: 1, gap: 5 },
  rowLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  rowLabelDark: { color: "#E2E8F0" },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
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
  progressPct: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    width: 40,
    flexShrink: 0,
    textAlign: "right",
  },
  progressPctDark: { color: "#64748B" },

  pendingPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pendingPillText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
});
