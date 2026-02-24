import React, {useEffect} from 'react';
import {Linking} from 'react-native';
import {useRouter} from "expo-router";

import {supabase} from '@/lib/supabase';
import { logger } from '@/utils/logger';


// Define prop types for the component
interface AuthDeepLinkHandlerProps {
    // Optional callback when auth is successfully processed
    onAuthSuccess?: () => void;
    // Optional callback when auth fails
    onAuthError?: (error: Error) => void;
}

/**
 * Component that handles deep link authentication callbacks
 */
const AuthDeepLinkHandler: React.FC<AuthDeepLinkHandlerProps> = ({onAuthSuccess, onAuthError}) => {

    const router = useRouter();

    useEffect(() => {
        // Handler function to process deep link URLs
        const handleDeepLink = async (url: string) => {
            // Check if this is an auth callback URL (either with /callback or just #)
            if (url && (url.includes('auth/callback') || url.includes('auth#'))) {
                try {
                    // Parse the URL and extract parameters
                    const parsedURL = new URL(url);

                    // Handle both query params and hash fragments
                    let params: Record<string, string> = {};

                    if (url.includes('auth#')) {
                        // Handle hash fragment (#) format
                        const hashParams = parsedURL.hash.substring(1); // Remove the # character
                        hashParams.split('&').forEach(param => {
                            const [key, value] = param.split('=');
                            if (key && value) {
                                params[key] = decodeURIComponent(value);
                            }
                        });
                    } else {
                        // Handle query parameter (?) format
                        params = Object.fromEntries(parsedURL.searchParams.entries());
                    }

                    // If there's a code/token, process the authentication
                    if (params.access_token || params.refresh_token || params.code) {
                        if (params.access_token && params.refresh_token) {
                            // Direct token exchange (more common with OAuth)
                            const { error } = await supabase.auth.setSession({
                                access_token: params.access_token,
                                refresh_token: params.refresh_token,
                            });

                            if (error) {
                                logger.error('Error setting session:', error);
                                onAuthError?.(new Error(`Failed to set session: ${error.message}`));
                            } else {
                                onAuthSuccess?.();
                            }
                        } else {
                            logger.error('Missing tokens in callback URL:', params);
                            onAuthError?.(new Error('Missing access or refresh token in callback URL'));
                        }
                    }
                } catch (error) {
                    logger.error('Error processing deep link:', error);
                    onAuthError?.(error instanceof Error ? error : new Error('Unknown deep link error'));
                }
            } else if (url && (url.includes("payment/callback") || url.includes("payment-callback"))) {
                try {
                    // Parse the URL and extract payment parameters
                    const parsedURL = new URL(url);
                    const params = Object.fromEntries(parsedURL.searchParams.entries());

                    // Redirect to the payment callback page with the parameters
                    if(params?.status === "complete"){
                    // Navigate to the payment callback page

                    router.replace({
                        pathname: "/(callbacks)/payment",
                    });

                    }else {
                    router.replace({
                        pathname: "/(callbacks)/payment_failed"
                    });

                    }



                } catch (error) {
                    logger.error('Error processing payment callback:', error);
                    // Fallback to learn page if there's an error
                    router.replace("/(app)/learn");
                }
            }
        };

        // Set up listener for deep links when app is already open
        const subscription = Linking.addEventListener('url', ({url}) => {
            handleDeepLink(url);
        });

        // Check for deep links that opened the app
        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink(url);
            }
        });

        // Clean up on unmount
        return () => {
            subscription.remove();
        };
    }, [onAuthSuccess, onAuthError, router]);

    // This component doesn't render anything
    return null;
};

export default AuthDeepLinkHandler;
