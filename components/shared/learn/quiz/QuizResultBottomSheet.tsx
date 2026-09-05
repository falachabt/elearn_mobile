// components/shared/learn/quiz/QuizResultBottomSheet.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Animated } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { theme } from '@/constants/theme';
import { QuizResults, QuizLeaderboardEntry } from '@/types/quiz.type';
import { QuizService } from '@/services/quiz.service';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/utils/logger';

interface QuizResultBottomSheetProps {
  visible: boolean;
  isDark: boolean;
  quizName: string;
  results: QuizResults;
  onRetry: () => Promise<void>;
  onContinue: () => Promise<void>;
  onClose: () => void;
}

const RING_SIZE = 130;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const ANIM_DURATION = 900;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Anime un compteur entier de 0 vers `target` (utilisé pour le score et l'XP).
const useCountUp = (target: number, active: boolean, duration = ANIM_DURATION) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    let raf = 0;
    let startTime: number | null = null;

    const step = (t: number) => {
      if (startTime === null) startTime = t;
      const progress = Math.min((t - startTime) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
};

const ScoreRing = ({
  correct,
  total,
  passed,
  isDark,
  active,
}: {
  correct: number;
  total: number;
  passed: boolean;
  isDark: boolean;
  active: boolean;
}) => {
  const ratio = total > 0 ? correct / total : 0;
  const color = passed ? '#10B981' : '#EF4444';
  const displayedCorrect = useCountUp(correct, active);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(0);
    if (!active) return;
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [active, ratio, progressAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, RING_CIRCUMFERENCE * (1 - ratio)],
  });

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={isDark ? theme.color.dark.border : theme.color.light.border}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE}, ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringScore, isDark && styles.ringScoreDark]} testID="quiz-result-score">
            {displayedCorrect}/{total}
          </Text>
          <Text style={[styles.ringLabel, isDark && styles.ringLabelDark]}>CORRECT</Text>
        </View>
      </View>
    </View>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const LeaderboardAvatar = ({ url, name }: { url: string | null; name: string }) => (
  url ? (
    <Image source={{ uri: url }} style={styles.rowAvatar} />
  ) : (
    <View style={[styles.rowAvatar, styles.rowAvatarPlaceholder]}>
      <Text style={styles.rowAvatarInitial}>{(name || '?').charAt(0).toUpperCase()}</Text>
    </View>
  )
);

