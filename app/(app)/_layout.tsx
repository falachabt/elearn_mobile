import React from 'react'
import { Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/auth'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { theme } from '@/constants/theme'
import { StatusBar } from 'expo-status-bar'
import { ReactNode } from 'react'
import { GestureResponderEvent, AccessibilityState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AppLayout() {
  const { session, isLoading, user } = useAuth()

  if (!isLoading && !session) {
    return <Redirect href="/(auth)" />
  }

  if (!user?.onboarding_done) {
    return <Redirect href={"/(auth)/onboarding"} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.color.primary[500],
          tabBarInactiveTintColor: '#94A3B8',
          tabBarShowLabel: true,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant" color={color} size={26} />
            ),
          }}
        />

        <Tabs.Screen
          name="courses"
          options={{
            title: 'Learn',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="book-open-variant" color={color} size={26} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle" color={color} size={26} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" color={color} size={26} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  )
}

function CustomTabBarButton({ 
  children, 
  onPress, 
  accessibilityState 
}: { 
  children: ReactNode; 
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
}) {
  const isSelected = accessibilityState?.selected;

  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isSelected && styles.tabButtonActive
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.tabButtonContent,
        isSelected && styles.tabButtonContentActive
      ]}>
        {children}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    left: 10,
    right: 10,
    height: 65,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#000',
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
    height: '100%',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -5,
    marginBottom: 5,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    height: '90%',
    borderRadius: 15,
  },
  tabButtonActive: {
    position: 'relative',
  },
  tabButtonContentActive: {
    backgroundColor: `${theme.color.primary[500]}10`,
  },
});
