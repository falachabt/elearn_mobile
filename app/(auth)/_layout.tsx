import { Stack, usePathname } from 'expo-router'
import { Redirect } from 'expo-router'
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/auth'
import { theme } from '@/constants/theme';
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";

// Hard ceiling on the auth-transition spinner. If `isLoading` is still true
// past this, something is stuck (slow network, backend hiccup) — we hand off
// to /(app) instead of blocking forever; that screen has its own non-blocking
// sync banner with a real retry, so the user is never trapped without an exit.
const AUTH_LOADING_TIMEOUT_MS = 3000;

export default function AuthLayout() {
    const { session, isLoading, user } = useAuth();
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const isDarkMode = colorScheme === 'dark';
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);

    useEffect(() => {
        if (!session || !isLoading) {
            setLoadingTimedOut(false);
            return;
        }
        const timer = setTimeout(() => setLoadingTimedOut(true), AUTH_LOADING_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [session, isLoading]);

    const isOnboardingRoute = pathname.includes('/onboarding');

    if (session && isLoading && !loadingTimedOut && !isOnboardingRoute) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary
            }}>
                <LoadingAnimation isDarkMode={isDarkMode} />
            </View>
        );
    }

    if (session && loadingTimedOut && !isOnboardingRoute && !pathname.includes('/forgot_password')) {
        return <Redirect href={"/(app)"} />;
    }

    if (session && user?.onboarding_done && !pathname.includes("/forgot_password")) {
        return <Redirect href={"/(app)"} />;
    }

    if (session && user && !user.onboarding_done && !pathname.includes("/onboarding")) {
        return <Redirect href={"/(auth)/onboarding"} />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: {
                    backgroundColor: isDarkMode
                        ? theme.color.dark.background.primary
                        : theme.color.light.background.primary,
                    paddingVertical : 20
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
    );
}
