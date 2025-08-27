import { Stack, usePathname } from 'expo-router'
import React, { useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { View } from 'react-native';
import { theme } from '@/constants/theme';
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";
import { useRouteGuard } from "@/contexts/RouteGuardContext";

export default function AuthLayout() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { isChecking } = useRouteGuard();

    if (isChecking) {
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
            {/*<Stack.Screen name="forgot_password" options={{ headerShown: false }} />*/}
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