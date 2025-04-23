import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import {View, Text, StyleSheet, Platform} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { Provider } from "@/providers";
import { theme } from "@/constants/theme";
import * as Notifications from "expo-notifications";

// Define app expiration date - March 16, 2025 (one week after March 9, 2025)
const EXPIRATION_DATE = new Date('2025-04-10T00:00:00Z');
const IS_TEST_MODE = false; // Set to false for production

// Custom Expiration Screen Component
const ExpiredAppScreen = ({ isDarkMode } : { isDarkMode: boolean }) => {
  return (
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <MaterialCommunityIcons
            name="timer-off"
            size={100}
            color={theme.color.primary[500]}
        />
        <Text style={{
          fontFamily : theme.typography.fontFamily,
fontSize: 24,
          fontWeight: 'bold',
          marginTop: 20,
          textAlign: 'center',
          color: isDarkMode ? theme.color.dark.text.primary : theme.color.light.text.primary
        }}>
          Phase de Test Terminée
        </Text>
        <Text style={{
          fontFamily : theme.typography.fontFamily,
fontSize: 16,
          marginTop: 15,
          textAlign: 'center',
          color: isDarkMode ? theme.color.dark.text.secondary : theme.color.light.text.secondary
        }}>
          La période de test pour cette application est terminée. Merci d'avoir participé à notre phase de test.
        </Text>
        <View style={{
          marginTop: 30,
          backgroundColor: theme.color.primary[500],
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 8
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontWeight: '600'
          }}>
            Contacter le Support
          </Text>
        </View>
      </SafeAreaView>
  );
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [loaded] = useFonts({
    Outfit: require("../assets/fonts/Outfit-Regular.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }


  // Check if app has expired
  const isAppExpired = new Date() > EXPIRATION_DATE;

  // If app is expired, show the expiration screen instead of normal layout
  if (isAppExpired && IS_TEST_MODE) {
    return <ExpiredAppScreen isDarkMode={isDarkMode} />;
  }

  // Normal app flow if not expired
  return (
      <Provider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack initialRouteName={"(auth)"} screenOptions={{ animation: "slide_from_left", headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar hidden={Platform.OS == "ios" ? true : false}  style="auto" backgroundColor={theme.color.primary[500]} />
        </ThemeProvider>
      </Provider>
  );
}