import TopBar from '@/components/TopBar'
import { useGlobalSearchParams } from 'expo-router'
import CourseList from '@/components/CourseList'
import { View } from 'react-native';
import QuizList from '@/components/QuizList';

const index = () => {
  const {pdId} = useGlobalSearchParams();
  
  // console.log(pdId)
  return (
    <View style={{ flex: 1 }}>
       {/* <TopBar userName='Benny TENEZEU' xp={2000} streaks={4} onChangeProgram={ () => {} } />  */}
     <QuizList /> 
    </View>
  )
}

export default index