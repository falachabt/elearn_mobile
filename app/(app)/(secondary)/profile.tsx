import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SecondaryProfile() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== 'light';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Mon Profil
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Fonctionnalité en développement - XP, badges, progression, statistiques
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.light.background.primary,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  subtitleDark: {
    color: theme.color.gray[300],
  },
});