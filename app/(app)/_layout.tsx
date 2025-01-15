// app/(app)/_layout.tsx
import { Tabs } from 'expo-router'
import { Redirect } from 'expo-router'
import { IconFill } from '@ant-design/icons-react-native'
import { useAuth } from '@/contexts/auth'

export default function AppLayout() {
  const { session, isLoading } = useAuth()

  // Protect app routes
  if (!isLoading && !session) {
    return <Redirect href="/(auth)" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1677ff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconFill name="home" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => (
            <IconFill name="book" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconFill name="profile" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}