import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, useColorScheme } from 'react-native';
import TopBar from '@/components/TopBar';
import { theme } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { useUser } from '@/contexts/useUserInfo';
import LearningPaths from '@/components/shared/LearningPaths';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_MARGIN = 12;
const GOAL_CARD_WIDTH = (width - 2 * HORIZONTAL_PADDING - 2 * CARD_MARGIN) / 3;
const PATH_CARD_WIDTH = width * 0.6;

export default function Index() {
  const { user } = useAuth();
  const { toDayXp, toDayExo, toDayTime, userPrograms, lastCourse } = useUser()
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDarkMode = colorScheme === 'dark';
  const streaks = 0;
  const xp = 0;

  return (
    <View style={isDarkMode ? styles.containerDark : styles.container}>
      <TopBar
        userName={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()}
        streaks={streaks}
        xp={xp}
        onChangeProgram={() => {}}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
          <Text numberOfLines={1} style={isDarkMode ? styles.welcomeTitleDark : styles.welcomeTitle}>
          {new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'} {user?.firstname} 👋
          
          </Text>
          <Text numberOfLines={1} style={isDarkMode ? styles.welcomeSubtitleDark : styles.welcomeSubtitle}>
            Prêt à continuer votre apprentissage ?
          </Text>
        </View>

        {/* Current Course */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>En cours</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>
                <Link href={"/(app)/learn"}>
                  Tout voir
                </Link>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={isDarkMode ? styles.currentCourseCardDark : styles.currentCourseCard}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${lastCourse?.course_progress_summary?.[0]?.progress_percentage ?? 0}%` }]} />
            </View>
            <View style={styles.courseContent}>
              <View style={styles.playIconContainer}>
                <MaterialCommunityIcons name="play" size={24} color="#FFF" />
              </View>
              <View style={styles.courseTitleContainer}>
                <Text numberOfLines={1} style={isDarkMode ? styles.courseTitleDark : styles.courseTitle}>
                  { lastCourse?.name ?? 'Aucun cours en cours' }
                </Text>
                <Text numberOfLines={1} style={isDarkMode ? styles.lessonProgressDark : styles.lessonProgress}>
                  Leçon { JSON.stringify(lastCourse?.courses_content?.order) } • {lastCourse?.course_progress_summary?.[0]?.progress_percentage ?? 0 } complété
                </Text>
              </View>
              <TouchableOpacity style={styles.continueButton} onPress={ () => { router.push(`/(app)/learn/${lastCourse?.learning_path?.id}/courses/${lastCourse?.id}/lessons/${lastCourse?.current_section}`) } } >
                <Text style={styles.continueText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily Goals */}
        <View style={styles.section}>
          <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
            Objectifs du jour
          </Text>
            <View style={styles.goalsRow}>
            {[
              { icon: 'lightning-bolt', title: 'Minutes', current: Number((toDayTime / (1000*60)).toFixed(1)), total: 60, unit: 'min' },
              { icon: 'star', title: 'Points XP', current: toDayXp, total: 600, unit: 'XP' },
              { icon: 'medal', title: 'Quiz', current: toDayExo, total: 6, unit: 'ex' }
            ].map((goal, index) => {
              const isGoalMet = goal.current >= goal.total;
              return (
              <View key={index} style={isDarkMode ? styles.goalCardDark : styles.goalCard}>
                <View style={styles.goalIcon}>
                <MaterialCommunityIcons
                  name={goal.icon as any}
                  size={22}
                  color={isGoalMet ?   theme.color.primary[500] : theme.color.error}
                />
                </View>
                <Text numberOfLines={2} style={isDarkMode ? styles.goalTitleDark : styles.goalTitle}>
                {goal.title}
                </Text>
                <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, {
                  width: `${Math.min((goal.current / goal.total) * 100, 100)}%`, 
                  backgroundColor: isGoalMet ? theme.color.primary[500] : theme.color.error
                }]} />
                </View>
                <Text style={styles.goalMetrics}>
                <Text style={[styles.currentValue, { color: isGoalMet ? theme.color.primary[500] : theme.color.error   }]}>
                  {goal.current}
                </Text>
                <Text style={styles.totalValue}>/{goal.total} {goal.unit}</Text>
                </Text>
              </View>
              );
            })}
            </View>
        </View>

        {/* Learning Paths */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
              Parcours recommandés
            </Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}> <Link href={"/(app)/learn"}>
                  Tout voir
                </Link></Text>
            </TouchableOpacity>
          </View>

          <LearningPaths programs={[...userPrograms, ...userPrograms]}  isDarkMode={isDarkMode} /> 

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    flex: 1,
    backgroundColor: theme.color.dark.background.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 80, // For bottom tab bar
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  welcomeTitleDark: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  welcomeSubtitleDark: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  section: {
    marginBottom: 28,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionTitleDark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    color: theme.color.primary[500],
    fontWeight: '600',
    fontSize: 14,
  },
  currentCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  currentCourseCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderRadius: theme.border.radius.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#EEE',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.color.primary[500],
  },
  courseContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  courseTitleDark: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lessonProgress: {
    fontSize: 14,
    color: '#666',
  },
  lessonProgressDark: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  continueButton: {
    backgroundColor: theme.color.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.border.radius.small,
  },
  continueText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCard: {
    width: GOAL_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  goalCardDark: {
    width: GOAL_CARD_WIDTH,
    backgroundColor: theme.color.dark.background.secondary,
    borderRadius: theme.border.radius.small,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.border.radius.small,
    backgroundColor: `${theme.color.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    height: 32,
  },
  goalTitleDark: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    height: 32,
  },
  goalProgressBar: {
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: theme.color.primary[500],
    borderRadius: 2,
  },
  goalMetrics: {
    fontSize: 12,
    textAlign: 'center',
  },
  currentValue: {
    color: theme.color.primary[500],
    fontWeight: '600',
  },
  totalValue: {
    color: '#666',
  },
 
});