import { Stack } from "expo-router";

export const unstable_settings = {
  // Ensure any route can link back to `/`
  initialRouteName: 'index',
};

export default function ProgramLayout() {
  return (
    <Stack
    
   key={"learn"}
    initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right"
        
      }}
    >
      <Stack.Screen 
        name="index" 
      />
      <Stack.Screen 
        name="[pdId]"
      />
    </Stack>
  );
}