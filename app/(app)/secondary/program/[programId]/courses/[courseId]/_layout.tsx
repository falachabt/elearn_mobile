import { Stack } from "expo-router";

export default function CourseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lessons" />
      <Stack.Screen name="videos/[videoId]" />
    </Stack>
  );
}
