import {Platform, TouchableOpacity, Text} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import {supabase} from "@/lib/supabase";
import axios from "axios";
import {useAuth} from "@/contexts/auth";
import {ThemedText} from "@/components/ThemedText";

export function AppleLogin() {
    const {setIsAccountCreating, signOut} = useAuth();
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
                        if (credential.identityToken) {
                            setIsAccountCreating(true);
                            const {
                                error,
                                data: {user},
                            } = await supabase.auth.signInWithIdToken({
                                provider: 'apple',
                                token: credential.identityToken,
                            })
                            console.log(JSON.stringify({error, user}, null, 2))
                            if (!error) {
                                setTimeout(async () => {
                                    const {data: userData} = await supabase.auth.getUser();
                                    await axios.post('https://elearn.ezadrive.com/api/mobile/auth/createAccount',
                                        {
                                            email: userData?.user?.email,
                                            phone: userData?.user?.phone
                                        },
                                        {
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${credential.identityToken}`
                                            }
                                        }
                                    );
                                }, 500);
                            }


                        } else {
                            throw new Error('No identityToken.')
                        }
                    } catch (e) {
                        // @ts-ignore
                        setIsAccountCreating(false);
                        // @ts-ignore
                        if (e.code === 'ERR_REQUEST_CANCELED') {
                            // handle that the user canceled the sign-in flow
                        } else {
                            throw e
                        }
                    }
                }}
            />
        )
    return null
}