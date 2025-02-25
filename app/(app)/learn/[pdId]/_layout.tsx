import { Stack, Tabs } from 'expo-router'
import React from 'react';


export default function LearnLayout() {


  return (
    <Stack screenOptions={{ headerShown: false, animation : "slide_from_left" }}  >
      {/* Render child routes */}
       <Stack.Screen name="courses" options={{ headerShown: false }} />
       <Stack.Screen name="quizzes/index" options={{ headerShown: false }} />
       <Stack.Screen name="exercices" options={{ headerShown: false }} />
       {/* <Stack.Screen name="flashcards/index" options={{ headerShown: false }} /> */}
    </Stack>
  )
}
