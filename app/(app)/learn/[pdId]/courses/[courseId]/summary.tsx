import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { CourseSummaryScreen } from '@/components/shared/courses/CourseSummaryScreen';
import { useUser } from '@/contexts/useUserInfo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useCustomRouter } from '@/hooks/useCustomRouter';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

const LearnCourseSummary = () => {
  const router = useCustomRouter();
  const { courseId, pdId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { trigger } = useHaptics();
  const { isLearningPathEnrolled } = useUser();
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (!pdId) return;
    const checkEnrollment = async () => {
      const enrolled = await isLearningPathEnrolled(String(pdId));
      setIsEnrolled(enrolled);
    };
    checkEnrollment();
  }, [pdId, isLearningPathEnrolled]);

  if (!courseId) {
    return null;
  }

  return (
    <CourseSummaryScreen
      courseId={String(courseId)}
      isDark={isDark}
      isEnrolled={isEnrolled}
      onBack={() => {
        trigger(HapticType.LIGHT);
        router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
      }}
    />
  );
};

export default LearnCourseSummary;



