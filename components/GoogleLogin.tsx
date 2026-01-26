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
    const redirectUri = makeRedirectUri({
        // This should match the scheme you've set in app.json
        scheme: 'com.ezadrive.elearn', // Replace with your app's URL scheme
        path: 'auth',
    });

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
                    // Get the session after authentication
                    const { data: { session } } = await supabase.auth.getSession();
                    
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

                        logger.info('Google login successful, account created');
                    } catch (apiError) {
                        logger.error('Error creating account after Google login:', apiError);
                        // If account already exists (user logging in), that's okay
                        // Just continue
                    }

                    // Force revalidation of user data
                    await mutateUser();

                    if (onAuthSuccess) {
                        onAuthSuccess();
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