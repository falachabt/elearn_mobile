import React, { useState } from 'react';
import {Button, Alert, TouchableOpacity, Platform} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import axios from 'axios';

import {supabase} from "@/lib/supabase";
import {useAuth} from "@/contexts/auth";
import {useAppConfig} from "@/contexts/useAppConfig";
import {logger} from "@/utils/logger";


// Register for redirect URI handling
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthProps {
    onAuthSuccess?: () => void;
    children?: React.ReactNode;
}

export default function GoogleAuth({ onAuthSuccess, children }: GoogleAuthProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const {setIsAccountCreating, mutateUser} = useAuth();
    const {getApiBaseUrl} = useAppConfig();
    const apiBaseUrl = getApiBaseUrl();

    // Get redirect URI for this app
    // On web: returns https://app.elearnprepa.com/auth
    // On mobile: returns myapp://auth
    const redirectUri = makeRedirectUri({
        scheme: Platform.OS === 'web' ? undefined : 'myapp', // Match scheme in app.json for mobile
        path: 'auth',
    });

    logger.info('Google OAuth redirect URI:', redirectUri, 'Platform:', Platform.OS);

    const signInWithGoogle = async (): Promise<void> => {
        try {
            setLoading(true);
            // Only set isAccountCreating for web platform
            // On mobile, DeepLinkHandler will manage this flag
            if (Platform.OS === 'web') {
                setIsAccountCreating(true);
            }

            // Get authentication URL from Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                },
            });

            if (error) throw error;

            if (!data?.url) throw new Error('No authentication URL returned');

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            if (result.type === 'success') {
                try {
                    // Platform-specific handling
                    if (Platform.OS === 'web') {
                        // On web, Supabase automatically processes the URL hash with access_token
                        // Poll for session to be established (max 5 seconds)
                        let session = null;
                        let attempts = 0;
                        const maxAttempts = 10; // 10 attempts * 500ms = 5 seconds max
                        
                        while (!session && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            const { data: { session: currentSession } } = await supabase.auth.getSession();
                            session = currentSession;
                            attempts++;
                        }
                        
                        if (!session?.access_token) {
                            throw new Error('No session created after Google authentication');
                        }

                        // Get user data
                        const { data: userData } = await supabase.auth.getUser();

                        // Create account in the database
                        try {
                            await axios.post(
                                `${apiBaseUrl}/api/mobile/auth/createAccount`,
                                {
                                    email: userData?.user?.email,
                                    phone: userData?.user?.phone
                                },
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session.access_token}`
                                    },
                                    timeout: 10000,
                                }
                            );

                            logger.info('Google login successful, account created (web)');
                        } catch (apiError) {
                            logger.error('Error creating account after Google login:', apiError);
                            // If account already exists (user logging in), that's okay
                            // Continue to polling to verify account exists
                        }

                        // Wait for account to be available in database (with polling)
                        // This handles cases where database triggers are slow or broken
                        logger.info('Polling for account data availability (web)...');
                        let accountExists = false;
                        let pollAttempts = 0;
                        const maxPollAttempts = 10; // 10 attempts * 1 second = 10 seconds max
                        
                        while (!accountExists && pollAttempts < maxPollAttempts) {
                            try {
                                // Try to fetch user data via mutateUser
                                const result = await mutateUser();
                                if (result && result.id) {
                                    accountExists = true;
                                    logger.info('Account data found after', pollAttempts + 1, 'attempts (web)');
                                    break;
                                }
                            } catch (pollError) {
                                // Account not ready yet, continue polling
                                logger.debug('Account not yet available, attempt', pollAttempts + 1, '(web)');
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            pollAttempts++;
                        }
                        
                        if (!accountExists) {
                            logger.error('Account data not available after polling (web). Database trigger may be broken.');
                            // Still continue to clear the flag to prevent infinite loading
                            // The 30-second timeout in auth context will also help
                        } else {
                            // Force one final revalidation to ensure latest data
                            await mutateUser();
                        }


                        if (onAuthSuccess) {
                            onAuthSuccess();
                        }
                    } else {
                        // On mobile, the DeepLinkHandler will process the deep link URL
                        // We don't need to do anything here - just let the deep link handler
                        // manage the session, account creation, and isAccountCreating flag
                        logger.info('Google OAuth redirect completed on mobile, waiting for deep link handler');
                        
                        // Call onAuthSuccess to signal OAuth step is complete
                        // The actual session/account will be handled by DeepLinkHandler
                        if (onAuthSuccess) {
                            onAuthSuccess();
                        }
                    }
                } catch (postAuthError) {
                    logger.error('Error in post-authentication process:', postAuthError);
                    throw postAuthError;
                }
            } else if (result.type === 'cancel') {
                logger.info('User canceled Google sign-in');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            logger.error('Google authentication error:', error);
            Alert.alert(
                'Erreur de connexion',
                'Une erreur est survenue lors de la connexion avec Google. Veuillez réessayer.'
            );
        } finally {
            setLoading(false);
            // Only clear isAccountCreating on web
            // On mobile, DeepLinkHandler manages this flag
            if (Platform.OS === 'web') {
                setIsAccountCreating(false);
            }
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