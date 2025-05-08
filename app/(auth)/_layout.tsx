import { useAuth } from '@/contexts/auth'
import { Stack, usePathname } from 'expo-router'
import { Redirect } from 'expo-router'
import React, { useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { View } from 'react-native';
import { theme } from '@/constants/theme';
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";

export default function AuthLayout() {
    const { session, isLoading, user } = useAuth();
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const isDarkMode = colorScheme === 'dark';
    const [redirectPath, setRedirectPath] = useState<string | null>(null);

    // Determine redirection only when necessary values change
    useEffect(() => {
        // Don't make redirection decisions while still loading
        if (isLoading) {
            setRedirectPath(null);
            return;
        }

        // Authenticated users who completed onboarding
        if (session && user?.onboarding_done) {
            // Allow access to forgot password even if authenticated
            if (!pathname.includes("/forgot_passworddsd") ) {
                setRedirectPath("/(app)");
                return;
            }
        }

        // Authenticated users who haven't completed onboarding
        if (session && user && !user.onboarding_done && !pathname.includes("/onboarding")) {
            setRedirectPath("/(auth)/onboarding");
            return;
        }

        // Default case - no redirection needed
        setRedirectPath(null);
    }, [session, user?.onboarding_done, pathname, isLoading]);

    // Handle redirect if needed
    if (redirectPath) {
        return <Redirect href={redirectPath as any} />;
    }

    // For auth screens, only show loading during active authentication processes
    if (isLoading && session !== null) {
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