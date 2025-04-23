import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  nextReview?: Date;
}

interface FlashcardStats {
  correct: number;
  incorrect: number;
  skipped: number;
  totalCards: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;

const FlashcardSystem = () => {
  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: '1',
      question: 'What is React Native?',
      answer: 'A framework for building native apps using React',
      difficulty: 'medium',
    },
    {
      id: '2',
      question: 'What is JSX?',
      answer: 'A syntax extension for JavaScript that looks similar to XML or HTML',
      difficulty: 'easy',
    },
    // Add more cards here
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<FlashcardStats>({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    totalCards: cards.length,
  });

  const position = useRef(new Animated.ValueXY()).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Card flip animation
  const flipCard = () => {
    setShowAnswer(!showAnswer);
    Animated.spring(flipAnimation, {
      toValue: showAnswer ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // Swipe animations and gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        // Add rotation based on swipe distance
        Animated.event([{ dx: rotation }], {
          useNativeDriver: false,
        })(event, gesture);
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));

    // Haptic feedback based on direction
    if (direction === 'right') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onSwipeComplete = (direction: 'left' | 'right') => {
    const item = cards[currentIndex];
    direction === 'right'
      ? setStats(prev => ({ ...prev, correct: prev.correct + 1 }))
      : setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));

    setCurrentIndex(prevIndex => prevIndex + 1);
    position.setValue({ x: 0, y: 0 });
    setShowAnswer(false);
    flipAnimation.setValue(0);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = rotation.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const renderCards = () => {
    if (currentIndex >= cards.length) {
      return (
        <View style={styles.completedContainer}>
          <MaterialCommunityIcons 
            name="trophy" 
            size={64} 
            color={theme.color.primary[500]} 
          />
          <Text style={[styles.completedText, isDark && styles.textDark]}>
            Flashcards Completed!
          </Text>
          <View style={styles.statsContainer}>
            <StatItem 
              icon="check-circle" 
              value={stats.correct} 
              label="Correct" 
              color={theme.color.success} 
            />
            <StatItem 
              icon="close-circle" 
              value={stats.incorrect} 
              label="Incorrect" 
              color={theme.color.error} 
            />
            <StatItem 
              icon="skip-next" 
              value={stats.skipped} 
              label="Skipped" 
              color={theme.color.warning} 
            />
          </View>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => {
              setCurrentIndex(0);
              setStats({ correct: 0, incorrect: 0, skipped: 0, totalCards: cards.length });
            }}
          >
            <Text style={styles.resetButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return cards
      .map((card, index) => {
        if (index < currentIndex) return null;
        if (index === currentIndex) {
          return (
            <Animated.View
              key={card.id}
              style={[getCardStyle(), styles.cardContainer]}
              {...panResponder.panHandlers}
            >
              <TouchableOpacity 
                style={[styles.card, isDark && styles.cardDark]} 
                onPress={flipCard}
                activeOpacity={0.9}
              >
                <Animated.View
                  style={[
                    styles.cardFace,
                    { transform: [{ rotateY: frontInterpolate }] },
                  ]}
                >
                  <Text style={[styles.cardText, isDark && styles.textDark]}>
                    {card.question}
                  </Text>
                  <Text style={styles.tapHint}>Tap to flip</Text>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.cardFace,
                    styles.cardBack,
                    { transform: [{ rotateY: backInterpolate }] },
                  ]}
                >
                  <Text style={[styles.cardText, isDark && styles.textDark]}>
                    {card.answer}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          );
        }
        return (
          <View
            key={card.id}
            style={[
              styles.cardContainer,
              // { top: 10 * (index - currentIndex) },
            ]}
          >
            <View style={[styles.card, isDark && styles.cardDark]}>
              <Text style={[styles.cardText, isDark && styles.textDark]}>
                {card.question}
              </Text>
            </View>
          </View>
        );
      })
      .reverse();
  };

  const StatItem = ({ icon, value, label, color }: { 
    icon: string; 
    value: number; 
    label: string; 
    color: string; 
  }) => (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text style={[styles.statValue, isDark && styles.textDark]}>{value}</Text>
      <Text style={[styles.statLabel, isDark && styles.textDark]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, isDark && styles.textDark]}>
          Flashcards ({currentIndex + 1}/{cards.length})
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(currentIndex / cards.length) * 100}%` }
            ]} 
          />
        </View>
      </View>
      <View style={styles.cardArea}>{renderCards()}</View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.incorrectButton]}
          // onPress={() => forceSwipe('left')}
        >
          <MaterialCommunityIcons name="close" size={32} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.skipButton]}
          onPress={() => {
            setCurrentIndex(prev => prev + 1);
            setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
          }}
        >
          <MaterialCommunityIcons name="skip-next" size={32} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.correctButton]}
          onPress={() => forceSwipe('right')}
        >
          <MaterialCommunityIcons name="check" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 80
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.color.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.color.primary[500],
    borderRadius: 2,
  },
  cardArea: {
    flex: 1,
    padding: 16,
  },
  cardContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.medium,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  cardFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    // top: 0,
    // left: 0,
    // right: 0,
    // bottom: 0,
  },
  cardText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 20,
    textAlign: 'center',
    color: '#1F2937',
  },
  tapHint: {
    position: 'absolute',
    bottom: 20,
    color: theme.color.gray[400],
    fontFamily : theme.typography.fontFamily,
fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  incorrectButton: {
    backgroundColor: theme.color.error,
  },
  skipButton: {
    backgroundColor: theme.color.warning,
  },
  correctButton: {
    backgroundColor: theme.color.success,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completedText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    color: '#1F2937',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily : theme.typography.fontFamily,
fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    color: '#1F2937',
  },
  statLabel: {
    fontFamily : theme.typography.fontFamily,
fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: theme.color.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.border.radius.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontFamily : theme.typography.fontFamily,
fontSize: 16,
    fontWeight: '600',
  },
  textDark: {
    color: theme.color.gray[200],
  },
});



export default FlashcardSystem;