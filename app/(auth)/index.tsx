import { View, Text } from 'react-native'
import React from 'react'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'

const index = () => {
  return (
    <ThemedView>
        <ThemedText>
            Hey
            </ThemedText> 
      <Text >index</Text>
    </ThemedView>
  )
}

export default index