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

      const code = getParamValue(params.code);

      if (code) {
        logger.log('[OAuthCallback] Exchanging authorization code for session');

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          logger.error('[OAuthCallback] Code exchange error:', exchangeError);
          throw exchangeError;
        }
      }

      // Vérifier si on a déjà une session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error('[OAuthCallback] Session error:', sessionError);
        throw sessionError;
      }

      if (session) {
        logger.log('[OAuthCallback] Session found, redirecting to app');
        // Rediriger vers l'app
        router.replace('/(app)');
      } else {
        // Attendre un peu et réessayer
        logger.log('[OAuthCallback] No session yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: { session: retrySession } } = await supabase.auth.getSession();
        
        if (retrySession) {
          logger.log('[OAuthCallback] Session found after retry, redirecting');
          router.replace('/(app)');
        } else {
          logger.error('[OAuthCallback] No session found after retry');
          throw new Error('Authentication failed - no session created');
        }
      }
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
