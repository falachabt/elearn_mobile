import React, {useEffect, useState, useCallback} from "react";
import {Redirect, router, Tabs, useNavigation} from "expo-router";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/auth";
import {
    AccessibilityState,
    GestureResponderEvent,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
} from "react-native";
import {theme} from "@/constants/theme";
import {SafeAreaView} from "react-native-safe-area-context";
import {useSWRConfig} from "swr";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useColorScheme} from '@/hooks/useColorScheme';
import {LoadingAnimation} from "@/components/shared/LoadingAnimation1";

export default function AppLayout() {
    const {session, isLoading, user} = useAuth();
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme != 'light';
    const {mutate} = useSWRConfig();
    const {trigger} = useHaptics();
    const [needsRedirect, setNeedsRedirect] = useState(false);



    // Check redirect conditions once and store result, don't re-evaluate on every render
    useEffect(() => {
        if (!session) {
            setNeedsRedirect(true);
        } else if (user && !user.onboarding_done) {
            setNeedsRedirect(true);
        } else {
            setNeedsRedirect(false);
        }
    }, [session, user?.onboarding_done]);

    // Handle tab press with memoized callback to avoid recreation on each render
//     @ts-ignore
    const handleTabPress = useCallback((e) => {
        // Accéder à l'ID du tab via la propriété routeNames si disponible
        const currentRoute = e.target?.toString() || '';
        const target = currentRoute.includes('-') ? currentRoute.split('-')[0] : currentRoute;

        // Use focus event to trigger haptics to avoid unnecessary renders
        trigger(HapticType.SELECTION);

        // Selective mutation based on tab
        if (target === 'index') {
            mutate(`userPrograms-${user?.id}`);
        } else if (target === 'learn') {
            mutate("my-learning-paths");
            e.preventDefault?.();
            router.replace('/learn');
        }
    }, [trigger, mutate, user?.id]);
    // CRITICAL: This is a protected route - no session means redirect immediately
    if (needsRedirect) {
        // Handle onboarding redirect if needed
        if (user && !user.onboarding_done) {
            return <Redirect href="/(auth)/onboarding"/>;
        }

        if (!session) {
            return <Redirect href="/(auth)"/>;
        }


    }

    // Show loading indicator when we have session but user data is still loading
    if (isLoading || (session && !user)) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary
            }}>
                <LoadingAnimation isDarkMode={isDarkMode}/>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={{flex: 1, backgroundColor: isDarkMode ? theme.color.dark.background.primary : "transparent"}}
        >
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: theme.color.primary[500],
                    tabBarInactiveTintColor: "#94A3B8",
                    tabBarShowLabel: true,
                    tabBarStyle: isDarkMode ? styles.tabBarDark : styles.tabBar,
                    tabBarItemStyle: styles.tabItem,
                    tabBarButton: (props) => <CustomTabBarButton {...props} isDarkMode={isDarkMode}/>,
                    tabBarLabelStyle: styles.tabLabel,
                }}
                screenListeners={{
                    tabPress: handleTabPress,
                }}
            >
                {/* Tab screens stay the same */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="home-variant"
                                color={color}
                                size={26}
                            />
                        ),
                    }}
                />

                {/* Other tab screens... */}
                <Tabs.Screen
                    name="learn"
                    options={{
                        title: "Apprendre",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="book-open-variant"
                                color={color}
                                size={26}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="(catalogue)"
                    options={{
                        title: "Catalogue",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons name="shopping" color={color} size={26}/>
                        ),
                    }}
                />

                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="account-circle"
                                color={color}
                                size={26}
                            />
                        ),
                    }}
                />
            </Tabs>
        </SafeAreaView>
    );
}

// CustomTabBarButton component remains the same
function CustomTabBarButton({
                                children,
                                onPress,
                                accessibilityState,
                                isDarkMode,
                            }: {
    children: React.ReactNode;
    onPress?: (event: GestureResponderEvent) => void;
    accessibilityState?: AccessibilityState;
    isDarkMode: boolean;
}) {
    const isSelected = accessibilityState?.selected;

    return (
        <TouchableOpacity
            style={[styles.tabButton, isSelected && styles.tabButtonActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.tabButtonContent,
                    isSelected && styles.tabButtonContentActive,
                    isDarkMode && styles.tabButtonContentDark,
                ]}
            >
                {children}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // Your existing styles here
    tabBar: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 0 : 0,
        height: 65,
        backgroundColor: theme.color.light.background.primary,
        borderRadius: 2,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderTopWidth: 0,
        paddingBottom: 0,
    },
    tabBarDark: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 0 : 0,
        // left: 10,
        // right: 10,
        height: 65,
        backgroundColor: theme.color.dark.background.primary,
        borderRadius: 2,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderTopWidth: 0,
        paddingBottom: 0,
    },
    tabItem: {
        padding: 0,
        margin: 0,
        height: "100%",
    },
    tabLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: "500",
        marginTop: -5,
        marginBottom: 5,
    },
    tabButton: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    tabButtonContent: {
        justifyContent: "center",
        alignItems: "center",
        width: "80%",
        height: "90%",
        borderRadius: theme.border.radius.small,
    },
    tabButtonContentDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    tabButtonActive: {
        position: "relative",
    },
    tabButtonContentActive: {
        fontFamily: "Outfit",
        backgroundColor: `${theme.color.primary[500]}10`,
    },
});