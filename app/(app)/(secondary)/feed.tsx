import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SecondaryFeed() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== 'light';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            Bienvenue dans l'Espace Secondaire
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
            Réseau social éducatif pour les élèves du secondaire
          </Text>
        </View>

        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
            🎯 Fonctionnalités à venir
          </Text>
          <View style={styles.featureList}>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Fil d'actualité social avec questions et réponses
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Groupes par classe et matière
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Système de gamification (XP, badges)
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Ressources pédagogiques par niveau
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Modération et contrôle parental
            </Text>
          </View>
        </View>

        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
            📚 Types de publications
          </Text>
          <View style={styles.featureList}>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Questions et demandes d'aide
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Réponses validées par des mentors
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Astuces visuelles (schémas, notes)
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Fiches résumés et documents PDF
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Vidéos courtes explicatives
            </Text>
            <Text style={[styles.feature, isDarkMode && styles.featureDark]}>
              • Défis et QCM interactifs
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
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
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.border.radius.medium,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cardTitleDark: {
    color: theme.color.gray[50],
  },
  featureList: {
    marginTop: 8,
  },
  feature: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  featureDark: {
    color: theme.color.gray[300],
  },
});