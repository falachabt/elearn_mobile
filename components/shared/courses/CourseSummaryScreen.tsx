/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import useSWR from 'swr';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { LessonContentViewer } from '@/components/shared/learn/LessonContentViewer';
import { theme } from '@/constants/theme';
import { useAppConfig } from '@/contexts/useAppConfig';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

interface CourseSummaryScreenProps {
  courseId: string;
  isDark: boolean;
  isEnrolled: boolean;
  onBack: () => void;
}

interface CourseSummaryData {
  name: string | null;
  source_content_count: number | null;
  courses?: {
    name?: string | null;
  } | null;
}

export const CourseSummaryScreen = ({
  courseId,
  isDark,
  isEnrolled,
  onBack,
}: CourseSummaryScreenProps) => {
  const { session } = useAuth();
  const { getWebViewUrls } = useAppConfig();
  const webViewUrls = getWebViewUrls();
  const webViewRef = useRef<WebView>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const { data: summary } = useSWR<CourseSummaryData | null>(
    courseId ? `course-summary-screen-${courseId}` : null,
    async () => {
      const { data } = await (supabase as any)
        .from('course_summaries')
        .select('name, source_content_count, courses(name)')
        .eq('course_id', Number(courseId))
        .maybeSingle();
      return data;
    }
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: { data: string }) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'contentLoaded') {
            setIsListening(true);
            setIsWebViewLoaded(true);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const darkModeScript = `(function() {
        function applyDarkMode() {
            if (${isDark}) {
                const container = document.querySelector('.bn-container');
                if (container) {
                    container.classList.add('dark');
                    container.setAttribute('data-color-scheme', 'dark');
                    document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                    document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
                    document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                    document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
                    document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');

                    const style = document.createElement('style');
                    style.textContent = \`
                        body {
                            background-color: #111827;
                            color: #FFFFFF;
                        }
                        .bn-container[data-color-scheme=dark] {
                            --bn-colors-editor-text: #FFFFFF;
                            --bn-colors-editor-background: #111827;
                            --bn-colors-menu-text: #F3F4F6;
                            --bn-colors-menu-background: #1F2937;
                            background-color: #111827;
                            color: #FFFFFF;
                        }
                        .bn-container[data-color-scheme=dark] * {
                            border-color: #374151 !important;
                        }
                    \`;
                    document.head.appendChild(style);
                }
            }
        }

        function checkIfContentLoaded() {
            if (document.readyState === 'complete') {
                applyDarkMode();
                const message = JSON.stringify({ type: 'contentLoaded' });
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(message);
                } else {
                    window.parent.postMessage(message, '*');
                }
            } else {
                setTimeout(checkIfContentLoaded, 100);
            }
        }

        checkIfContentLoaded();
    })();`;

  const title = summary?.name?.trim() || 'Resume du cours';
  const subtitleParts = [summary?.courses?.name || null];
  if (typeof summary?.source_content_count === 'number' && summary.source_content_count > 0) {
    subtitleParts.push(`${summary.source_content_count} source${summary.source_content_count > 1 ? 's' : ''}`);
  }
  const subtitle = subtitleParts.filter(Boolean).join(' • ');

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? '#FFFFFF' : '#111827'}
          />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <ThemedText style={[styles.title, isDark && styles.titleDark]} numberOfLines={1}>
              {title}
            </ThemedText>
            <View style={[styles.badge, isEnrolled ? styles.enrolledBadge : styles.previewBadge]}>
              <MaterialCommunityIcons
                name={isEnrolled ? 'check-circle' : 'eye-outline'}
                size={14}
                color={isEnrolled ? '#10B981' : '#F59E0B'}
              />
              <ThemedText style={isEnrolled ? styles.enrolledText : styles.previewText}>
                {isEnrolled ? 'Inscrit' : 'Aperçu'}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]} numberOfLines={2}>
            {subtitle || 'Synthese du cours'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.contentArea}>
        {!isWebViewLoaded && (
          <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
            <ActivityIndicator size="large" color={isDark ? '#6EE7B7' : '#65B741'} />
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  isDark && styles.progressBarDark,
                  { width: `${loadingProgress * 100}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.loadingText}>Chargement du resume...</ThemedText>
          </View>
        )}

        <LessonContentViewer
          contentId={courseId}
          isDark={isDark}
          baseUrl={webViewUrls?.summary_url}
          session={session}
          webViewRef={webViewRef}
          isWebViewLoaded={isWebViewLoaded}
          darkModeScript={darkModeScript}
          isListening={isListening}
          onLoadProgress={setLoadingProgress}
          onWebViewLoaded={() => setIsWebViewLoaded(true)}
          onContentLoaded={() => setIsListening(true)}
          onScrolledToEnd={() => {}}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginBottom: 65,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#6B7280',
  },
  subtitleDark: {
    color: '#9CA3AF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enrolledBadge: {
    backgroundColor: '#DCFCE7',
  },
  enrolledText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  previewBadge: {
    backgroundColor: '#FEF3C7',
  },
  previewText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    zIndex: 10,
  },
  loadingContainerDark: {
    backgroundColor: '#111827',
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#65B741',
  },
  progressBarDark: {
    backgroundColor: '#059669',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#6B7280',
  },
});




