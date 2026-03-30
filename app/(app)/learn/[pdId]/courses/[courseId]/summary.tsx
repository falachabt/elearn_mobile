import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { CourseSummaryScreen } from '@/components/shared/courses/CourseSummaryScreen';
import { theme } from '@/constants/theme';
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
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

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

  if (isEnrolled === null) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  if (!isEnrolled) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={[styles.iconWrap, isDark && styles.iconWrapDark]}>
            <MaterialCommunityIcons
              name="lock"
              size={28}
              color={isDark ? '#6EE7B7' : '#65B741'}
            />
          </View>
          <ThemedText style={[styles.title, isDark && styles.titleDark]}>
            Resume reserve aux inscrits
          </ThemedText>
          <ThemedText style={[styles.description, isDark && styles.descriptionDark]}>
            Le resume complet du cours est debloque uniquement apres inscription au programme.
          </ThemedText>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              trigger(HapticType.SELECTION);
              router.navigateToShop(String(pdId));
            }}
          >
            <ThemedText style={styles.primaryButtonText}>Acheter le programme</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
            onPress={() => {
              trigger(HapticType.LIGHT);
              router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
            }}
          >
            <ThemedText style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark]}>
              Retour au cours
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#020617',
  },
  card: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    marginBottom: 16,
  },
  iconWrapDark: {
    backgroundColor: '#052E2B',
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0F172A',
  },
  titleDark: {
    color: '#F8FAFC',
  },
  description: {
    marginTop: 10,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  descriptionDark: {
    color: '#CBD5E1',
  },
  primaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.color.primary[500],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryButtonDark: {
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#334155',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonTextDark: {
    color: '#E2E8F0',
  },
});
