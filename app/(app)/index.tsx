import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import TopBar from '@/components/TopBar';
import { theme } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/auth';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_MARGIN = 12;
const GOAL_CARD_WIDTH = (width - 2 * HORIZONTAL_PADDING - 2 * CARD_MARGIN) / 3;
const PATH_CARD_WIDTH = width * 0.7;

export default function Index() {
  const { user } = useAuth();
  const userName = "John Doe";
  const streaks = 0;
  const xp = 0;

  return (
    <View style={styles.container}>
      <TopBar
        userName={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()}
        streaks={streaks}
        xp={xp}
        onChangeProgram={ () => {} }
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.welcomeTitle}>
            Bonjour {user?.firstname} 👋
          </Text>
          <Text numberOfLines={1} style={styles.welcomeSubtitle}>
            Prêt à continuer votre apprentissage ?
          </Text>
        </View>
       
        {/* Current Course */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text numberOfLines={1} style={styles.sectionTitle}>En cours</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>
                <Link href={"/(app)/courses"} >
                Tout voir
                </Link> 
                </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.currentCourseCard}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <View style={styles.courseContent}>
              <View style={styles.playIconContainer}>
                <MaterialCommunityIcons name="play" size={24} color="#FFF" />
              </View>
              <View style={styles.courseTitleContainer}>
                <Text numberOfLines={1} style={styles.courseTitle}>
                  Développement Mobile
                </Text>
                <Text numberOfLines={1} style={styles.lessonProgress}>
                  Leçon 3 • 60% complété
                </Text>
              </View>
              <TouchableOpacity style={styles.continueButton}>
                <Text style={styles.continueText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily Goals */}
        <View style={styles.section}>
          <Text numberOfLines={1} style={styles.sectionTitle}>
            Objectifs du jour
          </Text>
          <View style={styles.goalsRow}>
            {[
              { icon: 'lightning-bolt', title: 'Minutes', current: 15, total: 30, unit: 'min' },
              { icon: 'star', title: 'Points XP', current: 100, total: 150, unit: 'XP' },
              { icon: 'medal', title: 'Exercices', current: 3, total: 5, unit: 'ex' }
            ].map((goal, index) => (
              <View key={index} style={styles.goalCard}>
                <View style={styles.goalIcon}>
                  <MaterialCommunityIcons 
                    name={goal.icon as any} 
                    size={22} 
                    color={theme.color.primary[500]} 
                  />
                </View>
                <Text numberOfLines={2} style={styles.goalTitle}>
                  {goal.title}
                </Text>
                <View style={styles.goalProgressBar}>
                  <View style={[styles.goalProgressFill, { 
                    width: `${(goal.current/goal.total) * 100}%` 
                  }]} />
                </View>
                <Text style={styles.goalMetrics}>
                  <Text style={styles.currentValue}>{goal.current}</Text>
                  <Text style={styles.totalValue}>/{goal.total} {goal.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Learning Paths */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text numberOfLines={1} style={styles.sectionTitle}>
              Parcours recommandés
            </Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Tout voir</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pathsScroll}
          >
            {[
              { title: 'Développement Frontend', duration: '8 semaines', level: 'Débutant' },
              { title: 'React Native Avancé', duration: '6 semaines', level: 'Intermédiaire' }
            ].map((path, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.pathCard, index === 0 && styles.firstPathCard]}
              >
                <View style={styles.levelTag}>
                  <Text style={styles.levelText}>{path.level}</Text>
                </View>
                <Image
                  source={{ uri: 'https://picsum.photos/400/240' }}
                  style={styles.pathImage}
                />
                <View style={styles.pathDetails}>
                  <Text numberOfLines={1} style={styles.pathTitle}>
                    {path.title}
                  </Text>
                  <View style={styles.durationRow}>
                    <MaterialCommunityIcons 
                      name="clock-outline" 
                      size={16} 
                      color="#666" 
                    />
                    <Text numberOfLines={1} style={styles.duration}>
                      {path.duration}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
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
  lessonProgress: {
    fontSize: 14,
    color: '#666',
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
  pathsScroll: {
    paddingLeft: HORIZONTAL_PADDING,
    marginLeft: -HORIZONTAL_PADDING,
    paddingRight: HORIZONTAL_PADDING,
  },
  pathCard: {
    width: PATH_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  firstPathCard: {
    marginLeft: 0,
  },
  levelTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pathImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  pathDetails: {
    padding: 12,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
});