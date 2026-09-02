// components/shared/feed/UserProfileBottomSheet.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { getUserPublicProfile, PublicUserInfo } from '@/services/feed.service';

interface UserProfileBottomSheetProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const UserProfileBottomSheet: React.FC<UserProfileBottomSheetProps> = ({
  visible,
  userId,
  onClose,
  isDarkMode = false,
}) => {
  const [profile, setProfile] = useState<PublicUserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    setLoading(true);
    getUserPublicProfile(userId).then((data) => {
      if (!cancelled) {
        setProfile(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const name = profile?.full_name || 'Élève';
  const avatarUrl = profile?.avatar_url;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      propagateSwipe
    >
      <View style={[styles.sheet, isDarkMode && styles.sheetDark]}>
        <View style={styles.handle} />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
          </View>
        ) : (
          <>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.name, isDarkMode && styles.textDark]}>{name}</Text>
            <Text style={styles.subtitle}>Membre de la communauté Elearn</Text>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                <MaterialCommunityIcons name="star" size={22} color="#F59E0B" />
                <Text style={[styles.statValue, isDarkMode && styles.textDark]}>
                  {profile?.total_xp ?? 0}
                </Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>

              <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                <MaterialCommunityIcons name="fire" size={22} color="#EF4444" />
                <Text style={[styles.statValue, isDarkMode && styles.textDark]}>
                  {profile?.current_streak ?? 0}
                </Text>
                <Text style={styles.statLabel}>Série</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.border.radius.large,
    borderTopRightRadius: theme.border.radius.large,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
    minHeight: 280,
  },
  sheetDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  loadingBox: {
    paddingVertical: 60,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 20,
  },
  textDark: {
    color: '#F8FAFC',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.border.radius.medium,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statCardDark: {
    backgroundColor: '#1E293B',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
