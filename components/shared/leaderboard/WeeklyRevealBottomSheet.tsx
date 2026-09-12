import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions, Platform, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import {
  getLastCompletedWeekLeaderboard,
  getMyWeeklyLikeCooldownSeconds,
  getWeeklyRevealState,
  likeProfile,
  LIKE_COOLDOWN_ERROR,
} from "@/services/weeklyReveal.service";
import type { WeeklyLeaderboardEntry } from "@/services/feed.service";

const { height } = Dimensions.get("window");
const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#B45309"];

interface WeeklyRevealBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m} min`;
}

/**
 * Révélation hebdo : top 3 de la dernière semaine complète, avec la
 * possibilité de liker un profil (1 like max toutes les 24h, tous profils
 * confondus -- voir services/weeklyReveal.service.ts).
 */
export const WeeklyRevealBottomSheet: React.FC<WeeklyRevealBottomSheetProps> = ({
  visible,
  onClose,
  isDark,
}) => {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const [top3, setTop3] = useState<WeeklyLeaderboardEntry[]>([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likedId, setLikedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setLikedId(null);
    Promise.all([
      getLastCompletedWeekLeaderboard({ limit: 3 }),
      getMyWeeklyLikeCooldownSeconds(),
    ]).then(([entries, cooldown]) => {
      setTop3(entries);
      setCooldownSeconds(cooldown);
      setLoading(false);
    });
  }, [visible]);

  const handleLike = async (targetId: string) => {
    if (cooldownSeconds > 0) return;
    const { weekBoundaryKey } = getWeeklyRevealState();
    try {
      await likeProfile(targetId, weekBoundaryKey);
      setLikedId(targetId);
      setCooldownSeconds(24 * 3600);
    } catch (err) {
      if (err instanceof Error && err.message === LIKE_COOLDOWN_ERROR) {
        setCooldownSeconds(24 * 3600);
      }
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.55}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      statusBarTranslucent
      deviceHeight={height}
      propagateSwipe={Platform.OS === "ios"}
    >
      <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        <MaterialCommunityIcons name="trophy" size={32} color="#F59E0B" style={{ alignSelf: "center" }} />
        <ThemedText style={styles.title}>Top 3 de la semaine !</ThemedText>
        <ThemedText style={styles.subtitle}>
          Félicite les meilleurs élèves de la semaine dernière
        </ThemedText>

        {!loading && top3.map((entry, idx) => {
          const isMe = entry.id === authUser?.id;
          const isLiked = likedId === entry.id;
          return (
            <View key={entry.id} style={[styles.row, isDark && styles.rowDark]}>
              <MaterialCommunityIcons name="trophy" size={22} color={MEDAL_COLORS[idx]} />
              <View style={styles.avatarWrapper}>
                {entry.avatar_url ? (
                  <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarText}>
                      {(entry.full_name || "?").charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {entry.full_name || "Élève"}{isMe ? " (toi)" : ""}
                </ThemedText>
                <ThemedText style={styles.xp}>{entry.weekly_xp} XP</ThemedText>
              </View>
              {!isMe && (
                <Pressable
                  onPress={() => handleLike(entry.id)}
                  disabled={cooldownSeconds > 0}
                  style={styles.heartButton}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={26}
                    color={isLiked ? "#EF4444" : cooldownSeconds > 0 ? "#CBD5E1" : "#EF4444"}
                  />
                </Pressable>
              )}
            </View>
          );
        })}

        {!loading && top3.length === 0 && (
          <ThemedText style={styles.emptyText}>Pas encore de classement pour la semaine dernière.</ThemedText>
        )}

        {cooldownSeconds > 0 && (
          <ThemedText style={styles.cooldownText}>
            Prochain like possible dans {formatCooldown(cooldownSeconds)}
          </ThemedText>
        )}

        <Pressable
          style={[styles.closeButton, { backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500] }]}
          onPress={onClose}
        >
          <ThemedText style={styles.closeButtonText}>Fermer</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  handleDark: { backgroundColor: theme.color.gray[600] },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: "center",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  rowDark: { backgroundColor: theme.color.dark.background.primary },
  avatarWrapper: { width: 36, height: 36 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.color.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: theme.color.primary[600] },
  name: { fontSize: 14, fontWeight: "600" },
  xp: { fontSize: 12, color: theme.color.gray[600] },
  heartButton: { padding: 4 },
  emptyText: {
    textAlign: "center",
    color: theme.color.gray[600],
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    paddingVertical: 12,
  },
  cooldownText: {
    textAlign: "center",
    fontSize: 12,
    color: theme.color.gray[600],
    fontFamily: theme.typography.fontFamily,
    marginTop: 4,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default WeeklyRevealBottomSheet;
