import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { LearningPaths as LearningPath } from '@/types/type';
import { useAuth } from '@/contexts/auth';
import { useProgramProgress } from "@/hooks/useProgramProgress";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const HORIZONTAL_PADDING = 16;

const LearningPathCard = ({
                            path,
                            isDarkMode,
                            isFirst,
                            index = 0
                          } : {
  path: LearningPath,
  isDarkMode: boolean,
  isFirst: boolean,
  index?: number
}) => {
  const router = useRouter();
  const { trigger } = useHaptics();
  const { user } = useAuth();
  const { totalProgress } = useProgramProgress(path.id, user?.id || "");

  // Animation values
  const pressed = useSharedValue(0);
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Calculate display values
  const displayProgress = Math.round(totalProgress);

  // Get accent color based on progress
  const getAccentColor = () => {
    if (displayProgress >= 75) {
      return theme.color.success; // Green for high progress
    } else if (displayProgress >= 25) {
      return theme.color.primary[500]; // Blue for medium progress
    } else {
      return theme.color.primary[400]; // Light blue for low progress
    }
  };

  const accentColor = getAccentColor();

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [
        { scale: cardScale.value - (pressed.value * 0.04) },
        { translateY: pressed.value * -2 }
      ],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  // Initialize animations
  useEffect(() => {
    // Entrance animation with slight delay based on index
    const delay = index * 80;

    setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 14, stiffness: 120 });

      // Animate progress bar with slight delay after card appears
      setTimeout(() => {
        progressWidth.value = withTiming(displayProgress, {
          duration: 800,
          easing: Easing.out(Easing.cubic)
        });
      }, 200);
    }, delay);
  }, [displayProgress]);

  // Handle interactions
  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, { duration: 200 });
  };

  const handlePress = () => {
    trigger(HapticType.LIGHT);
    pressed.value = withTiming(1, { duration: 100 }, () => {
      pressed.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(navigateToPath)();
      });
    });
  };

  const navigateToPath = () => {
    router.push(`/(app)/learn/${path.id}`);
  };

  return (
      <Animated.View
          style={[
            styles.cardContainer,
            animatedCardStyle,
            isFirst && { marginLeft: HORIZONTAL_PADDING / 8 }
          ]}
      >
        <TouchableOpacity
            activeOpacity={0.95}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            style={[
              styles.card,
              isDarkMode && styles.cardDark
            ]}
        >
          {/* Top accent bar with progress */}
          <View style={[styles.accentBar, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
            <Animated.View
                style={[
                  styles.progressBar,
                  { backgroundColor: accentColor },
                  animatedProgressStyle
                ]}
            />
          </View>

          <View style={styles.content}>
            {/* Header with badge */}
            <View style={styles.header}>
              <View
                  style={[
                    styles.badge,
                    { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }
                  ]}
              >
                <Text
                    style={[
                      styles.badgeText,
                      { color: accentColor }
                    ]}
                >
                  {path.quiz_count} Quiz
                </Text>
              </View>



              <View style={styles.progressContainer}>
                <Text
                    style={[
                      styles.progressText,
                      { color: accentColor },
                    ]}
                >
                  {displayProgress}%
                </Text>
                <Text
                    style={[
                      styles.progressLabel,
                      isDarkMode && styles.progressLabelDark,
                    ]}
                >
                  PROGRESS
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text
                numberOfLines={2}
                style={[
                  styles.title,
                  isDarkMode && styles.titleDark,
                ]}
            >
              {path.title}
            </Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                    name="book-outline"
                    size={16}
                    color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
                <Text
                    style={[
                      styles.statText,
                      isDarkMode && styles.statTextDark,
                    ]}
                >
                  {path.course_count} Modules
                </Text>
              </View>


              <View
                  style={[
                    styles.statusBadge,
                    displayProgress === 0
                        ? isDarkMode ? styles.notStartedDark : styles.notStarted
                        : displayProgress === 100
                            ? isDarkMode ? styles.completedDark : styles.completed
                            : isDarkMode ? styles.inProgressDark : styles.inProgress
                  ]}
              >
                <Text
                    style={[
                      styles.statusText,
                      displayProgress === 0
                          ? isDarkMode ? styles.notStartedTextDark : styles.notStartedText
                          : displayProgress === 100
                              ? isDarkMode ? styles.completedTextDark : styles.completedText
                              : isDarkMode ? styles.inProgressTextDark : styles.inProgressText
                    ]}
                >
                  {displayProgress === 0
                      ? 'PAS COMMENCER'
                      : displayProgress === 100
                          ? 'COMPLETER'
                          : 'EN COURS'
                  }
                </Text>
              </View>
            </View>

            {/* Description */}
            {path.description && (
                <Text
                    numberOfLines={2}
                    style={[
                      styles.description,
                      isDarkMode && styles.descriptionDark,
                    ]}
                >
                  {path.description}
                </Text>
            )}

            {/* Duration and continue button */}
            <View style={styles.footer}>
              <View style={styles.durationContainer}>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={15}
                    color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
                <Text
                    style={[
                      styles.durationText,
                      isDarkMode && styles.durationTextDark,
                    ]}
                >
                  {path.total_duration} min
                </Text>
              </View>

              <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: accentColor }
                  ]}
                  onPress={handlePress}
              >
                <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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
              index={index}
          />
      ))}
    </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    // paddingRight: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 16,
  },
  cardContainer: {
    width: CARD_WIDTH * 1.15,
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  accentBar: {
    height: 6,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  progressLabelDark: {
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statTextDark: {
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  notStarted: {
    backgroundColor: '#F3F4F6',
  },
  notStartedDark: {
    backgroundColor: '#374151',
  },
  inProgress: {
    backgroundColor: '#EFF6FF',
  },
  inProgressDark: {
    backgroundColor: '#1E40AF',
  },
  completed: {
    backgroundColor: '#ECFDF5',
  },
  completedDark: {
    backgroundColor: '#065F46',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notStartedText: {
    color: '#9CA3AF',
  },
  notStartedTextDark: {
    color: '#D1D5DB',
  },
  inProgressText: {
    color: '#2563EB',
  },
  inProgressTextDark: {
    color: '#93C5FD',
  },
  completedText: {
    color: '#10B981',
  },
  completedTextDark: {
    color: '#34D399',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },
  descriptionDark: {
    color: '#D1D5DB',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  durationTextDark: {
    color: '#9CA3AF',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LearningPaths;