// app/(drawer)/_layout.tsx
import { Stack } from 'expo-router/stack';
import { useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function StackLayout() {
  const isDark = useColorScheme() === 'dark';
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? theme.color.dark.background.primary : '#FFFFFF',
          },
          headerTintColor: isDark ? '#FFFFFF' : '#1A1A1A',
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="shop" 
          options={{
            title: 'Boutique',
          }}
        />
        <Stack.Screen 
          name="cart" 
          options={{
            title: 'Panier',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
