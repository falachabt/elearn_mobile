import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const SOURCE_LABELS: Record<string, string> = {
  feed_post: 'Publication créée',
  feed_comment: 'Commentaire ajouté',
  feed_like: 'Like reçu',
  feed_best_answer: 'Meilleure réponse !',
  quiz: 'Quiz complété',
  exam: 'Examen complété',
};

/**
 * Écoute en temps réel les gains XP de l'utilisateur courant (insertions
 * dans xp_history, déjà dans la publication realtime) et affiche un toast
 * "+X XP" par-dessus l'écran actif, quel qu'il soit. Tap -> "Mon activité".
 */
export default function XpToastManager() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<{ xp: number; label: string } | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`xp-toast-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_history',
          filter: `userid=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { xp_gained?: number; source_type?: string };
          if (!row.xp_gained) return;
          showToast(row.xp_gained, SOURCE_LABELS[row.source_type || ''] || 'XP gagné');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const showToast = (xp: number, label: string) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setToast({ xp, label });

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();

    hideTimeout.current = setTimeout(() => hideToast(), 3500);
  };

  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setToast(null));
  };

  const handlePress = () => {
    hideToast();
    router.push('/profile/my-activity' as any);
  };

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: (Platform.OS === 'android' ? insets.top : insets.top) + 8, transform: [{ translateY }] }]}
    >
      <TouchableOpacity style={styles.toast} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>+{toast.xp} XP</Text>
          <Text style={styles.subtitle}>{toast.label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.color.primary[600] ?? theme.color.primary[500],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
