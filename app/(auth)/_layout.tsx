import { Stack, usePathname } from 'expo-router'
import { Redirect } from 'expo-router'
import React from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/auth'
import { theme } from '@/constants/theme';
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";

export default function AuthLayout() {
    const { session, isLoading, user } = useAuth();
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const isDarkMode = colorScheme === 'dark';

    if (session && isLoading && !pathname.includes('/onboarding')) {
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
