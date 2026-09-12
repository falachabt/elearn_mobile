// app/(app)/leaderboard/index.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getLeaderboard,
  getMyLeaderboardRank,
  LeaderboardEntry,
  WeeklyLeaderboardEntry,
  LEADERBOARD_PAGE_SIZE,
} from '@/services/feed.service';
import LeaderboardFilterBottomSheet, {
  LeaderboardFilters,
} from '@/components/shared/feed/LeaderboardFilterBottomSheet';
import XpInfoBottomSheet from '@/components/shared/feed/XpInfoBottomSheet';
import { WeeklyRevealBottomSheet } from '@/components/shared/leaderboard/WeeklyRevealBottomSheet';
import {
  getWeeklyRevealState,
  getLastCompletedWeekLeaderboard,
  getMyLastCompletedWeekRank,
  hasSeenWeeklyReveal,
  markWeeklyRevealSeen,
  WeeklyRevealMode,
} from '@/services/weeklyReveal.service';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];
const TAB_BAR_HEIGHT = 65;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}j ${hours}h ${minutes}min`;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type Entry = LeaderboardEntry | WeeklyLeaderboardEntry;

function xpOf(entry: Entry): number {
  return 'total_xp' in entry ? entry.total_xp : entry.weekly_xp;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scope?: string }>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user: authUser } = useAuth();

  const [timeScope, setTimeScope] = useState<'general' | 'weekly'>(
    params.scope === 'weekly' ? 'weekly' : 'general'
  );
  const [filters, setFilters] = useState<LeaderboardFilters>({ gradelevel: null, country: null });
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myRank, setMyRank] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [revealState, setRevealState] = useState(getWeeklyRevealState);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [revealSheetVisible, setRevealSheetVisible] = useState(false);
  const weeklyMode: WeeklyRevealMode = revealState.mode;

  // Recalcule l'état toutes les secondes pendant le countdown (affichage
  // live) ; sinon toutes les minutes suffit (transition de label/visibilité).
  useEffect(() => {
    const tick = () => {
      setRevealState(getWeeklyRevealState());
      setNowTick(Date.now());
    };
    const interval = setInterval(tick, weeklyMode === 'countdown' ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [weeklyMode]);

  // Auto-ouverture du bottom sheet top 3 au tap sur la notif "classement
  // hebdo" (deep link ?scope=weekly), une seule fois par semaine révélée.
  // L'ouverture au lancement de l'app (hors navigation) est gérée par
  // WeeklyRevealManager, monté au niveau racine.
  useEffect(() => {
    if (params.scope !== 'weekly') return;
    const { mode, weekBoundaryKey } = getWeeklyRevealState();
    if (mode !== 'reveal') return;
    hasSeenWeeklyReveal(weekBoundaryKey).then((seen) => {
      if (seen) return;
      setRevealSheetVisible(true);
      markWeeklyRevealSeen(weekBoundaryKey);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadPage = useCallback(
    async (offset: number) => {
      const opts = { gradelevel: filters.gradelevel, countryId: filters.country?.id ?? null, offset };
      if (timeScope !== 'weekly') return getLeaderboard(opts);
      if (weeklyMode === 'countdown') return [];
      return getLastCompletedWeekLeaderboard(opts);
    },
    [filters, timeScope, weeklyMode]
  );

  useEffect(() => {
    if (timeScope === 'weekly' && weeklyMode === 'countdown') {
      setEntries([]);
      setMyRank(null);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadPage(0).then((data) => {
      setEntries(data);
      setHasMore(data.length === LEADERBOARD_PAGE_SIZE);
      setLoading(false);
    });

    const rankOpts = { gradelevel: filters.gradelevel, countryId: filters.country?.id ?? null };
    if (timeScope === 'weekly') {
      getMyLastCompletedWeekRank(rankOpts).then(setMyRank);
    } else {
      getMyLeaderboardRank(timeScope, rankOpts).then(setMyRank);
    }
  }, [loadPage, timeScope, weeklyMode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || entries.length === 0) return;
    setLoadingMore(true);
    const more = await loadPage(entries.length);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length === LEADERBOARD_PAGE_SIZE);
    setLoadingMore(false);
  };

  const hasActiveFilters = !!filters.gradelevel || !!filters.country;
  const myEntryVisible = !!myRank && entries.some((e) => e.id === myRank.id);

  const renderRow = (entry: Entry, isPinned = false) => {
    const isMe = entry.id === authUser?.id;
    const medalIdx = entry.rank - 1;
    return (
      <View
        key={isPinned ? `pinned-${entry.id}` : entry.id}
        style={[
          styles.row,
          isDarkMode && styles.rowDark,
          isMe && (isDarkMode ? styles.rowMeDark : styles.rowMe),
        ]}
      >
        <View style={styles.rankCol}>
          {medalIdx >= 0 && medalIdx < 3 ? (
            <MaterialCommunityIcons name="trophy" size={20} color={MEDAL_COLORS[medalIdx]} />
          ) : (
            <Text style={[styles.rankText, isDarkMode && styles.textDark]}>{entry.rank}</Text>
          )}
        </View>

        <View style={styles.avatarWrapper}>
          {entry.avatar_url ? (
            <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{(entry.full_name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {entry.is_online && <View style={styles.onlineBadge} />}
        </View>

        <Text style={[styles.name, isDarkMode && styles.textDark]} numberOfLines={1}>
          {entry.full_name || 'Élève'}{isMe ? ' (toi)' : ''}
        </Text>

        <Text style={styles.xpText}>{xpOf(entry)} XP</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerTitle: 'Classement', headerBackTitle: 'Retour' }} />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark]}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setInfoSheetVisible(true)}
            style={[styles.infoButton, isDarkMode && styles.backButtonDark]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.color.primary[500]} />
            <Animated.View style={[styles.infoBadge, { transform: [{ scale: pulse }] }]} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Classement</Text>
      </View>

      <View style={[styles.timeScopeRow, isDarkMode && styles.timeScopeRowDark]}>
        <TouchableOpacity
          style={[styles.timeScopeBtn, isDarkMode && styles.timeScopeBtnDark, timeScope === 'general' && styles.timeScopeBtnActive]}
          onPress={() => setTimeScope('general')}
        >
          <Text style={[styles.timeScopeBtnText, isDarkMode && styles.timeScopeBtnTextDark, timeScope === 'general' && styles.timeScopeBtnTextActive]}>
            Général
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeScopeBtn, isDarkMode && styles.timeScopeBtnDark, timeScope === 'weekly' && styles.timeScopeBtnActive]}
          onPress={() => setTimeScope('weekly')}
        >
          <Text style={[styles.timeScopeBtnText, isDarkMode && styles.timeScopeBtnTextDark, timeScope === 'weekly' && styles.timeScopeBtnTextActive]}>
            {weeklyMode === 'last_week' ? 'Semaine dernière' : 'Cette semaine'}
          </Text>
        </TouchableOpacity>
      </View>

      {timeScope === 'weekly' && (
        <View style={[styles.weeklyBanner, isDarkMode && styles.weeklyBannerDark]}>
          <Text style={[styles.weeklyBannerText, isDarkMode && styles.textDark]}>
            {weeklyMode === 'reveal'
              ? 'Classement de cette semaine (résultats fraîchement révélés)'
              : weeklyMode === 'last_week'
                ? 'Classement de la semaine dernière'
                : 'Prochain classement dans...'}
          </Text>
          <TouchableOpacity onPress={() => setRevealSheetVisible(true)} style={styles.revoirBtn}>
            <MaterialCommunityIcons name="trophy-outline" size={14} color={theme.color.primary[500]} />
            <Text style={styles.revoirBtnText}>Top 3 + liker</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.scopeRow, isDarkMode && styles.scopeRowDark]}>
        <TouchableOpacity
          style={[styles.scopeBtn, isDarkMode && styles.scopeBtnDark, !hasActiveFilters && styles.scopeBtnActive]}
          onPress={() => setFilters({ gradelevel: null, country: null })}
        >
          <Text style={[styles.scopeBtnText, isDarkMode && styles.scopeBtnTextDark, !hasActiveFilters && styles.scopeBtnTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeBtn, isDarkMode && styles.scopeBtnDark, hasActiveFilters && styles.scopeBtnActive]}
          onPress={() => setFilterSheetVisible(true)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={15}
            color={hasActiveFilters ? '#FFFFFF' : theme.color.primary[500]}
          />
          <Text style={[styles.scopeBtnText, isDarkMode && styles.scopeBtnTextDark, hasActiveFilters && styles.scopeBtnTextActive]}>
            {filters.gradelevel && filters.country
              ? `${filters.gradelevel} · ${filters.country.name}`
              : filters.gradelevel || filters.country?.name || 'Filtrer'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < 300) {
            loadMore();
          }
        }}
        scrollEventThrottle={16}
      >
        {timeScope === 'weekly' && weeklyMode === 'countdown' ? (
          <View style={styles.countdownBox}>
            <MaterialCommunityIcons name="timer-sand" size={48} color={theme.color.primary[400]} />
            <Text style={[styles.countdownTitle, isDarkMode && styles.textDark]}>
              Le classement de la semaine arrive bientôt
            </Text>
            <Text style={styles.countdownTimer}>
              {formatCountdown(revealState.nextRevealAt.getTime() - nowTick)}
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
          </View>
        ) : entries.length > 0 ? (
          <>
            {entries.map((entry) => renderRow(entry))}
            {loadingMore && (
              <View style={styles.loadingMoreBox}>
                <ActivityIndicator size="small" color={theme.color.primary[500]} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="trophy-outline" size={56} color="#CBD5E1" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Aucun classement pour l'instant
            </Text>
          </View>
        )}
      </ScrollView>

      {myRank && !myEntryVisible && (
        <View style={[styles.pinnedWrapper, isDarkMode && styles.pinnedWrapperDark]}>
          <Text style={[styles.pinnedLabel, isDarkMode && styles.subTextDark]}>Ta position</Text>
          {renderRow(myRank, true)}
        </View>
      )}

      <LeaderboardFilterBottomSheet
        visible={filterSheetVisible}
        value={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterSheetVisible(false);
        }}
        onClose={() => setFilterSheetVisible(false)}
      />

      <XpInfoBottomSheet visible={infoSheetVisible} onClose={() => setInfoSheetVisible(false)} />

      <WeeklyRevealBottomSheet
        visible={revealSheetVisible}
        onClose={() => setRevealSheetVisible(false)}
        isDark={isDarkMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  content: { padding: 16, paddingBottom: 24 + TAB_BAR_HEIGHT },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topHeaderDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  topHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  backButtonDark: { backgroundColor: '#374151' },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  infoBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  topHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  timeScopeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  timeScopeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  timeScopeRowDark: { backgroundColor: theme.color.dark.background.secondary },
  timeScopeBtnDark: { backgroundColor: '#334155' },
  timeScopeBtnActive: { backgroundColor: '#0F172A' },
  timeScopeBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  timeScopeBtnTextDark: { color: '#F8FAFC' },
  timeScopeBtnTextActive: { color: '#FFFFFF' },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  scopeRowDark: { backgroundColor: theme.color.dark.background.secondary },
  scopeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    maxWidth: '60%',
  },
  scopeBtnDark: { backgroundColor: '#334155' },
  scopeBtnActive: { backgroundColor: theme.color.primary[500] },
  scopeBtnText: { fontSize: 13, fontWeight: '600', color: theme.color.primary[500] },
  scopeBtnTextDark: { color: '#F8FAFC' },
  scopeBtnTextActive: { color: '#FFFFFF' },
  weeklyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  weeklyBannerDark: { backgroundColor: theme.color.dark.background.secondary },
  weeklyBannerText: { fontSize: 12, fontWeight: '600', color: '#64748B', flexShrink: 1 },
  revoirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    marginLeft: 8,
  },
  revoirBtnText: { fontSize: 11, fontWeight: '700', color: theme.color.primary[500] },
  countdownBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  countdownTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'center', maxWidth: 260 },
  countdownTimer: { fontSize: 28, fontWeight: '800', color: theme.color.primary[500], fontVariant: ['tabular-nums'] },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  loadingMoreBox: { paddingVertical: 20, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 12 },
  textDark: { color: '#F8FAFC' },
  subTextDark: { color: '#94A3B8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  rowMe: { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  rowMeDark: { backgroundColor: '#052e22', borderColor: '#065F46' },
  rankCol: { width: 28, alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  avatarWrapper: { width: 36, height: 36 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.color.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: theme.color.primary[600] },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  xpText: { fontSize: 13, fontWeight: '700', color: theme.color.primary[500] },
  pinnedWrapper: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  pinnedWrapperDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderTopColor: theme.color.dark.border,
  },
  pinnedLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4, marginLeft: 4 },
});
