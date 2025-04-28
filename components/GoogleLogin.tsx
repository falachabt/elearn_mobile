import React, { useState } from 'react';
import {Button, Alert, TouchableOpacity} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import {supabase} from "@/lib/supabase";


// Register for redirect URI handling
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthProps {
    onAuthSuccess?: () => void;
    children?: React.ReactNode;
}

export default function GoogleAuth({ onAuthSuccess, children }: GoogleAuthProps) {
    const [loading, setLoading] = useState<boolean>(false);

    // Get redirect URI for this app
    const redirectUri = makeRedirectUri({
        // This should match the scheme you've set in app.json
        scheme: 'com.ezadrive.elearn', // Replace with your app's URL scheme
        path: 'auth',
    });

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

            // Open browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            if (result.type === 'success') {
                // The session will be automatically updated by Supabase client
                // Check if we have a user now
                const { data: { user } } = await supabase.auth.getUser();

                if (user && onAuthSuccess) {
                    onAuthSuccess();
                }
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
            style={{ opacity: loading ? 0.5 : 1, width: '100%' }}
        >
            {children}
        </TouchableOpacity>
    );
}