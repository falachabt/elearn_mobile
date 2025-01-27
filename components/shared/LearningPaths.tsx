import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { LearningPaths as LearningPath } from '@/types/type';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const HORIZONTAL_PADDING = 16;

const LearningPathCard = ({ path, isDarkMode, isFirst } : { path : LearningPath, isDarkMode : boolean, isFirst: boolean }) => {
  const progress = path.course_count ? Math.round(((path?.quiz_count || 0) / path.course_count) * 100) : 0;
const router = useRouter();
  return (
      <TouchableOpacity onPress={ () => { router.push(`/(app)/learn/${path.id}`) } }  style={[
        styles.card, 
        isDarkMode && styles.cardDark
      ]}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `https://api.dicebear.com/9.x/thumbs/png?seed=${path.title}` }}
            style={styles.image}
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{path.quiz_count} Quiz</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.content}>
          <Text numberOfLines={2} style={[styles.title, isDarkMode && styles.titleDark]}>
            {path.title}
          </Text>

          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={theme.color.gray[500]} />
              <Text style={styles.metadataText}>{path.total_duration} min</Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="book-outline" size={16} color={theme.color.gray[500]} />
              <Text style={styles.metadataText}>{path.course_count} Courses</Text>
            </View>
          </View>

          {path.description && (
            <Text numberOfLines={2} style={[styles.description, isDarkMode && styles.descriptionDark]}>
              {path.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
  );
};

const LearningPaths = ({ programs, isDarkMode } : { programs : LearningPath[], isDarkMode : boolean }) => (
  <ScrollView 
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}
  >
    {programs?.map((path, index) => (
      <LearningPathCard 
        key={path.id+index} 
        path={path} 
        isDarkMode={isDarkMode}
        isFirst={index === 0}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    paddingRight: HORIZONTAL_PADDING,
    paddingVertical: 8,
    gap: theme.spacing.small
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    borderColor: theme.color.border,
    borderWidth: theme.border.width.thin,
    
    elevation: 1,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.color.primary[500],
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 14,
    color: theme.color.gray[500],
  },
  description: {
    fontSize: 14,
    color: theme.color.gray[600],
    lineHeight: 20,
  },
  descriptionDark: {
    color: theme.color.gray[300],
  },
});

export default LearningPaths;