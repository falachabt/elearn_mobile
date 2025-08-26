import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import OnboardingWeeklyPerformance from '@/components/performance/OnboardingWeeklyPerformance';
import { useColorScheme } from '@/hooks/useColorScheme';
import { theme } from '@/constants/theme';

const WeeklyPerformancePage = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Performances Hebdomadaires',
          headerStyle: {
            backgroundColor: isDark ? theme.color.dark.background.secondary : '#FFFFFF',
          },
          headerTintColor: isDark ? '#FFFFFF' : '#111827',
          headerShadowVisible: false,
        }}
      />
      <OnboardingWeeklyPerformance />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 60
  },
});

export default WeeklyPerformancePage;
