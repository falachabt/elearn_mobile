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
  getWeeklyLeaderboard,
  getMyLeaderboardRank,
  LeaderboardEntry,
  WeeklyLeaderboardEntry,
  LEADERBOARD_PAGE_SIZE,
} from '@/services/feed.service';
import LeaderboardFilterBottomSheet, {
  LeaderboardFilters,
} from '@/components/shared/feed/LeaderboardFilterBottomSheet';
import XpInfoBottomSheet from '@/components/shared/feed/XpInfoBottomSheet';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];
const TAB_BAR_HEIGHT = 65;

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
      return timeScope === 'weekly' ? getWeeklyLeaderboard(opts) : getLeaderboard(opts);
    },
    [filters, timeScope]
  );

  useEffect(() => {
    setLoading(true);
    loadPage(0).then((data) => {
      setEntries(data);
      setHasMore(data.length === LEADERBOARD_PAGE_SIZE);
      setLoading(false);
    });
    getMyLeaderboardRank(timeScope, { gradelevel: filters.gradelevel, countryId: filters.country?.id ?? null }).then(
      setMyRank
    );
  }, [loadPage, timeScope]);

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

      <View style={styles.timeScopeRow}>
        <TouchableOpacity
          style={[styles.timeScopeBtn, timeScope === 'general' && styles.timeScopeBtnActive]}
          onPress={() => setTimeScope('general')}
        >
          <Text style={[styles.timeScopeBtnText, timeScope === 'general' && styles.timeScopeBtnTextActive]}>
            Général
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeScopeBtn, timeScope === 'weekly' && styles.timeScopeBtnActive]}
          onPress={() => setTimeScope('weekly')}
        >
          <Text style={[styles.timeScopeBtnText, timeScope === 'weekly' && styles.timeScopeBtnTextActive]}>
            Cette semaine
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.scopeBtn, !hasActiveFilters && styles.scopeBtnActive]}
          onPress={() => setFilters({ gradelevel: null, country: null })}
        >
          <Text style={[styles.scopeBtnText, !hasActiveFilters && styles.scopeBtnTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeBtn, hasActiveFilters && styles.scopeBtnActive]}
          onPress={() => setFilterSheetVisible(true)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={15}
            color={hasActiveFilters ? '#FFFFFF' : theme.color.primary[500]}
          />
          <Text style={[styles.scopeBtnText, hasActiveFilters && styles.scopeBtnTextActive]}>
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
        {loading ? (
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
  timeScopeBtnActive: { backgroundColor: '#0F172A' },
  timeScopeBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  timeScopeBtnTextActive: { color: '#FFFFFF' },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
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
  scopeBtnActive: { backgroundColor: theme.color.primary[500] },
  scopeBtnText: { fontSize: 13, fontWeight: '600', color: theme.color.primary[500] },
  scopeBtnTextActive: { color: '#FFFFFF' },
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
