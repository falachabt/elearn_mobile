import React, { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  getWeeklyRevealState,
  hasSeenWeeklyReveal,
  markWeeklyRevealSeen,
} from "@/services/weeklyReveal.service";
import { WeeklyRevealBottomSheet } from "./WeeklyRevealBottomSheet";

/**
 * Ouvre automatiquement le bottom sheet "top 3 de la semaine" une fois par
 * semaine, à l'ouverture de l'app pendant la fenêtre de révélation
 * (dimanche, juste après la frontière -- voir getWeeklyRevealState()).
 * Le tap sur la notif "classement hebdo" est couvert séparément par
 * leaderboard/index.tsx (mêmes conditions, au montage de cet écran).
 */
export default function WeeklyRevealManager() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const { mode, weekBoundaryKey } = getWeeklyRevealState();
    if (mode !== "reveal") return;

    hasSeenWeeklyReveal(weekBoundaryKey).then((seen) => {
      if (seen) return;
      setVisible(true);
      markWeeklyRevealSeen(weekBoundaryKey);
    });
  }, [user?.id]);

  if (!visible) return null;

  return (
    <WeeklyRevealBottomSheet visible={visible} onClose={() => setVisible(false)} isDark={isDark} />
  );
}
