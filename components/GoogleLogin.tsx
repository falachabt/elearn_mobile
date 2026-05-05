import React, { useState } from 'react';
import { Alert, TouchableOpacity, Platform} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import {supabase} from "@/lib/supabase";
import { logger } from '@/utils/logger';

// Register for redirect URI handling
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthProps {
    onAuthSuccess?: () => void;
    children?: React.ReactNode;
}

export default function GoogleAuth({ onAuthSuccess, children }: GoogleAuthProps) {
    const [loading, setLoading] = useState<boolean>(false);

    const redirectUri = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback')
        : 'com.ezadrive.elearn://auth/callback';

    logger.log('[GoogleAuth] Redirect URI:', redirectUri);

    const signInWithGoogle = async (): Promise<void> => {
        try {
            setLoading(true);

            // Get authentication URL from Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                },
            });

            if (error) throw error;

            if (!data?.url) throw new Error('No authentication URL returned');

            logger.log('[GoogleAuth] Opening auth URL:', data.url);

            // On web, do a direct redirect — openAuthSessionAsync doesn't return a result on web
            if (Platform.OS === 'web') {
                window.location.href = data.url;
                return;
            }

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            logger.log('[GoogleAuth] Browser result:', result);

            if (result.type === 'success') {
                const url = result.url;
                logger.log('[GoogleAuth] Callback URL:', url);

                // Extraire les tokens ou le code OAuth depuis l'URL de callback
                let accessToken: string | null = null;
                let refreshToken: string | null = null;
                let code: string | null = null;

                try {
                    const parsedUrl = new URL(url);
                    code = parsedUrl.searchParams.get('code');

                    // Tokens dans le hash fragment (#access_token=...&refresh_token=...)
                    if (parsedUrl.hash) {
                        const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
                        accessToken = hashParams.get('access_token');
                        refreshToken = hashParams.get('refresh_token');
                    }

                    // Tokens dans les query params (?access_token=...&refresh_token=...)
                    if (!accessToken) {
                        accessToken = parsedUrl.searchParams.get('access_token');
                        refreshToken = parsedUrl.searchParams.get('refresh_token');
                    }
                } catch (parseError) {
                    logger.error('[GoogleAuth] Error parsing callback URL:', parseError);
                }

                if (code) {
                    logger.log('[GoogleAuth] Exchanging authorization code for session');

                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        logger.error('[GoogleAuth] Error exchanging code for session:', exchangeError);
                        throw exchangeError;
                    }

                    logger.log('[GoogleAuth] Session created from authorization code');
                    if (onAuthSuccess) {
                        onAuthSuccess();
                    }
                } else if (accessToken && refreshToken) {
                    logger.log('[GoogleAuth] Setting session with tokens from callback URL');
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        logger.error('[GoogleAuth] Error setting session:', sessionError);
                        throw sessionError;
                    }

                    logger.log('[GoogleAuth] Session set successfully');
                    if (onAuthSuccess) {
                        onAuthSuccess();
                    }
                } else {
                    // Pas de tokens dans l'URL, attendre que Supabase traite le deep link
                    logger.log('[GoogleAuth] No tokens in URL, polling for session...');
                    let foundUser = null;
                    for (let i = 0; i < 5; i++) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        const { data: { user }, error: userError } = await supabase.auth.getUser();
                        if (userError) { logger.error('[GoogleAuth] Error getting user:', userError); throw userError; }
                        if (user) { foundUser = user; break; }
                    }
                    logger.log('[GoogleAuth] User after polling:', foundUser ? 'Found' : 'Not found');
                    if (foundUser && onAuthSuccess) {
                        onAuthSuccess();
                    } else if (!foundUser) {
                        throw new Error('Auth session missing!');
                    }
                }
            } else if (result.type === 'cancel') {
                logger.log('[GoogleAuth] User cancelled authentication');
            } else if (result.type === 'dismiss') {
                logger.log('[GoogleAuth] Browser dismissed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            Alert.alert('Authentication Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={signInWithGoogle}
            disabled={loading}
            style={{opacity: loading ? 0.5 : 1, flex: 1, ...(Platform.OS === 'web' && {height: 40})}}
        >
            {children}
        </TouchableOpacity>
    );
}
