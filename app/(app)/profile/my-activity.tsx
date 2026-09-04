// app/(app)/profile/my-activity.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { getMyXpHistory, XpHistoryEntry } from '@/services/feed.service';

const SOURCE_META: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  feed_post: { label: 'Publication créée', icon: 'note-plus-outline' },
  feed_comment: { label: 'Commentaire ajouté', icon: 'comment-text-outline' },
  feed_like: { label: 'Like reçu sur ta publication', icon: 'heart' },
  feed_best_answer: { label: 'Réponse marquée "meilleure réponse"', icon: 'medal-outline' },
  quiz: { label: 'Quiz complété', icon: 'clipboard-check-outline' },
  exam: { label: 'Examen complété', icon: 'school-outline' },
};

const FEED_SOURCE_TYPES = ['feed_post', 'feed_comment', 'feed_like', 'feed_best_answer'];
const LEARNING_SOURCE_TYPES = ['quiz', 'exam'];

type FilterTab = 'all' | 'feed' | 'learning';

const XP_PAGE_SIZE = 30;

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
}

export default function MyActivityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [entries, setEntries] = useState<XpHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    getMyXpHistory(0).then((data) => {
      setEntries(data);
      setHasMore(data.length === XP_PAGE_SIZE);
      setLoading(false);
    });
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore || entries.length === 0) return;
    setLoadingMore(true);
    const more = await getMyXpHistory(entries.length);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length === XP_PAGE_SIZE);
    setLoadingMore(false);
  };

  const filteredEntries = useMemo(() => {
    if (filter === 'feed') return entries.filter((e) => FEED_SOURCE_TYPES.includes(e.source_type));
    if (filter === 'learning') return entries.filter((e) => LEARNING_SOURCE_TYPES.includes(e.source_type));
    return entries;
  }, [entries, filter]);

  const handlePressEntry = (entry: XpHistoryEntry) => {
    if (entry.post_id) {
      router.push(`/post/${entry.post_id}`);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerTitle: 'Mon activité', headerBackTitle: 'Retour' }} />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Mon activité</Text>
      </View>

      <View style={styles.filterRow}>
        {([
          ['all', 'Tout'],
          ['feed', "Fil d'actualité"],
          ['learning', 'Cours & Quiz'],
        ] as [FilterTab, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterBtnText, filter === key && styles.filterBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
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
        ) : filteredEntries.length > 0 ? (
          <>
            {filteredEntries.map((entry) => {
              const meta = SOURCE_META[entry.source_type] || { label: entry.source_type, icon: 'star-outline' as const };
              const isTappable = !!entry.post_id;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.row, isDarkMode && styles.rowDark]}
                  onPress={() => handlePressEntry(entry)}
                  disabled={!isTappable}
                  activeOpacity={isTappable ? 0.7 : 1}
                >
                  <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name={meta.icon} size={18} color={theme.color.primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, isDarkMode && styles.textDark]}>{meta.label}</Text>
                    <Text style={styles.rowDate}>{formatDate(entry.created_at)}</Text>
                  </View>
                  <Text style={styles.xpText}>+{entry.xp_gained} XP</Text>
                  {isTappable && (
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
            {loadingMore && (
              <View style={styles.loadingMoreBox}>
                <ActivityIndicator size="small" color={theme.color.primary[500]} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="star-outline" size={56} color="#CBD5E1" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Aucune activité pour l'instant
            </Text>
            <Text style={[styles.emptySubtitle, isDarkMode && styles.subTextDark]}>
              Publie, commente ou aide un camarade pour gagner tes premiers XP.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  containerDark: { backgroundColor: theme.color.dark.background.primary },
  content: { padding: 16 },
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  backButtonDark: { backgroundColor: '#374151' },
  topHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: { backgroundColor: theme.color.primary[500] },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: theme.color.primary[500] },
  filterBtnTextActive: { color: '#FFFFFF' },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  loadingMoreBox: { paddingVertical: 20, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
  textDark: { color: '#F8FAFC' },
  subTextDark: { color: '#94A3B8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  rowDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  xpText: { fontSize: 13, fontWeight: '800', color: theme.color.primary[500] },
});
