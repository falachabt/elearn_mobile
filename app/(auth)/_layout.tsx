import { useAuth } from '@/contexts/auth'
import { Stack, usePathname } from 'expo-router'
import { Redirect } from 'expo-router'
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import {LoadingAnimation} from "@/components/shared/LoadingAnimation1";

export default function AuthLayout() {
    const { session, isLoading, user } = useAuth();
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const isDarkMode = colorScheme === 'dark';

    // For auth screens, only show loading during active authentication processes
    // like signing in or signing up - not during initial session check
    if (isLoading && session !== null) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary
            }}>
                <LoadingAnimation isDarkMode={isDarkMode}  />
            </View>
        );
    }

    // Redirect authenticated users who have completed onboarding
    if (session && user?.onboarding_done) {
        // Allow access to forgot password even if authenticated
        if (!pathname.includes("/forgot_password")) {
            return <Redirect href="/(app)" />;
        }
    }

    // For authenticated users who haven't completed onboarding
    if (session && user && !user.onboarding_done && !pathname.includes("/onboarding")) {
        return <Redirect href="/(auth)/onboarding" />;
    }

    // Render the auth stack
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: {
                    backgroundColor: isDarkMode
                        ? theme.color.dark.background.primary
                        : theme.color.light.background.primary
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