export const QuizResultBottomSheet = ({
  visible,
  isDark,
  quizName,
  results,
  onRetry,
  onContinue,
  onClose,
}: QuizResultBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loadingAction, setLoadingAction] = useState<'retry' | 'continue' | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<QuizLeaderboardEntry | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const isPassed = results.score >= 70;
  const timeDelta = results.previousTimeSpent != null ? results.previousTimeSpent - results.timeSpent : null;
  const displayedXp = useCountUp(results.xpGained, visible);

  useEffect(() => {
    if (!visible || !results.quizId) return;
    let cancelled = false;
    setLoadingLeaderboard(true);

    Promise.all([
      QuizService.getQuizLeaderboard(results.quizId, 3),
      QuizService.getMyQuizRank(results.quizId),
    ])
      .then(([top, mine]) => {
        if (cancelled) return;
        setLeaderboard(top);
        setMyRank(mine);
      })
      .catch((error) => logger.error('Error loading quiz leaderboard:', error))
      .finally(() => {
        if (!cancelled) setLoadingLeaderboard(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, results.quizId]);

  const myRankVisible = useMemo(
    () => !!myRank && leaderboard.some((entry) => entry.user_id === myRank.user_id),
    [leaderboard, myRank]
  );

  const handleRetry = async () => {
    setLoadingAction('retry');
    await onRetry();
    setLoadingAction(null);
  };

  const handleContinue = async () => {
    setLoadingAction('continue');
    await onContinue();
    setLoadingAction(null);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      useNativeDriver
    >
      <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: 20 + insets.bottom }]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={isDark ? '#94A3B8' : '#6B7280'} />
          </TouchableOpacity>
          <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={1}>
            Quiz — {quizName}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.ringWrapper}>
          <ScoreRing
            correct={results.correctAnswers}
            total={results.totalQuestions}
            passed={isPassed}
            isDark={isDark}
            active={visible}
          />
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.xpBadge, isDark && styles.xpBadgeDark]}>
            <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
            <Text style={[styles.xpBadgeText, isDark && styles.xpBadgeTextDark]}>+{displayedXp} XP</Text>
          </View>
          {results.maxCombo >= 2 && (
            <View style={[styles.comboBadge, isDark && styles.comboBadgeDark]}>
              <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
              <Text style={[styles.comboBadgeText, isDark && styles.comboBadgeTextDark]}>Combo ×{results.maxCombo}</Text>
            </View>
          )}
        </View>

        <View style={[styles.lbBox, isDark && styles.lbBoxDark]}>
          <Text style={[styles.lbTitle, isDark && styles.lbTitleDark]}>CLASSEMENT — CE QUIZ</Text>

          {loadingLeaderboard ? (
            <ActivityIndicator size="small" color={theme.color.primary[500]} style={{ marginVertical: 12 }} />
          ) : leaderboard.length === 0 ? (
            <Text style={[styles.lbEmpty, isDark && styles.lbEmptyDark]}>Sois le premier au classement !</Text>
          ) : (
            <>
              {leaderboard.map((entry) => (
                <View key={entry.user_id} style={styles.lbRow}>
                  <Text style={[styles.lbRank, entry.rank === 1 && styles.lbRankFirst]}>{entry.rank}</Text>
                  <LeaderboardAvatar url={entry.avatar_url} name={entry.full_name || '?'} />
                  <Text style={[styles.lbName, isDark && styles.lbNameDark]} numberOfLines={1}>
                    {entry.user_id === user?.id ? 'Toi' : entry.full_name || 'Élève'}
                  </Text>
                  <Text style={[styles.lbScore, isDark && styles.lbScoreDark]}>
                    {entry.correct_count}/{entry.total_count}
                  </Text>
                  <Text style={[styles.lbTime, isDark && styles.lbTimeDark]}>{formatTime(entry.time_spent)}</Text>
                </View>
              ))}

              {myRank && !myRankVisible && (
                <>
                  <Text style={[styles.lbEllipsis, isDark && styles.lbEllipsisDark]}>...</Text>
                  <View style={[styles.lbRow, styles.lbRowPinned, isDark && styles.lbRowPinnedDark]}>
                    <Text style={styles.lbRank}>{myRank.rank}</Text>
                    <LeaderboardAvatar url={myRank.avatar_url} name="Toi" />
                    <Text style={[styles.lbName, isDark && styles.lbNameDark]}>Toi</Text>
                    <Text style={[styles.lbScore, isDark && styles.lbScoreDark]}>
                      {myRank.correct_count}/{myRank.total_count}
                    </Text>
                    <Text style={[styles.lbTime, isDark && styles.lbTimeDark]}>{formatTime(myRank.time_spent)}</Text>
                  </View>
                </>
              )}
            </>
          )}

          {timeDelta != null && Math.abs(timeDelta) >= 1 && (
            <View style={styles.deltaRow}>
              <MaterialCommunityIcons
                name={timeDelta > 0 ? 'arrow-up-bold' : 'arrow-down-bold'}
                size={13}
                color={timeDelta > 0 ? '#10B981' : '#94A3B8'}
              />
              <Text style={[styles.deltaText, isDark && styles.deltaTextDark]}>
                {Math.abs(timeDelta).toFixed(1)}s de {timeDelta > 0 ? 'plus vite' : 'moins vite'} que ta dernière tentative
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
            onPress={handleRetry}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'retry' ? (
              <ActivityIndicator size="small" color={theme.color.primary[500]} />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={18} color={theme.color.primary[500]} />
                <Text style={styles.secondaryButtonText}>Recommencer</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
            onPress={onClose}
            disabled={loadingAction !== null}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={theme.color.primary[500]} />
            <Text style={styles.secondaryButtonText}>Correction</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loadingAction !== null}
        >
          {loadingAction === 'continue' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continuer</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: theme.color.light.background.primary,
    borderTopLeftRadius: theme.border.radius.large,
    borderTopRightRadius: theme.border.radius.large,
    paddingTop: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sheetDark: { backgroundColor: theme.color.dark.background.primary },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.light.border, marginBottom: 12 },
  handleDark: { backgroundColor: theme.color.dark.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: theme.color.light.text.primary,
  },
  titleDark: { color: '#F8FAFC' },
  ringWrapper: { marginVertical: 16 },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontFamily: theme.typography.fontFamily, fontSize: 30, fontWeight: '800', color: theme.color.light.text.primary },
  ringScoreDark: { color: '#F8FAFC' },
  ringLabel: { fontFamily: theme.typography.fontFamily, fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginTop: 2 },
  ringLabelDark: { color: '#94A3B8' },
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.light.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  xpBadgeDark: { backgroundColor: theme.color.dark.background.tertiary },
  xpBadgeText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: theme.color.light.text.primary },
  xpBadgeTextDark: { color: '#F8FAFC' },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.light.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  comboBadgeDark: { backgroundColor: theme.color.dark.background.tertiary },
  comboBadgeText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: theme.color.light.text.primary },
  comboBadgeTextDark: { color: '#F8FAFC' },
  lbBox: {
    width: '100%',
    backgroundColor: theme.color.light.background.tertiary,
    borderRadius: theme.border.radius.medium,
    padding: 14,
    marginBottom: 16,
  },
  lbBoxDark: { backgroundColor: theme.color.dark.background.secondary },
  lbTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#94A3B8',
    marginBottom: 8,
  },
  lbTitleDark: { color: '#94A3B8' },
  lbEmpty: { fontFamily: theme.typography.fontFamily, fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
  lbEmptyDark: { color: '#94A3B8' },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  lbRowPinned: {
    marginTop: 4,
    paddingTop: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    backgroundColor: `${theme.color.primary[500]}12`,
    borderRadius: theme.border.radius.small,
  },
  lbRowPinnedDark: { backgroundColor: `${theme.color.primary[500]}22` },
  lbRank: { width: 18, fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  lbRankFirst: { color: '#F59E0B' },
  lbEllipsis: { textAlign: 'center', color: '#94A3B8', marginVertical: 2 },
  lbEllipsisDark: { color: '#94A3B8' },
  rowAvatar: { width: 26, height: 26, borderRadius: 13 },
  rowAvatarPlaceholder: {
    backgroundColor: theme.color.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarInitial: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  lbName: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '600', color: theme.color.light.text.primary },
  lbNameDark: { color: '#F8FAFC' },
  lbScore: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: theme.color.light.text.primary, marginRight: 6 },
  lbScoreDark: { color: '#F8FAFC' },
  lbTime: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: '#94A3B8', width: 42, textAlign: 'right' },
  lbTimeDark: { color: '#94A3B8' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  deltaText: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 12, color: theme.color.light.text.secondary },
  deltaTextDark: { color: '#94A3B8' },
  actionsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: theme.border.radius.medium,
    backgroundColor: `${theme.color.primary[500]}15`,
  },
  secondaryButtonDark: { backgroundColor: `${theme.color.primary[500]}25` },
  secondaryButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 14, fontWeight: '700', color: theme.color.primary[500] },
  continueButton: {
    width: '100%',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.medium,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
