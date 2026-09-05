// components/shared/learn/quiz/QuizResultBottomSheet.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
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

const ScoreRing = ({ correct, total, passed }: { correct: number; total: number; passed: boolean }) => {
  const ratio = total > 0 ? correct / total : 0;
  const color = passed ? '#10B981' : '#EF4444';

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#E5E7EB"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE * ratio}, ${RING_CIRCUMFERENCE}`}
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringScore} testID="quiz-result-score">{correct}/{total}</Text>
          <Text style={styles.ringLabel}>CORRECT</Text>
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
            <MaterialCommunityIcons name="close" size={22} color={isDark ? '#E2E8F0' : '#6B7280'} />
          </TouchableOpacity>
          <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={1}>
            Quiz — {quizName}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.ringWrapper}>
          <ScoreRing correct={results.correctAnswers} total={results.totalQuestions} passed={isPassed} />
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.xpBadge}>
            <MaterialCommunityIcons name="star" size={16} color="#B45309" />
            <Text style={styles.xpBadgeText}>+{results.xpGained} XP</Text>
          </View>
          {results.maxCombo >= 2 && (
            <View style={styles.comboBadge}>
              <MaterialCommunityIcons name="fire" size={16} color="#DC2626" />
              <Text style={styles.comboBadgeText}>Combo ×{results.maxCombo}</Text>
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
                  <Text style={styles.lbTime}>{formatTime(entry.time_spent)}</Text>
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
                    <Text style={styles.lbTime}>{formatTime(myRank.time_spent)}</Text>
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
    backgroundColor: '#F5F3EE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sheetDark: { backgroundColor: '#1C1917' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D6D3CB', marginBottom: 12 },
  handleDark: { backgroundColor: '#44403C' },
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#78716C',
    textTransform: 'uppercase',
  },
  titleDark: { color: '#A8A29E' },
  ringWrapper: { marginVertical: 16 },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontFamily: theme.typography.fontFamily, fontSize: 30, fontWeight: '800', color: '#1C1917' },
  ringLabel: { fontFamily: theme.typography.fontFamily, fontSize: 11, fontWeight: '700', color: '#A8A29E', letterSpacing: 1, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  xpBadgeText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#92400E' },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  comboBadgeText: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#991B1B' },
  lbBox: {
    width: '100%',
    backgroundColor: '#EAE7E0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  lbBoxDark: { backgroundColor: '#292524' },
  lbTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#A8A29E',
    marginBottom: 8,
  },
  lbTitleDark: { color: '#78716C' },
  lbEmpty: { fontFamily: theme.typography.fontFamily, fontSize: 13, color: '#A8A29E', textAlign: 'center', paddingVertical: 8 },
  lbEmptyDark: { color: '#78716C' },
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
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderRadius: 10,
  },
  lbRowPinnedDark: { backgroundColor: 'rgba(5,150,105,0.16)' },
  lbRank: { width: 18, fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#A8A29E' },
  lbRankFirst: { color: '#B45309' },
  lbEllipsis: { textAlign: 'center', color: '#A8A29E', marginVertical: 2 },
  lbEllipsisDark: { color: '#78716C' },
  rowAvatar: { width: 26, height: 26, borderRadius: 13 },
  rowAvatarPlaceholder: {
    backgroundColor: theme.color.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarInitial: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  lbName: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '600', color: '#1C1917' },
  lbNameDark: { color: '#F5F5F4' },
  lbScore: { fontFamily: theme.typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#1C1917', marginRight: 6 },
  lbScoreDark: { color: '#F5F5F4' },
  lbTime: { fontFamily: theme.typography.fontFamily, fontSize: 12, color: '#A8A29E', width: 42, textAlign: 'right' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  deltaText: { flex: 1, fontFamily: theme.typography.fontFamily, fontSize: 12, color: '#57534E' },
  deltaTextDark: { color: '#A8A29E' },
  actionsRow: { width: '100%', marginBottom: 10 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: `${theme.color.primary[500]}15`,
  },
  secondaryButtonDark: { backgroundColor: `${theme.color.primary[500]}25` },
  secondaryButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 15, fontWeight: '700', color: theme.color.primary[500] },
  continueButton: {
    width: '100%',
    backgroundColor: theme.color.primary[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
