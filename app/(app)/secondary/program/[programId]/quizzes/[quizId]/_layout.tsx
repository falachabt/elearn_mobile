import { Stack } from 'expo-router'
import React from 'react';

export default function QuizLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation : "slide_from_right" }}  >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[attemptId]/index" options={{ headerShown: false }} />
    </Stack>
  )
}
