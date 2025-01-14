import { View, Text } from 'react-native'
import React from 'react'
import { ThemedText } from '@/components/ThemedText'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'

const courses = () => {
  return (
    <>
      <ThemedText>courses</ThemedText>
      <Link href={"/(tabs)"} > good tabs </Link> 
    </>
  )
}

export default courses