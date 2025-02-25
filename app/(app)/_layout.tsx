import React, {ReactNode} from "react";
import {Redirect, router, Tabs, useNavigation} from "expo-router";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/auth";
import {
  AccessibilityState,
  GestureResponderEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import {theme} from "@/constants/theme";
import {SafeAreaView} from "react-native-safe-area-context";
import {useSWRConfig} from "swr";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

export default function AppLayout() {
  const { session, isLoading, user } = useAuth();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { refreshInterval, mutate, cache, ...restConfig } = useSWRConfig();
  const { trigger } = useHaptics();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)" />;
  }

  if (!user?.onboarding_done) {
    return <Redirect href={"/(auth)/onboarding"} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? theme.color.dark.background.primary : "transparent" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.color.primary[500],
          tabBarInactiveTintColor: "#94A3B8",
          tabBarShowLabel: true,
          tabBarStyle: isDarkMode ? styles.tabBarDark : styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarButton: (props) => <CustomTabBarButton {...props} isDarkMode={isDarkMode} />,
          tabBarLabelStyle: styles.tabLabel,
          
        }}
        
        screenListeners={{
          tabPress: (e) => {
            const target = e.target?.split('-')[0];
            mutate("*")


            trigger(HapticType.SELECTION);

            if(target === 'index') {
              mutate(`userPrograms-${user.id}`);
            }
            if (target === 'learn') {
              mutate("my-learning-paths")
              e.preventDefault();
              router.replace('/learn');
            }
            
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="home-variant"
                color={color}
                size={26}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="learn"
          options={{
            title: "Apprendre",
            tabBarIcon: ({ color, size }) => (
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
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="shopping" color={color} size={26} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
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

function CustomTabBarButton({
  children,
  onPress,
  accessibilityState,
  isDarkMode,
}: {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
  isDarkMode: boolean;
}) {
  const isSelected = accessibilityState?.selected;

  return (
    <TouchableOpacity
      style={[styles.tabButton, isSelected && styles.tabButtonActive]}
      onPress={onPress}
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
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 0 : 0,
    left: 10,
    right: 10,
    height: 65,
    backgroundColor: "#FFFFFF",
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
    left: 10,
    right: 10,
    height: 65,
    backgroundColor: theme.color.dark.background.secondary,
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
    backgroundColor: theme.color.dark.background.secondary,
  },
  tabButtonActive: {
    position: "relative",
  },
  tabButtonContentActive: {
    backgroundColor: `${theme.color.primary[500]}10`,
  },
});
