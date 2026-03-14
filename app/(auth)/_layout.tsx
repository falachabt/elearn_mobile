import { Stack, usePathname, useRouter } from 'expo-router'
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/auth'
import { theme } from '@/constants/theme';
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";

export default function AuthLayout() {
    const { session, isLoading, user } = useAuth();
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const router = useRouter();
    const isDarkMode = colorScheme === 'dark';

    // Navigate programmatically so the Stack is NEVER unmounted.
    // Using <Redirect> caused the Stack to unmount and remount at the index
    // route every time the redirect triggered, sending the user back to index.
    useEffect(() => {
        if (isLoading) return;

        // Authenticated users who completed onboarding
        if (session && user?.onboarding_done) {
            if (!pathname.includes('/forgot_password')) {
                router.replace('/(app)' as any);
                return;
            }
        }

        // Authenticated users who haven't completed onboarding
        if (session && user && !user.onboarding_done && !pathname.includes('/onboarding')) {
            router.replace('/(auth)/onboarding' as any);
        }
    }, [session, user?.onboarding_done, pathname, isLoading]);

    const showLoading = isLoading && session !== null;

    // Stack is always mounted — the loading overlay sits on top with absoluteFill
    // so React Navigation never resets its history to the index route.
    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: {
                        backgroundColor: isDarkMode
                            ? theme.color.dark.background.primary
                            : theme.color.light.background.primary,
                        paddingVertical: 20
                    }
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="forgot_password" options={{ headerShown: false }} />
                <Stack.Screen
                    name="onboarding"
                    options={{
                        headerShown: false,
                        gestureEnabled: false
                    }}
                />
            </Stack>

            {showLoading && (
                <View style={[
                    StyleSheet.absoluteFill,
                    styles.loadingOverlay,
                    { backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary }
                ]}>
                    <LoadingAnimation isDarkMode={isDarkMode} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    }
})
