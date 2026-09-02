// app/(app)/notifications/index.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import {
  getNotifications,
  markNotificationRead,
  AppNotification,
} from '@/services/notifications.service';

const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  post_comment: 'comment-text-outline',
  post_reply: 'reply',
  post_like: 'heart',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const formatDate = (dateString: string) => {
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
  };

  const handlePress = async (notif: AppNotification) => {
    if (!notif.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      await markNotificationRead(notif.id);
    }
    if (notif.data?.post_id) {
      router.push(`/post/${notif.data.post_id}`);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerTitle: 'Notifications', headerBackTitle: 'Retour' }} />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
          </View>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[
                styles.notifCard,
                isDarkMode && styles.notifCardDark,
                !notif.read_at && (isDarkMode ? styles.notifCardUnreadDark : styles.notifCardUnread),
              ]}
              onPress={() => handlePress(notif)}
              activeOpacity={0.8}
            >
              <View style={styles.notifIconWrap}>
                <MaterialCommunityIcons
                  name={ICONS[notif.type] ?? 'bell-outline'}
                  size={20}
                  color={theme.color.primary[500]}
                />
              </View>
              <View style={styles.notifTextCol}>
                <Text style={[styles.notifTitle, isDarkMode && styles.textDark]}>
                  {notif.title}
                </Text>
                <Text style={[styles.notifBody, isDarkMode && styles.subTextDark]}>
                  {notif.body}
                </Text>
                <Text style={styles.notifDate}>{formatDate(notif.created_at)}</Text>
              </View>
              {!notif.read_at && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="bell-outline" size={56} color="#CBD5E1" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Aucune notification
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
  backButtonDark: {
    backgroundColor: '#374151',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 12 },
  textDark: { color: '#F8FAFC' },
  subTextDark: { color: '#94A3B8' },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  notifCardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  notifCardUnread: { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  notifCardUnreadDark: { backgroundColor: '#052e22', borderColor: '#065F46' },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextCol: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  notifBody: { fontSize: 13, color: '#475569', marginTop: 2 },
  notifDate: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.primary[500],
    marginTop: 4,
  },
});
