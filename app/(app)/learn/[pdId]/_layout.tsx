import { useAuth } from '@/contexts/auth'
import { Stack, Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';


export default function LearnLayout() {
  const { session, isLoading, user } = useAuth();
  


  return (
    <Stack screenOptions={{ headerShown: false, animation : "slide_from_left" }}  >
      {/* Render child routes */}
       <Stack.Screen name="courses/index" options={{ headerShown: false }} />
       <Stack.Screen name="quizzes/index" options={{ headerShown: false }} />
       {/* <Stack.Screen name="flashcards/index" options={{ headerShown: false }} /> */}
    </Stack>
  )
}
