import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Image,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { theme } from '@/constants/theme';
import { useNewsById, useNewsInteraction } from '@/hooks/useNews';
import { useAuth } from '@/contexts/auth';

export default function NewsDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user } = useAuth();
  const { news, isLoading } = useNewsById(id);
  const { recordView } = useNewsInteraction(id, user?.id || '');
  const hasRecordedView = useRef(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  
  const videoPlayer = useVideoPlayer(
    news?.media_type === 'video' && news?.media_url ? news.media_url : '',
    (player) => {
      player.loop = false;
    }
  );

  useEffect(() => {
    if (news && !hasRecordedView.current) {
      recordView();
      hasRecordedView.current = true;
    }
  }, [news, recordView]);

  const handleVideoPress = () => {
    setShowVideoPlayer(true);
    videoPlayer.play();
  };

  const handleCloseVideo = () => {
    videoPlayer.pause();
    setShowVideoPlayer(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark, styles.centered]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </SafeAreaView>
    );
  }

  if (!news) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark, styles.centered]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <MaterialCommunityIcons name="alert-circle" size={48} color={isDark ? '#666' : '#CCC'} />
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          Actualité introuvable
        </Text>
      </SafeAreaView>
    );
  }

  const renderContent = () => {
    const content = news.content || news.description || '';
    
    if (Platform.OS === 'web') {
      return (
        <View style={styles.contentContainer}>
          <div
            style={{
              fontFamily: theme.typography.fontFamily,
              fontSize: 16,
              lineHeight: 1.6,
              color: isDark ? '#E5E7EB' : '#374151',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </View>
      );
    }

    const WebView = require('react-native-webview').WebView;
    const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: ${isDark ? '#E5E7EB' : '#374151'};
          background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
          padding: 0; /* Supprime le padding du body */
          margin: 0; /* Supprime la marge du body */
        }
        /* Ajoute un conteneur pour le contenu avec un padding interne */
        .content {
          padding: 0px;
        }
        img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
        }
        p {
          margin-bottom: 12px;
        }
        h1, h2, h3 {
          margin: 16px 0 8px;
          color: ${isDark ? '#FFFFFF' : '#111827'};
        }
        a {
          color: ${theme.color.primary[500]};
        }
        ul, ol {
          margin-left: 20px;
          margin-bottom: 12px;
        }
      </style>
    </head>
    <body>
      <div class="content">${content}</div>
    </body>
  </html>
`;

    return (
      <View style={styles.contentContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={[styles.webview, { backgroundColor: isDark ? theme.color.dark.background.secondary : '#FFFFFF' }]}
          scrollEnabled={true}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.headerBar, isDark && styles.headerBarDark]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]} numberOfLines={1}>
          Actualité
        </Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {news.media_type !== 'none' && news.media_url && (
          <TouchableOpacity 
            style={styles.mediaContainer}
            onPress={news.media_type === 'video' ? handleVideoPress : undefined}
            activeOpacity={news.media_type === 'video' ? 0.8 : 1}
          >
            <Image
              source={{ uri: news.media_type === 'video' && news.thumbnail_url ? news.thumbnail_url : news.media_url }}
              style={styles.media}
              resizeMode="cover"
            />
            {news.media_type === 'video' && (
              <View style={styles.videoOverlay}>
                <View style={styles.playButton}>
                  <MaterialCommunityIcons name="play" size={40} color="#FFFFFF" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          {news.category && (
            <Text style={[styles.category, { color: theme.color.primary[500] }]}>
              {news.category.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.title, isDark && styles.titleDark]}>{news.title}</Text>
          {news.subtitle && (
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{news.subtitle}</Text>
          )}
          
          <View style={styles.meta}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="eye-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.statText, isDark && styles.statTextDark]}>{news.view_count}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.statText, isDark && styles.statTextDark]}>
                {new Date(news.published_at || news.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
        </View>

        {(news.content || news.description) && renderContent()}
      </ScrollView>

      <Modal
        visible={showVideoPlayer}
        animationType="fade"
        onRequestClose={handleCloseVideo}
        statusBarTranslucent
      >
        <View style={styles.videoModal}>
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseVideo}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <VideoView
            style={styles.videoPlayer}
            player={videoPlayer}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBarDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderBottomColor: '#374151',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: theme.typography.fontFamily,
    flex: 1,
    textAlign: 'center',
  },
  headerTitleDark: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mediaContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    fontFamily: theme.typography.fontFamily,
  },
  subtitleDark: {
    color: '#9CA3AF',
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: theme.typography.fontFamily,
  },
  statTextDark: {
    color: '#9CA3AF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    flex: 1,
  },
  webview: {
    flex: 1,
    minHeight: 300,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
  },
  errorTextDark: {
    color: '#9CA3AF',
  },
  videoModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
});
