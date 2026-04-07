import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, Component } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";


// Root-level error boundary — catches any crash inside the app tree and shows the error
class RootErrorBoundary extends Component<
{ children: React.ReactNode },
    { error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { error };
    }
    render() {
        if (this.state.error) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d32f2f', marginBottom: 12 }}>
                        Erreur de rendu
                    </Text>
                    <ScrollView style={{ maxHeight: 400 }}>
                        <Text style={{ fontSize: 13, color: '#333', fontFamily: 'monospace' }}>
                            {this.state.error.message}
                        </Text>
                        {this.state.error.stack ? (
                            <Text style={{ fontSize: 11, color: '#666', marginTop: 8, fontFamily: 'monospace' }}>
                                {this.state.error.stack}
                            </Text>
                        ) : null}
                    </ScrollView>
                </View>
            );
        }
        return this.props.children;
    }
}
import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Provider } from "@/providers";
import { installDevWarningFilters } from "@/utils/devWarnings";
import ScreenTracker from "@/components/shared/ScreenTracker";

installDevWarningFilters();



// Define app expiration date - March 16, 2025 (one week after March 9, 2025)
const EXPIRATION_DATE = new Date('2025-04-10T00:00:00Z');
const IS_TEST_MODE = false; // Set to false for production

// Custom Expiration Screen Component
const ExpiredAppScreen = ({isDarkMode}: { isDarkMode: boolean }) => {
    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
        }}>
            <Head>
                <title>{"Elearn Prepa"}</title>
                <meta name="description" content="Préparez les concours de vos reves" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />

            </Head>
            <MaterialCommunityIcons
                name="timer-off"
                size={100}
                color={theme.color.primary[500]}
            />
            <Text style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: 24,
                fontWeight: 'bold',
                marginTop: 20,
                textAlign: 'center',
                color: isDarkMode ? theme.color.dark.text.primary : theme.color.light.text.primary
            }}>
                Phase de Test Terminée
            </Text>
            <Text style={{
                fontFamily: theme.typography.fontFamily,
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


// Prevent the splash screen from auto-hiding before asset loading is complete.
if (Platform.OS !== 'web') {
    SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [loaded] = useFonts({
        'Outfit': require('../assets/fonts/Outfit-Regular.ttf'), // eslint-disable-line
        'PlusJakartaSans': require('../assets/fonts/PlusJakartaSans-Regular.ttf'), // eslint-disable-line
        'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'), // eslint-disable-line
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded && Platform.OS !== 'web') {
        return null;
    }

    // Check if app has expired
    const isAppExpired = new Date() > EXPIRATION_DATE;

    // If app is expired, show the expiration screen instead of normal layout
    if (isAppExpired && IS_TEST_MODE) {
        return <ExpiredAppScreen isDarkMode={isDarkMode}/>;
    }

    // Normal app flow if not expired
    return (
        <RootErrorBoundary>
            <Provider>
                <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                    <ScreenTracker />
                    <Stack initialRouteName={"(auth)"} screenOptions={{animation: "slide_from_left", headerShown: false}}>
                        <Stack.Screen name="(auth)"/>
                        <Stack.Screen name="(app)"/>
                        <Stack.Screen name="+not-found"/>
                    </Stack>

                    <StatusBar hidden={Platform.OS == "ios" ? true : false} style="auto"
                               backgroundColor={theme.color.primary[500]}/>
                </ThemeProvider>
            </Provider>
        </RootErrorBoundary>
    );
}
