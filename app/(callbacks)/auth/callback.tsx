/**
 * OAuth Callback Handler
 * 
 * This screen handles the OAuth callback when users return from external
 * authentication providers (Google, Apple, etc.)
 * 
 * Deep link: com.ezadrive.elearn://auth/callback
 */


import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const getParamValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      logger.log('[OAuthCallback] Params received:', params);

      let code = getParamValue(params.code);
      let accessToken = getParamValue(params.access_token);
      let refreshToken = getParamValue(params.refresh_token);

      // On Web, extract from window.location (both search query and hash fragment)
      if (typeof window !== 'undefined') {
        if (window.location.search) {
          const searchParams = new URLSearchParams(window.location.search);
          code = code || searchParams.get('code');
          accessToken = accessToken || searchParams.get('access_token');
          refreshToken = refreshToken || searchParams.get('refresh_token');
        }
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          code = code || hashParams.get('code');
          accessToken = accessToken || hashParams.get('access_token');
          refreshToken = refreshToken || hashParams.get('refresh_token');
        }
      }

      if (code) {
        logger.log('[OAuthCallback] Exchanging authorization code for session');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          logger.warn('[OAuthCallback] Code exchange error (may already be exchanged):', exchangeError);
        }
      } else if (accessToken && refreshToken) {
        logger.log('[OAuthCallback] Setting session from tokens');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          logger.warn('[OAuthCallback] Set session error:', sessionError);
        }
      }

      // Check session immediately and poll if needed (up to 5 attempts)
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.log('[OAuthCallback] Session found, redirecting to app');
          router.replace('/(app)');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      throw new Error('Authentication failed - no session created');
    } catch (error) {
      logger.error('[OAuthCallback] Error:', error);
      // Rediriger vers login avec erreur
      router.replace({
        pathname: '/(auth)/login',
        params: { 
          error: error instanceof Error ? error.message : 'Authentication failed' 
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.color.primary[500]} />
      <ThemedText style={styles.text}>
        Connexion en cours...
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    marginTop: 16,
  },
});
