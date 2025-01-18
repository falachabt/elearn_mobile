import { View, Text } from 'react-native'
import React from 'react'
import TopBar from '@/components/TopBar'
import { useGlobalSearchParams } from 'expo-router'
import CourseList from '@/components/CourseList'

const index = () => {
  const {pdId} = useGlobalSearchParams();
  
  // console.log(pdId)
  return (
    <View style={{ flex: 1 }}>
       {/* <TopBar userName='Benny TENEZEU' xp={2000} streaks={4} onChangeProgram={ () => {} } />  */}
     <CourseList /> 
    </View>
  )
}

export default index