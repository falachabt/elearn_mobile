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

    // Onboarding gating only applies once we actually know the flag — until
    // then we render the app shell below rather than blocking on it.
    if (user && !user.onboarding_done) {
        return <Redirect href="/(auth)/onboarding"/>;
    }

    // Session is live: show the app immediately instead of a full-screen
    // blocker. `user` (the synced accounts row) streams in in the background —
    // every screen already treats it as nullable — so we only surface a small,
    // non-blocking banner while it's syncing, with a real retry if it stalls.
    const isProfileSyncing = !user && isLoading;
    const isProfileSyncFailed = !user && !isLoading;

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
                {(isProfileSyncing || isProfileSyncFailed) && (
                    <View style={[styles.syncBanner, {backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9'}]}>
                        <Text style={[styles.syncBannerText, {color: isDarkMode ? '#E2E8F0' : '#334155'}]}>
                            {isProfileSyncFailed ? "Profil non synchronisé" : "Synchronisation de votre profil…"}
                        </Text>
                        {isProfileSyncFailed && (
                            <View style={styles.syncBannerActions}>
                                <TouchableOpacity onPress={() => { void ensureSessionAccount(); }}>
                                    <Text style={styles.syncBannerRetry}>Réessayer</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { void signOut(); }}>
                                    <Text style={[styles.syncBannerRetry, {color: isDarkMode ? '#94A3B8' : '#64748B'}]}>
                                        Se déconnecter
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
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
                        title: "Fil",
                        tabBarIcon: ({color}) => (
                            <MaterialCommunityIcons
                                name="newspaper-variant-outline"
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
                    name="chat/[groupId]"
                    options={{ href: null, tabBarStyle: { display: "none" } }}
                />
                <Tabs.Screen
                    name="suivi"
                    options={{ href: null, tabBarStyle: { display: "none" } }}
                />
                <Tabs.Screen
                    name="notifications/index"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="post/[id]"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="leaderboard/index"
                    options={{ href: null }}
                />

                <Tabs.Screen
                    name="secondary"
                    options={{
                        title: "Secondaire",
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
                        title: "Concours",
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
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    syncBannerText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
    },
    syncBannerActions: {
        flexDirection: 'row',
        gap: 16,
        marginLeft: 12,
    },
    syncBannerRetry: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        fontWeight: '700',
        color: theme.color.primary[500],
    },
});
