import { View, Text, Pressable, StyleSheet } from 'react-native'
import React from 'react'
import { ThemedText } from '@/components/ThemedText'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

const courses = () => {
  const { session, signOut, user } = useAuth();
  console.log("session")
  return (
    <View style={styles.container}>
      <Link href={"/(tabs)"} style={styles.link}>
        <ThemedText style={styles.courseText}>courses</ThemedText>
        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            signOut()
          }}
        >
          <ThemedText style={styles.logoutText}>logout</ThemedText>
        </Pressable>

        <ThemedText style={styles.emailText}>
          {session?.user.email} good
        </ThemedText>
        <ThemedText style={styles.metadataText}>
           good
        </ThemedText>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  link: {
    width: '100%',
    alignItems: 'center'
  },
  courseText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  emailText: {
    fontSize: 16,
    marginVertical: 10
  },
  metadataText: {
    fontSize: 14,
    opacity: 0.8
  }
})

export default courses
