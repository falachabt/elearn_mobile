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
            setIsAccountCreating(true);

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
                        }

                        // Force revalidation of user data
                        await mutateUser();

                        if (onAuthSuccess) {
                            onAuthSuccess();
                        }
                    } else {
                        // On mobile, the DeepLinkHandler will process the deep link URL
                        // and call supabase.auth.setSession() with the tokens from the URL
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
                        
                        if (session?.access_token) {
                            // Session established, the DeepLinkHandler should have created the account
                            // Just force revalidation
                            await mutateUser();
                            
                            logger.info('Google login successful (mobile, session established)');
                            
                            if (onAuthSuccess) {
                                onAuthSuccess();
                            }
                        } else {
                            // Session not established within timeout
                            // The DeepLinkHandler might still be processing or there was an error
                            logger.error('Session not established after OAuth redirect on mobile');
                            throw new Error('Authentication timed out. Please try again.');
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
            setIsAccountCreating(false);
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