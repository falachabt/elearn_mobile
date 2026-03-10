import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  useColorScheme,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { News } from '@/types/news.type';
import { theme } from '@/constants/theme';
import { useNewsInteraction } from '@/hooks/useNews';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

interface NewsItemProps {
  news: News;
  userId: string;
  onPress?: (news: News) => void;
}


const NewsItem: React.FC<NewsItemProps> = ({ news, userId, onPress }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { trigger } = useHaptics();
  const { recordView, recordClick } = useNewsInteraction(news.id, userId);
  const hasRecordedView = useRef(false);
  const [, setImageLoadError] = React.useState(false);

  const getActionIcon = () => {
    if (news.action_type === 'none') return null;
    
    // Si c'est un lien profond ou externe, on essaie de détecter le réseau social
    const url = news.action_data?.deepLink || news.action_data?.url || '';
    const lowUrl = url.toLowerCase();
    
    if (lowUrl.includes('wa.me') || lowUrl.includes('whatsapp.com')) return 'whatsapp';
    if (lowUrl.includes('facebook.com') || lowUrl.includes('fb.watch') || lowUrl.includes('fb.me')) return 'facebook';
    if (lowUrl.includes('instagram.com')) return 'instagram';
    if (lowUrl.includes('tiktok.com')) return 'tiktok';
    if (lowUrl.includes('youtube.com') || lowUrl.includes('youtu.be')) return 'youtube';
    if (lowUrl.includes('t.me') || lowUrl.includes('telegram.org')) return 'telegram';
    if (lowUrl.includes('twitter.com') || lowUrl.includes('x.com')) return 'twitter';
    
    return news.action_type === 'detail_page' ? 'eye' : 'chevron-right';
  };

  useEffect(() => {
    if (!hasRecordedView.current && !news.has_viewed) {
      recordView();
      hasRecordedView.current = true;
    }
  }, [news.has_viewed, recordView]);

  const handlePress = async () => {
    trigger(HapticType.LIGHT);
    await recordClick();

    if (onPress) {
      onPress(news);
      return;
    }

    switch (news.action_type) {
      case 'internal_page':
        if (news.action_data?.route) {
          router.push(news.action_data.route as never);
        }
        break;
      case 'external_link':
        if (news.action_data?.url) {
          Linking.openURL(news.action_data.url);
        }
        break;
      case 'detail_page':
        router.push(`/news/${news.id}` as never);
        break;
      case 'deep_link':
        if (news.action_data?.deepLink) {
          Linking.openURL(news.action_data.deepLink);
        }
        break;
    }
  };

  const renderBadge = () => {
    if (!news.show_badge) return null;
    return (
      <View style={[styles.badge, { backgroundColor: news.badge_color || theme.color.primary[500] }]}>
        <Text style={styles.badgeText}>{news.badge_text || 'Nouveau'}</Text>
      </View>
    );
  };

  const renderMedia = () => {
    const imageUrl = news.media_url 
      ? (news.media_type === 'video' && news.thumbnail_url ? news.thumbnail_url : news.media_url)
      : null;

    // Vérifier si l'URL est valide (non vide et non juste des espaces)
    const hasValidImage = imageUrl && imageUrl.trim().length > 0;

    return (
      <View style={styles.mediaContainer}>
        {hasValidImage ? (
          <>
            <Image
              source={{ uri: imageUrl }}
              style={styles.media}
              resizeMode="cover"
              onError={() => setImageLoadError(true)}
            />
            {news.media_type === 'video' && (
              <View style={styles.videoOverlay}>
                <View style={styles.playButton}>
                  <MaterialCommunityIcons name="play" size={32} color="#FFFFFF" />
                </View>
                {news.video_duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {Math.floor(news.video_duration / 60)}:{String(news.video_duration % 60).padStart(2, '0')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={[
            styles.placeholderMedia, 
            { backgroundColor: isDark ? '#2D3748' : '#E5E7EB' }
          ]}>
            <Image 
              source={require('@/assets/images/icon.png')}
              style={styles.placeholderImage}
              resizeMode="cover"
            />
          </View>
        )}
        {renderBadge()}
      </View>
    );
  };

  const backgroundColor = news.background_color || (isDark ? theme.color.dark.background.secondary : '#FFFFFF');
  const textColor = news.text_color || (isDark ? '#FFFFFF' : '#111827');

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        isDark && styles.cardDark,
        pressed && styles.cardPressed,
      ]}
    >
      {renderMedia()}
      <View style={styles.content}>
        {news.category && (
          <Text style={[styles.category, { color: theme.color.primary[500] }]}>
            {news.category.toUpperCase()}
          </Text>
        )}
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {news.title}
        </Text>
        {news.subtitle && (
          <Text style={[styles.subtitle, { color: isDark ? '#CCCCCC' : '#6B7280' }]} numberOfLines={1}>
            {news.subtitle}
          </Text>
        )}
        {news.description && (
          <Text style={[styles.description, { color: isDark ? '#CCCCCC' : '#6B7280' }]} numberOfLines={2}>
            {news.description}
          </Text>
        )}
        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="eye-outline" size={14} color={isDark ? '#CCCCCC' : '#6B7280'} />
              <Text style={[styles.statText, { color: isDark ? '#CCCCCC' : '#6B7280' }]}>{news.view_count}</Text>
            </View>
            {news.click_count > 0 && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="cursor-pointer" size={14} color={isDark ? '#CCCCCC' : '#6B7280'} />
                <Text style={[styles.statText, { color: isDark ? '#CCCCCC' : '#6B7280' }]}>{news.click_count}</Text>
              </View>
            )}
          </View>
          
          {news.action_type !== 'none' && (
            <View style={styles.actionContainer}>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>
                  {news.action_data?.label || (news.action_type === 'detail_page' ? 'Lire la suite' : 'En savoir plus')}
                </Text>
                <MaterialCommunityIcons 
                  name={getActionIcon() as any} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    height: '100%',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.05,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    marginTop: 8,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
    fontFamily: theme.typography.fontFamily,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.primary[500],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily,
  },
});

export default NewsItem;
