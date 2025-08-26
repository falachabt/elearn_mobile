import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/auth';
import { theme } from '@/constants/theme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/useColorScheme';

// Types for performance metrics
interface WeeklyMetrics {
  totalXp: number;
  xpGained: number;
  streakDays: number;
  coursesProgress: number;
  quizzesTaken: number;
  correctAnswers: number;
  timeSpent: number; // in minutes
  activeDays: number;
}

interface DailyActivity {
  date: string;
  xp: number;
  timeSpent: number; // in minutes
  isActive: boolean;
}

const WeeklyPerformance = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({
    totalXp: 0,
    xpGained: 0,
    streakDays: 0,
    coursesProgress: 0,
    quizzesTaken: 0,
    correctAnswers: 0,
    timeSpent: 0,
    activeDays: 0
  });

  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);

  // Animation values
  const headerOpacity = useSharedValue(0);
  const metricsOpacity = useSharedValue(0);
  const chartOpacity = useSharedValue(0);
  const summaryOpacity = useSharedValue(0);

  // Fetch weekly performance data
  useEffect(() => {
    const fetchWeeklyPerformance = async () => {
      if (!user?.id) return;

      setIsLoading(true);

      try {
        // Get the date range for the past week
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Format dates for Supabase queries
        const todayStr = today.toISOString();
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        // 1. Get XP gained in the last week
        const { data: xpData, error: xpError } = await supabase
          .from('xp_history')
          .select('xp_gained')
          .eq('userid', user.id)
          .gte('created_at', oneWeekAgoStr)
          .lte('created_at', todayStr);

        if (xpError) throw xpError;

        // 2. Get user activity in the last week
        const { data: activityData, error: activityError } = await supabase
          .from('user_activity')
          .select('session_start, duration, created_at')
          .eq('user_id', user.id)
          .gte('created_at', oneWeekAgoStr)
          .lte('created_at', todayStr);

        if (activityError) throw activityError;

        // 3. Get quiz progress in the last week
        const { data: quizData, error: quizError } = await supabase
          .from('userquizprogress')
          .select('score, correctIds, wrongIds, xp_gained, lastaccessed')
          .eq('userid', user.id)
          .gte('lastaccessed', oneWeekAgoStr)
          .lte('lastaccessed', todayStr);

        if (quizError) throw quizError;

        // 4. Get course progress in the last week
        const { data: courseData, error: courseError } = await supabase
          .from('usercourseprogress')
          .select('progress, lastaccessed')
          .eq('userid', user.id)
          .gte('lastaccessed', oneWeekAgoStr)
          .lte('lastaccessed', todayStr);

        if (courseError) throw courseError;

        // Calculate metrics
        const xpGained = xpData?.reduce((sum, item) => sum + (item.xp_gained || 0), 0) || 0;

        const timeSpent = activityData?.reduce((sum, item) => sum + (item.duration || 0), 0) || 0;

        // Get unique active days
        const activeDaysSet = new Set(
          activityData?.map(item => 
            new Date(item.created_at || '').toISOString().split('T')[0]
          ) || []
        );

        const quizzesTaken = quizData?.length || 0;
        const correctAnswers = quizData?.reduce((sum, item) => 
          sum + (item.correctIds?.length || 0), 0) || 0;

        // Calculate average course progress
        let coursesProgress = 0;
        if (courseData && courseData.length > 0) {
          const totalProgress = courseData.reduce((sum, item) => sum + (item.progress || 0), 0);
          coursesProgress = Math.round(totalProgress / courseData.length);
        }

        // Prepare daily activity data
        const dailyActivityMap = new Map<string, DailyActivity>();

        // Initialize the map with the past 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          dailyActivityMap.set(dateStr, {
            date: dateStr,
            xp: 0,
            timeSpent: 0,
            isActive: false
          });
        }

        // Fill in XP data
        xpData?.forEach(item => {
          const date = new Date(item.created_at || '').toISOString().split('T')[0];
          const dayData = dailyActivityMap.get(date);

          if (dayData) {
            dayData.xp += (item.xp_gained || 0);
            dayData.isActive = true;
            dailyActivityMap.set(date, dayData);
          }
        });

        // Fill in activity data
        activityData?.forEach(item => {
          const date = new Date(item.created_at || '').toISOString().split('T')[0];
          const dayData = dailyActivityMap.get(date);

          if (dayData) {
            dayData.timeSpent += (item.duration || 0);
            dayData.isActive = true;
            dailyActivityMap.set(date, dayData);
          }
        });

        // Convert map to array and sort by date
        const dailyActivityArray = Array.from(dailyActivityMap.values())
          .sort((a, b) => a.date.localeCompare(b.date));

        // Update state with calculated metrics
        setWeeklyMetrics({
          totalXp: user?.user_xp?.total_xp || 0,
          xpGained,
          streakDays: user?.user_streaks?.current_streak || 0,
          coursesProgress,
          quizzesTaken,
          correctAnswers,
          timeSpent: Math.round(timeSpent / 60), // Convert to minutes
          activeDays: activeDaysSet.size
        });

        setDailyActivity(dailyActivityArray);

      } catch (error) {
        console.error('Error fetching weekly performance:', error);
      } finally {
        setIsLoading(false);

        // Start animations
        headerOpacity.value = withTiming(1, { duration: 500 });
        metricsOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
        chartOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
        summaryOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
      }
    };

    fetchWeeklyPerformance();
  }, [user?.id]);

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: withTiming(headerOpacity.value * 0, { duration: 500 }) }]
  }));

  const metricsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: metricsOpacity.value,
    transform: [{ translateY: withTiming((1 - metricsOpacity.value) * 20, { duration: 500 }) }]
  }));

  const chartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
    transform: [{ translateY: withTiming((1 - chartOpacity.value) * 20, { duration: 500 }) }]
  }));

  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: summaryOpacity.value,
    transform: [{ translateY: withTiming((1 - summaryOpacity.value) * 20, { duration: 500 }) }]
  }));

  // Helper function to format time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={styles.loadingText}>Chargement de vos performances...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View style={[styles.header, isDark && styles.headerDark, headerAnimatedStyle]}>
          <ThemedText style={styles.title}>Performances Hebdomadaires</ThemedText>
          <ThemedText style={styles.subtitle}>
            Votre activité d'apprentissage des 7 derniers jours
          </ThemedText>
        </Animated.View>

        {/* Key Metrics */}
        <Animated.View style={[styles.metricsContainer, metricsAnimatedStyle]}>
          <View style={[styles.metricCard, isDark && styles.metricCardDark]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${theme.color.primary[500]}20` }]}>
              <MaterialCommunityIcons name="star" size={24} color={theme.color.primary[500]} />
            </View>
            <View style={styles.metricTextContainer}>
              <ThemedText style={styles.metricValue}>{weeklyMetrics.xpGained} XP</ThemedText>
              <ThemedText style={styles.metricLabel}>XP gagnés</ThemedText>
            </View>
          </View>

          <View style={[styles.metricCard, isDark && styles.metricCardDark]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${theme.color.success[500]}20` }]}>
              <MaterialCommunityIcons name="fire" size={24} color={theme.color.success[500]} />
            </View>
            <View style={styles.metricTextContainer}>
              <ThemedText style={styles.metricValue}>{weeklyMetrics.streakDays} jours</ThemedText>
              <ThemedText style={styles.metricLabel}>Série actuelle</ThemedText>
            </View>
          </View>

          <View style={[styles.metricCard, isDark && styles.metricCardDark]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${theme.color.info[500]}20` }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.color.info[500]} />
            </View>
            <View style={styles.metricTextContainer}>
              <ThemedText style={styles.metricValue}>{formatTime(weeklyMetrics.timeSpent)}</ThemedText>
              <ThemedText style={styles.metricLabel}>Temps d'étude</ThemedText>
            </View>
          </View>

          <View style={[styles.metricCard, isDark && styles.metricCardDark]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${theme.color.warning[500]}20` }]}>
              <MaterialCommunityIcons name="calendar-check" size={24} color={theme.color.warning[500]} />
            </View>
            <View style={styles.metricTextContainer}>
              <ThemedText style={styles.metricValue}>{weeklyMetrics.activeDays}/7</ThemedText>
              <ThemedText style={styles.metricLabel}>Jours actifs</ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Activity Chart */}
        <Animated.View style={[styles.chartContainer, isDark && styles.chartContainerDark, chartAnimatedStyle]}>
          <ThemedText style={styles.chartTitle}>Activité quotidienne</ThemedText>

          <View style={styles.chartContent}>
            {dailyActivity.map((day, index) => {
              const dayName = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' });
              const barHeight = day.isActive ? Math.max(20, (day.timeSpent / 60) * 100) : 0;
              const barColor = day.isActive ? theme.color.primary[500] : theme.color.gray[300];

              return (
                <View key={day.date} style={styles.chartBar}>
                  <ThemedText style={styles.chartBarLabel}>{dayName}</ThemedText>
                  <View style={styles.chartBarContainer}>
                    <Animated.View 
                      style={[
                        styles.chartBarFill, 
                        { 
                          height: withDelay(index * 100, withTiming(barHeight, { duration: 1000 })),
                          backgroundColor: barColor
                        },
                        isDark && { backgroundColor: day.isActive ? theme.color.primary[400] : theme.color.gray[700] }
                      ]} 
                    />
                  </View>
                  <ThemedText style={styles.chartBarValue}>
                    {day.xp > 0 ? `${day.xp} XP` : '-'}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Performance Summary */}
        <Animated.View style={[styles.summaryContainer, isDark && styles.summaryContainerDark, summaryAnimatedStyle]}>
          <ThemedText style={styles.summaryTitle}>Résumé de la semaine</ThemedText>

          <View style={styles.summaryRow}>
            <MaterialCommunityIcons 
              name="book-open-variant" 
              size={20} 
              color={isDark ? theme.color.primary[400] : theme.color.primary[600]} 
            />
            <ThemedText style={styles.summaryText}>
              Progression des cours: <ThemedText style={styles.summaryValue}>{weeklyMetrics.coursesProgress}%</ThemedText>
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <MaterialCommunityIcons 
              name="help-circle-outline" 
              size={20} 
              color={isDark ? theme.color.primary[400] : theme.color.primary[600]} 
            />
            <ThemedText style={styles.summaryText}>
              Quiz complétés: <ThemedText style={styles.summaryValue}>{weeklyMetrics.quizzesTaken}</ThemedText>
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <MaterialCommunityIcons 
              name="check-circle-outline" 
              size={20} 
              color={isDark ? theme.color.primary[400] : theme.color.primary[600]} 
            />
            <ThemedText style={styles.summaryText}>
              Réponses correctes: <ThemedText style={styles.summaryValue}>{weeklyMetrics.correctAnswers}</ThemedText>
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <MaterialCommunityIcons 
              name="trophy-outline" 
              size={20} 
              color={isDark ? theme.color.primary[400] : theme.color.primary[600]} 
            />
            <ThemedText style={styles.summaryText}>
              XP total: <ThemedText style={styles.summaryValue}>{weeklyMetrics.totalXp}</ThemedText>
            </ThemedText>
          </View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerDark: {},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTextContainer: {},
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
  },
  chartBar: {
    alignItems: 'center',
    width: '13%',
  },
  chartBarContainer: {
    height: 120,
    width: 12,
    backgroundColor: theme.color.gray[200],
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  chartBarValue: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    marginLeft: 12,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
});

export default WeeklyPerformance;
