import {Platform, TouchableOpacity, Text, Alert} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import axios from "axios";

import {supabase} from "@/lib/supabase";
import {useAuth} from "@/contexts/auth";
import {ThemedText} from "@/components/ThemedText";
import {useAppConfig} from "@/contexts/useAppConfig";
import {logger} from "@/utils/logger";

export function AppleLogin() {
    const {setIsAccountCreating, mutateUser} = useAuth();
    const {getApiBaseUrl} = useAppConfig();
    const apiBaseUrl = getApiBaseUrl();
    
    if (Platform.OS === 'ios')
        return (
            <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={{flex: 1, height: 64}}
                onPress={async () => {
                    try {
                        const credential = await AppleAuthentication.signInAsync({
                            requestedScopes: [
                                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                                AppleAuthentication.AppleAuthenticationScope.EMAIL,
                            ],
                        })
                        
                        // Sign in via Supabase Auth.
                        if (!credential.identityToken) {
                            throw new Error('No identityToken.')
                        }

                        setIsAccountCreating(true);
                        
                        try {
                            const {error, data: {session}} = await supabase.auth.signInWithIdToken({
                                provider: 'apple',
                                token: credential.identityToken,
                            })
                            
                            if (error) {
                                throw error;
                            }

                            if (!session?.access_token) {
                                throw new Error('No session created after Apple authentication');
                            }

                            // Get user data
                            const {data: userData} = await supabase.auth.getUser();

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

                                // Force revalidation of user data
                                await mutateUser();
                                
                                logger.info('Apple login successful, account created');
                            } catch (apiError) {
                                logger.error('Error creating account after Apple login:', apiError);
                                // If account already exists (user logging in), that's okay
                                // Just force revalidation
                                await mutateUser();
                            }
                        } catch (authError) {
                            logger.error('Apple authentication error:', authError);
                            throw authError;
                        } finally {
                            // Always clear the account creating flag
                            setIsAccountCreating(false);
                        }
                    } catch (e) {
                        if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
                            // User canceled the sign-in flow - silent failure
                            logger.info('User canceled Apple sign-in');
                        } else {
                            logger.error('Apple login error:', e);
                            Alert.alert(
                                'Erreur de connexion',
                                'Une erreur est survenue lors de la connexion avec Apple. Veuillez réessayer.'
                            );
                        }
                    }
                }}
            />
        )
    return null
}