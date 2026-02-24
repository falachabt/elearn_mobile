import React, { useState } from 'react';
import { Alert, TouchableOpacity, Platform} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

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

    // Get redirect URI for this app
    // Pour mobile natif, utiliser le package name comme scheme
    const redirectUri = Platform.select({
        // Mobile natif: utiliser le deep link avec le package name
        native: 'com.ezadrive.elearn://auth/callback',
        // Web: utiliser l'URL du site
        default: makeRedirectUri({
            scheme: 'https',
        }),
    });

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

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            logger.log('[GoogleAuth] Browser result:', result);

            if (result.type === 'success') {
                // Attendre un peu pour que Supabase traite le callback
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Vérifier si on a un user maintenant
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                logger.log('[GoogleAuth] User after auth:', user ? 'Found' : 'Not found');

                if (userError) {
                    logger.error('[GoogleAuth] Error getting user:', userError);
                    throw userError;
                }

                if (user && onAuthSuccess) {
                    onAuthSuccess();
                } else if (!user) {
                    throw new Error('Authentication succeeded but no user found');
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