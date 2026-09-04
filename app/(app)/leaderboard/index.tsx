// app/(app)/leaderboard/index.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { getLeaderboard, LeaderboardEntry } from '@/services/feed.service';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user: authUser } = useAuth();

  const [scope, setScope] = useState<'global' | 'track'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const myTrack = authUser?.gradelevel || null;

  useEffect(() => {
    setLoading(true);
    getLeaderboard(scope === 'track' ? myTrack : null).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [scope, myTrack]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerTitle: 'Classement', headerBackTitle: 'Retour' }} />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Classement</Text>
      </View>

      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.scopeBtn, scope === 'global' && styles.scopeBtnActive]}
          onPress={() => setScope('global')}
        >
          <Text style={[styles.scopeBtnText, scope === 'global' && styles.scopeBtnTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeBtn, scope === 'track' && styles.scopeBtnActive]}
          onPress={() => setScope('track')}
          disabled={!myTrack}
        >
          <Text
            style={[
              styles.scopeBtnText,
              scope === 'track' && styles.scopeBtnTextActive,
              !myTrack && styles.scopeBtnTextDisabled,
            ]}
          >
            Ma filière{myTrack ? ` (${myTrack})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
          </View>
        ) : entries.length > 0 ? (
          entries.map((entry, idx) => {
            const isMe = entry.id === authUser?.id;
            return (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  isDarkMode && styles.rowDark,
                  isMe && (isDarkMode ? styles.rowMeDark : styles.rowMe),
                ]}
              >
                <View style={styles.rankCol}>
                  {idx < 3 ? (
                    <MaterialCommunityIcons name="trophy" size={20} color={MEDAL_COLORS[idx]} />
                  ) : (
                    <Text style={[styles.rankText, isDarkMode && styles.textDark]}>{idx + 1}</Text>
                  )}
                </View>

                {entry.avatar_url ? (
                  <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(entry.full_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <Text style={[styles.name, isDarkMode && styles.textDark]} numberOfLines={1}>
                  {entry.full_name || 'Élève'}{isMe ? ' (toi)' : ''}
                </Text>

                <Text style={styles.xpText}>{entry.total_xp} XP</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="trophy-outline" size={56} color="#CBD5E1" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Aucun classement pour l'instant
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
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  scopeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  scopeBtnActive: { backgroundColor: theme.color.primary[500] },
  scopeBtnText: { fontSize: 13, fontWeight: '600', color: theme.color.primary[500] },
  scopeBtnTextActive: { color: '#FFFFFF' },
  scopeBtnTextDisabled: { color: '#CBD5E1' },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 12 },
  textDark: { color: '#F8FAFC' },
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
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.color.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: theme.color.primary[600] },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  xpText: { fontSize: 13, fontWeight: '700', color: theme.color.primary[500] },
});
