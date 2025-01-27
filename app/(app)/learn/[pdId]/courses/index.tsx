import { View, Text } from 'react-native'
import React from 'react'
import TopBar from '@/components/TopBar'
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router'
import CourseList from '@/components/CourseList'

const index = () => {
  const params = useGlobalSearchParams();
  const pdId = params.pdId;
  const pdIdString = Array.isArray(pdId) ? pdId[0] : pdId;

  console.log(params);
  return (
    <View style={{ flex: 1 }}>
     <CourseList pdId = {String(pdId)} /> 
    </View>
  )
}

export default index