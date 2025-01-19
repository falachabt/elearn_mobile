import { View, Text } from 'react-native'
import React from 'react'
import TopBar from '@/components/TopBar'
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router'
import CourseList from '@/components/CourseList'

const index = () => {
  const {pdId} = useLocalSearchParams();
  
  console.log(pdId)
  console.log(pdId)
  const pdIdString = Array.isArray(pdId) ? pdId[0] : pdId;
  return (
    <View style={{ flex: 1 }}>
     <CourseList pdId = {pdIdString} /> 
    </View>
  )
}

export default index