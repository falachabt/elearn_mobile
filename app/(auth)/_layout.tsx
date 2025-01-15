import { useAuth } from '@/contexts/auth'
import { Stack, Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';


export default function AuthLayout() {
  const { session, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  

  // If user is authenticated, redirect to main app
  if (!isLoading && session) {
    return <Redirect href={"/(app)" as any} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }} >
      {/* Render child routes */}
       <Stack.Screen name="index" options={{ headerShown: false }} />
       <Stack.Screen name="login" options={{ headerShown: false }} />
       <Stack.Screen name="register" options={{ headerShown: false }} />
    </Stack>
  )
}
