import { Stack } from 'expo-router'
import React from 'react';


export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation : "slide_from_right" }}  >
      {/* Render child routes */}
       <Stack.Screen name="[sectionId]" options={{ headerShown: false }} />
    </Stack>
  )
}
