import { Stack } from "expo-router";

export default function CourseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="videos/[videoId]" />
    </Stack>
  );
}
