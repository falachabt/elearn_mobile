import React, { useCallback, useRef } from "react";
import {Href, Redirect, router, Tabs} from "expo-router";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {
    AccessibilityState,
    GestureResponderEvent,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useSWRConfig} from "swr";

import {useAuth} from "@/contexts/auth";
import {theme} from "@/constants/theme";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useColorScheme} from '@/hooks/useColorScheme';
import {LoadingAnimation} from "@/components/shared/LoadingAnimation1";
import RatingModal from '@/components/RatingModal';
import { TabBarTourContext } from "@/contexts/TabBarTourContext";

export default function AppLayout() {
    const {session, isLoading, user, ensureSessionAccount, signOut} = useAuth();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme != 'light';
    const {mutate} = useSWRConfig();
    const {trigger} = useHaptics();
    const homeTabRef = useRef<View>(null);
    const manuelTabRef = useRef<View>(null);
    const secondaryTabRef = useRef<View>(null);
    const learnTabRef = useRef<View>(null);
    const profileTabRef = useRef<View>(null);

    // Handle tab press with memoized callback to avoid recreation on each render
    interface TabPressEvent {
        target?: string | { toString(): string };
        preventDefault?: () => void;
    }

    const handleTabPress = useCallback((e: TabPressEvent): void => {
        // Accéder à l'ID du tab via la propriété routeNames si disponible
        const currentRoute: string = e.target?.toString() || '';
        const target: string = currentRoute.includes('-') ? currentRoute.split('-')[0] : currentRoute;


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

        // navigate to the root of the tab to reset any nested navigation state
        if (target && target !== 'index') {
            router.push(`/${target}`  as Href);
        } else if (target === 'index') {
            router.push(`/` as Href);
        }

    }, [trigger, mutate, user?.id]);
    if (!session) {
        return <Redirect href="/(auth)"/>;
    }

    if (isLoading) {
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

    if (!user) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 24,
                backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary
            }}>
                <LoadingAnimation isDarkMode={isDarkMode}/>
                <Text style={[styles.accountStatusTitle, {color: isDarkMode ? '#F8FAFC' : '#0F172A'}]}>
                    Finalisation de votre compte
                </Text>
                <Text style={[styles.accountStatusText, {color: isDarkMode ? '#CBD5E1' : '#475569'}]}>
                    La session est ouverte, mais le profil n&apos;est pas encore prêt.
                </Text>
                <TouchableOpacity
                    style={styles.accountStatusPrimaryButton}
                    onPress={() => {
                        void ensureSessionAccount();
                    }}
                >
                    <Text style={styles.accountStatusPrimaryButtonText}>Réessayer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.accountStatusSecondaryButton}
                    onPress={() => {
                        void signOut();
                    }}
                >
                    <Text style={[styles.accountStatusSecondaryButtonText, {color: isDarkMode ? '#E2E8F0' : '#334155'}]}>
                        Se déconnecter
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (user && !user.onboarding_done) {
        return <Redirect href="/(auth)/onboarding"/>;
    }

    return (
        <TabBarTourContext.Provider
            value={{
                homeTabRef,
                manuelTabRef,
                secondaryTabRef,
                learnTabRef,
                profileTabRef,
            }}
        >
            <SafeAreaView
                style={{flex: 1, backgroundColor: isDarkMode ? theme.color.dark.background.primary : "transparent"}}
            >
                <RatingModal />
                <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: theme.color.primary[500],
                    tabBarInactiveTintColor: "#94A3B8",
                    tabBarShowLabel: true,
                    tabBarStyle: isDarkMode ? styles.tabBarDark : styles.tabBar,
                    tabBarItemStyle: styles.tabItem,
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
                        tabBarButton: (props) => (
                            <CustomTabBarButton
                                {...props}
                                isDarkMode={isDarkMode}
                                tourRef={homeTabRef}
                            />
                        ),
                    }}
                />

                {/* Manuel tab */}
                <Tabs.Screen
                    name="manuel"
                    options={{
                        title: "Manuel",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="book"
                                color={color}
                                size={26}
                            />
                        ),
                        tabBarButton: (props) => (
                            <CustomTabBarButton
                                {...props}
                                isDarkMode={isDarkMode}
                                tourRef={manuelTabRef}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="activity/index"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="activity/detail"
                    options={{ href: null }}
                />

                <Tabs.Screen
                    name="secondary"
                    options={{
                        title: "College",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="book-open-variant"
                                color={color}
                                size={26}
                            />
                        ),
                        tabBarButton: (props) => (
                            <CustomTabBarButton
                                {...props}
                                isDarkMode={isDarkMode}
                                tourRef={secondaryTabRef}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="learn"
                    options={{
                        title: "Prepa",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="book-open-variant"
                                color={color}
                                size={26}
                            />
                        ),
                        tabBarButton: (props) => (
                            <CustomTabBarButton
                                {...props}
                                isDarkMode={isDarkMode}
                                tourRef={learnTabRef}
                            />
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
                        tabBarButton: (props) => (
                            <CustomTabBarButton
                                {...props}
                                isDarkMode={isDarkMode}
                                tourRef={profileTabRef}
                            />
                        ),
                    }}
                />
                </Tabs>
            </SafeAreaView>
        </TabBarTourContext.Provider>
    );
}

// CustomTabBarButton component remains the same
function CustomTabBarButton({
                                children,
                                onPress,
                                accessibilityState,
                                isDarkMode,
                                tourRef,
                            }: {
    children: React.ReactNode;
    onPress?: (event: GestureResponderEvent) => void;
    accessibilityState?: AccessibilityState;
    isDarkMode: boolean;
    tourRef?: React.RefObject<View | null>;
}) {
    const isSelected = accessibilityState?.selected;

    return (
        <TouchableOpacity
            style={[styles.tabButton, isSelected && styles.tabButtonActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View
                ref={tourRef}
                collapsable={false}
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
        marginTop: 5,
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
    accountStatusTitle: {
        marginTop: 24,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
    },
    accountStatusText: {
        marginTop: 12,
        marginBottom: 24,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        lineHeight: 20,
    },
    accountStatusPrimaryButton: {
        minWidth: 180,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.primary[500],
    },
    accountStatusPrimaryButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 15,
        fontWeight: '700',
    },
    accountStatusSecondaryButton: {
        minWidth: 180,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: theme.border.radius.small,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.35)',
    },
    accountStatusSecondaryButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
});
