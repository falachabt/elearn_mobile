import React, {useEffect} from 'react';
import {Linking} from 'react-native';
import axios from "axios";
import {useRouter} from "expo-router";

import {supabase} from '@/lib/supabase';
import {useAppConfig} from "@/contexts/useAppConfig";
import {useAuth} from "@/contexts/auth";
import {logger} from "@/utils/logger";


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
    const {getApiBaseUrl} = useAppConfig();
    const apiBaseUrl = getApiBaseUrl();
    const {setIsAccountCreating, mutateUser} = useAuth();

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
                            try {
                                // Set the account creating flag to keep loading state active
                                setIsAccountCreating(true);
                                
                                // Direct token exchange (more common with OAuth)
                                const {error} = await supabase.auth.setSession({
                                    access_token: params.access_token,
                                    refresh_token: params.refresh_token,
                                });

                                if (error) {
                                    logger.error('Error setting session:', error);
                                    onAuthError?.(new Error(`Failed to set session: ${error.message}`));
                                    setIsAccountCreating(false);
                                    return;
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
                                                'Authorization': `Bearer ${params.access_token}`
                                            },
                                            timeout: 10000, // 10 seconds timeout (increased from 1500ms)
                                        }
                                    );

                                    logger.info('Account created successfully via deep link');
                                } catch (apiError: any) {
                                    logger.error('Error creating account via deep link:', apiError);
                                    // Check if this is a "user already exists" error (HTTP 409 or similar)
                                    // If so, it's okay for existing users logging in
                                    // For other errors, we still continue but log them prominently
                                    const isUserExistsError = apiError?.response?.status === 409 || 
                                                             apiError?.response?.status === 400 ||
                                                             apiError?.message?.includes('already exists');
                                    
                                    if (!isUserExistsError) {
                                        logger.warn('Account creation failed with unexpected error, continuing anyway:', apiError);
                                    }
                                }

                                // Force revalidation of user data
                                await mutateUser();
                                
                                // Clear the account creating flag
                                setIsAccountCreating(false);
                                
                                onAuthSuccess?.();
                            } catch (deepLinkError) {
                                logger.error('Error processing deep link auth:', deepLinkError);
                                setIsAccountCreating(false);
                                const errorMessage = deepLinkError instanceof Error 
                                    ? deepLinkError 
                                    : new Error(`Deep link processing failed: ${String(deepLinkError)}`);
                                onAuthError?.(errorMessage);
                            }
                        } else if (params.code) {
                            // Some providers return a code that needs to be exchanged
                            // Supabase handles this automatically, but we can verify
                            const {data, error} = await supabase.auth.getSession();

                            if (error) {
                                logger.error('Error getting session after code exchange:', error);
                                onAuthError?.(new Error(`Failed to get session: ${error.message}`));
                            } else if (data?.session) {
                                onAuthSuccess?.();
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing deep link:', error);
                    onAuthError?.(error instanceof Error ? error : new Error('Unknown deep link error'));
                }
            } else if (url && (url.includes("payment/callback") || url.includes("payment-callback"))) {
                try {
                    // Parse the URL and extract payment parameters
                    const parsedURL = new URL(url);
                    const params = Object.fromEntries(parsedURL.searchParams.entries());

                    // Redirect to the payment callback page with the parameters
                    const urlParams = new URLSearchParams(params).toString();

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
                    console.error('Error processing payment callback:', error);
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