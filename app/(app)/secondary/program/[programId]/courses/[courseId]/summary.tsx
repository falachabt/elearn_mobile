import { Href, useLocalSearchParams } from 'expo-router';

import { CourseSummaryScreen } from '@/components/shared/courses/CourseSummaryScreen';
import { useNavigation } from '@/contexts/NavigationContext';
import { useUser } from '@/contexts/useUserInfo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useCustomRouter } from '@/hooks/useCustomRouter';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

const SecondaryCourseSummary = () => {
  const router = useCustomRouter();
  const { courseId, programId } = useLocalSearchParams();
  const { getCoursePath } = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { trigger } = useHaptics();
  const { isSecondaryProgramEnrolled } = useUser();
  const isEnrolled = isSecondaryProgramEnrolled(String(programId));

  if (!courseId) {
    return null;
  }

  return (
    <CourseSummaryScreen
      courseId={String(courseId)}
      isDark={isDark}
      isEnrolled={!!isEnrolled}
      onBack={() => {
        trigger(HapticType.LIGHT);
        router.push(getCoursePath(String(courseId)) as Href);
      }}
    />
  );
};

export default SecondaryCourseSummary;
