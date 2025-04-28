import { useAuth } from '@/contexts/auth'
import { Stack, Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';


export default function LearnLayout() {
  const { session, isLoading, user } = useAuth();
  


  return (
    <Stack screenOptions={{ headerShown: false, animation : "slide_from_right" }}  >
      {/* Render child routes */}
       <Stack.Screen name="[sectionId]" options={{ headerShown: false }} />
    </Stack>
  )
}
