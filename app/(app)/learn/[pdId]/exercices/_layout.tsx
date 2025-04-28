import { Stack } from 'expo-router'
import React from 'react';


export default function LearnLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false,  }}  >
       <Stack.Screen name="index" options={{ headerShown: false }} />
       <Stack.Screen name="[exerciceId]" options={{ headerShown: false }} />
    </Stack>
  )
}
