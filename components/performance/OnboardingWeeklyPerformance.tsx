import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  SharedValue
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  PanGestureHandlerGestureEvent,
  State,
  HandlerStateChangeEvent,
  PanGestureHandlerEventPayload
} from 'react-native-gesture-handler';

import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/auth';
import { theme } from '@/constants/theme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enums for status management
enum OnboardingStatus {
  INITIALIZING = 'initializing',
  LOADING_DATA = 'loading_data',
  DATA_READY = 'data_ready',
  PRESENTATION_MODE = 'presentation_mode',
  COMPLETED = 'completed',
  ERROR = 'error'
}

enum StepStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

enum UserPerformanceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// Types
interface WeeklyMetrics {
  totalXp: number;
  xpGained: number;
  streakDays: number;
  coursesProgress: number;
  quizzesTaken: number;
  correctAnswers: number;
  timeSpent: number;
  activeDays: number;
  completedLessons: number;
  completedExercises: number;
  performanceLevel: UserPerformanceLevel;
  weeklyGoalAchieved: boolean;
}

interface DailyActivity {
  date: string;
  xp: number;
  timeSpent: number;
  isActive: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: number[];
  correctAnswer: number;
  userGuess?: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  status: StepStatus;
  isRequired: boolean;
  minRequirement?: {
    xp?: number;
    streakDays?: number;
    activeDays?: number;
  };
}

interface OnboardingState {
  status: OnboardingStatus;
  currentStepIndex: number;
  completedSteps: string[];
  userProgress: number;
  canProceed: boolean;
  errorMessage?: string;
}

interface ParticleProps {
  delay?: number;
  color?: string;
}

interface ConfettiExplosionProps {
  trigger: boolean;
  colors?: string[];
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: React.ComponentProps<typeof Text>["style"];
  onComplete?: () => void;
  showParticles?: boolean;
}

interface InteractiveQuizProps {
  question: QuizQuestion;
  onAnswer: (isCorrect: boolean) => void;
  isDark: boolean;
}

interface PulsingBadgeProps {
  children: React.ReactNode;
  pulse?: boolean;
}

interface GestureContext {
  startX: number;
}

// Particle Component
const Particle: React.FC<ParticleProps> = ({ delay = 0, color = theme.color.primary[500] }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      translateY.value = withSequence(
          withDelay(delay, withTiming(-50 - Math.random() * 100, { duration: 1500 })),
          withTiming(-150, { duration: 500 })
      );
      translateX.value = withDelay(delay, withTiming((Math.random() - 0.5) * 100, { duration: 2000 }));
      opacity.value = withSequence(
          withDelay(delay, withTiming(1, { duration: 300 })),
          withDelay(1200, withTiming(0, { duration: 500 }))
      );
      scale.value = withSequence(
          withDelay(delay, withTiming(1, { duration: 300 })),
          withDelay(1500, withTiming(0, { duration: 300 }))
      );
    };

    animate();
    const interval = setInterval(animate, 3000);
    return () => clearInterval(interval);
  }, [delay, translateY, translateX, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
      <Animated.View style={[styles.particle, animatedStyle, { backgroundColor: color }]} />
  );
};

// Confetti Component
const ConfettiExplosion: React.FC<ConfettiExplosionProps> = ({trigger, colors = [theme.color.primary[500], theme.color.success[500], theme.color.info[500], theme.color.warning[500]]}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [trigger]);

  if (!showConfetti) return null;

  return (
      <View style={styles.confettiContainer}>
        {Array.from({ length: 20 }).map((_, index) => (
            <Particle
                key={index}
                delay={index * 50}
                color={colors[index % colors.length]}
            />
        ))}
      </View>
  );
};

// Animated Counter Component
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 2000, suffix = '', prefix = '',style,onComplete, showParticles = false}) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  const updateDisplayValue = useCallback((newValue: number) => {
    setDisplayValue(newValue);
  }, []);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic)
    }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });
  }, [value, duration, animatedValue, onComplete]);

  const animatedStyleForCounter = useAnimatedStyle(() => {
    const currentValue = Math.floor(animatedValue.value);
    runOnJS(updateDisplayValue)(currentValue);
    return {};
  });

  // Call the animated style to ensure it runs
  animatedStyleForCounter;

  return (
      <View style={{ position: 'relative' }}>
        <Text style={style}>
          {prefix}{displayValue}{suffix}
        </Text>
        {showParticles && (
            <View style={styles.particleOverlay}>
              <Particle delay={0} color={theme.color.primary[500]} />
              <Particle delay={200} color={theme.color.success[500]} />
              <Particle delay={400} color={theme.color.info[500]} />
            </View>
        )}
      </View>
  );
};

// Quiz Component
const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ question, onAnswer, isDark }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const scaleAnim = useSharedValue(0);

  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 15 });
  }, [scaleAnim]);

  const handleAnswer = useCallback((answer: number) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    if (answer === question.correctAnswer) {
      setShowConfetti(true);
    }

    setTimeout(() => {
      onAnswer(answer === question.correctAnswer);
      setShowResult(false);
      setSelectedAnswer(null);
      setShowConfetti(false);
    }, 2500);
  }, [question.correctAnswer, onAnswer]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
      <Animated.View style={[styles.quizContainer, isDark && styles.quizContainerDark, animatedStyle]}>
        <ConfettiExplosion trigger={showConfetti} />

        <Text style={[styles.quizQuestion, isDark && styles.textDark]}>{question.question}</Text>

        <View style={styles.quizOptions}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.correctAnswer;
            const isWrong = showResult && isSelected && !isCorrect;

            return (
                <TouchableOpacity
                    key={index}
                    onPress={() => !showResult && handleAnswer(option)}
                    disabled={showResult}
                >
                  <View
                      style={[
                        styles.quizOption,
                        isSelected && styles.quizOptionSelected,
                        showResult && isCorrect && styles.quizOptionCorrect,
                        showResult && isWrong && styles.quizOptionWrong,
                        isDark && styles.quizOptionDark
                      ]}
                  >
                    <Text style={[
                      styles.quizOptionText,
                      isDark && styles.textDark,
                      isSelected && styles.quizOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {showResult && isCorrect && (
                        <MaterialCommunityIcons name="check-circle" size={24} color={theme.color.success[500]} />
                    )}
                    {showResult && isWrong && (
                        <MaterialCommunityIcons name="close-circle" size={24} color={theme.color.error[500]} />
                    )}
                  </View>
                </TouchableOpacity>
            );
          })}
        </View>

        {showResult && (
            <View style={[styles.quizExplanation, isDark && styles.quizExplanationDark]}>
              <Text style={[styles.quizExplanationText, isDark && styles.textDark]}>
                {question.explanation}
              </Text>
            </View>
        )}
      </Animated.View>
  );
};

// Pulsing Badge Component
const PulsingBadge: React.FC<PulsingBadgeProps> = ({ children, pulse = false }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      scale.value = withRepeat(
          withSequence(
              withTiming(1.1, { duration: 600 }),
              withTiming(1, { duration: 600 })
          ),
          -1,
          true
      );
      opacity.value = withRepeat(
          withSequence(
              withTiming(0.8, { duration: 600 }),
              withTiming(1, { duration: 600 })
          ),
          -1,
          true
      );
    } else {
      scale.value = 1;
      opacity.value = 1;
    }
  }, [pulse, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
  );
};

const OnboardingWeeklyPerformance: React.FC = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Enhanced state management
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    status: OnboardingStatus.INITIALIZING,
    currentStepIndex: 0,
    completedSteps: [],
    userProgress: 0,
    canProceed: false
  });

  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [availableSteps, setAvailableSteps] = useState<StepConfig[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  // Overview component state
  const [showParticles, setShowParticles] = useState(false);

  // Quiz component state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Animation values - définir TOUS les hooks au début
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const translateX = useSharedValue(0);

  // Styles animés - définir au début pour éviter les hooks conditionnels
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  // Helper functions - définir avant les callbacks
  const determinePerformanceLevel = useCallback((metrics: WeeklyMetrics): UserPerformanceLevel => {
    const { xpGained, streakDays, activeDays, completedLessons } = metrics;

    if (xpGained >= 500 && streakDays >= 7 && completedLessons >= 15) {
      return UserPerformanceLevel.EXPERT;
    } else if (xpGained >= 300 && streakDays >= 5 && completedLessons >= 10) {
      return UserPerformanceLevel.ADVANCED;
    } else if (xpGained >= 150 && streakDays >= 3 && completedLessons >= 5) {
      return UserPerformanceLevel.INTERMEDIATE;
    }
    return UserPerformanceLevel.BEGINNER;
  }, []);

  const generateQuizQuestions = useCallback((metrics: WeeklyMetrics): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];

    // XP question
    questions.push({
      id: '1',
      question: 'Combien de XP avez-vous gagné cette semaine ?',
      options: [metrics.xpGained - 50, metrics.xpGained, metrics.xpGained + 50, metrics.xpGained + 100],
      correctAnswer: metrics.xpGained,
      explanation: `Excellent ! Vous avez gagné exactement ${metrics.xpGained} XP cette semaine. C'est un super progrès ! 🎉`,
      difficulty: 'easy'
    });

    // Time question
    questions.push({
      id: '2',
      question: 'Quel est votre temps d\'étude total cette semaine ?',
      options: [metrics.timeSpent - 30, metrics.timeSpent, metrics.timeSpent + 30, metrics.timeSpent + 60],
      correctAnswer: metrics.timeSpent,
      explanation: `Parfait ! Vous avez étudié pendant ${metrics.timeSpent} minutes cette semaine. Continuez ainsi ! 📚`,
      difficulty: 'medium'
    });

    // Add performance-level specific questions
    if (metrics.performanceLevel === UserPerformanceLevel.ADVANCED || metrics.performanceLevel === UserPerformanceLevel.EXPERT) {
      questions.push({
        id: '3',
        question: 'Combien d\'exercices avez-vous complétés ?',
        options: [metrics.completedExercises - 3, metrics.completedExercises, metrics.completedExercises + 2, metrics.completedExercises + 5],
        correctAnswer: metrics.completedExercises,
        explanation: `Impressionnant ! ${metrics.completedExercises} exercices complétés. Vous êtes vraiment motivé(e) ! 💪`,
        difficulty: 'hard'
      });
    }

    return questions;
  }, []);

  const fetchUserData = useCallback(async (): Promise<WeeklyMetrics> => {
    try {
      setOnboardingState(prev => ({ ...prev, status: OnboardingStatus.LOADING_DATA }));

      // Simulate API call with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock data that would normally come from your backend
      const mockMetrics: WeeklyMetrics = {
        totalXp: 1250 + Math.floor(Math.random() * 500),
        xpGained: 340 + Math.floor(Math.random() * 200),
        streakDays: Math.floor(Math.random() * 7) + 1,
        coursesProgress: 65 + Math.floor(Math.random() * 30),
        quizzesTaken: 8 + Math.floor(Math.random() * 10),
        correctAnswers: 6 + Math.floor(Math.random() * 8),
        timeSpent: 120 + Math.floor(Math.random() * 120),
        activeDays: Math.floor(Math.random() * 7) + 1,
        completedLessons: 5 + Math.floor(Math.random() * 10),
        completedExercises: 10 + Math.floor(Math.random() * 10),
        performanceLevel: UserPerformanceLevel.INTERMEDIATE, // Will be calculated
        weeklyGoalAchieved: false // Will be calculated
      };

      // Calculate performance level
      mockMetrics.performanceLevel = determinePerformanceLevel(mockMetrics);
      mockMetrics.weeklyGoalAchieved = mockMetrics.xpGained >= 300; // Example goal

      // Generate daily activity
      const activity: DailyActivity[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const isActive = Math.random() > 0.2; // 80% chance of being active
        activity.push({
          date: date.toISOString().split('T')[0],
          xp: isActive ? Math.floor(Math.random() * 100) + 20 : 0,
          timeSpent: isActive ? Math.floor(Math.random() * 60) + 15 : 0,
          isActive
        });
      }

      setDailyActivity(activity);
      return mockMetrics;
    } catch (error) {
      logger.error('Error fetching user data:', error);
      setOnboardingState(prev => ({
        ...prev,
        status: OnboardingStatus.ERROR,
        errorMessage: 'Erreur lors du chargement des données. Veuillez réessayer.'
      }));
      throw error;
    }
  }, [determinePerformanceLevel]);

  const generateSteps = useCallback((metrics: WeeklyMetrics): StepConfig[] => {
    const baseSteps: StepConfig[] = [
      {
        id: 'overview',
        title: '🏆 Aperçu Hebdomadaire',
        subtitle: 'Votre activité d\'apprentissage des 7 derniers jours',
        status: StepStatus.AVAILABLE,
        isRequired: true
      },
      {
        id: 'learning',
        title: '📚 Progrès d\'Apprentissage',
        subtitle: 'Vos accomplissements cette semaine',
        status: StepStatus.AVAILABLE,
        isRequired: true
      },
      {
        id: 'activity',
        title: '📊 Activité Quotidienne',
        subtitle: 'Votre activité jour par jour',
        status: StepStatus.AVAILABLE,
        isRequired: false
      }
    ];

    // Add quiz step only for intermediate+ users
    if (metrics.performanceLevel !== UserPerformanceLevel.BEGINNER) {
      baseSteps.push({
        id: 'quiz',
        title: '🧠 Quiz Interactif',
        subtitle: 'Testez vos connaissances sur vos performances',
        status: StepStatus.AVAILABLE,
        isRequired: false,
        minRequirement: { xp: 200, activeDays: 3 }
      });
    }

    // Always add summary
    baseSteps.push({
      id: 'summary',
      title: '✨ Résumé & Récompenses',
      subtitle: 'Votre performance globale et accomplissements',
      status: StepStatus.AVAILABLE,
      isRequired: true
    });

    return baseSteps;
  }, []);

  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const markStepCompleted = useCallback((stepId: string) => {
    setOnboardingState(prev => {
      if (prev.completedSteps.includes(stepId)) {
        return prev; // Already completed
      }

      const newCompletedSteps = [...prev.completedSteps, stepId];
      return {
        ...prev,
        completedSteps: newCompletedSteps,
        userProgress: (newCompletedSteps.length / availableSteps.length) * 100
      };
    });
  }, [availableSteps.length]);

  const initializeOnboarding = useCallback(async () => {
    try {
      const metrics = await fetchUserData();
      setWeeklyMetrics(metrics);

      // Generate quiz questions and set them
      const questions = generateQuizQuestions(metrics);
      setQuizQuestions(questions);

      // Generate dynamic steps based on user performance
      const steps = generateSteps(metrics);
      setAvailableSteps(steps);

      setOnboardingState(prev => ({
        ...prev,
        status: OnboardingStatus.DATA_READY,
        canProceed: true
      }));

      // Start animations
      fadeAnim.value = withTiming(1, { duration: 800 });
      slideAnim.value = withTiming(0, { duration: 600 });

    } catch (error) {
      // Error is handled in fetchUserData
    }
  }, [fetchUserData, generateQuizQuestions, generateSteps, fadeAnim, slideAnim]);

  const getPerformanceLevelText = useCallback((level: UserPerformanceLevel): string => {
    switch (level) {
      case UserPerformanceLevel.BEGINNER: return 'Débutant 🌱';
      case UserPerformanceLevel.INTERMEDIATE: return 'Intermédiaire 🌿';
      case UserPerformanceLevel.ADVANCED: return 'Avancé 🌳';
      case UserPerformanceLevel.EXPERT: return 'Expert 🏆';
      default: return 'Débutant 🌱';
    }
  }, []);

  const getPerformanceLevelColor = useCallback((level: UserPerformanceLevel): string => {
    switch (level) {
      case UserPerformanceLevel.BEGINNER: return theme.color.info[500];
      case UserPerformanceLevel.INTERMEDIATE: return theme.color.primary[500];
      case UserPerformanceLevel.ADVANCED: return theme.color.warning[500];
      case UserPerformanceLevel.EXPERT: return theme.color.success[500];
      default: return theme.color.info[500];
    }
  }, []);

  // Calculer canGoToNextStep de manière stable
  const canGoToNextStep = useMemo((): boolean => {
    const currentStep = availableSteps[onboardingState.currentStepIndex];
    if (!currentStep) return false;

    // Check if step is required and completed
    if (currentStep.isRequired && !onboardingState.completedSteps.includes(currentStep.id)) {
      return false;
    }

    // Check if there's a next step
    return onboardingState.currentStepIndex < availableSteps.length - 1;
  }, [availableSteps, onboardingState.currentStepIndex, onboardingState.completedSteps]);

  // Navigation functions - stable callbacks
  const goToPreviousStep = useCallback(() => {
    if (onboardingState.currentStepIndex > 0 &&
        onboardingState.status !== OnboardingStatus.INITIALIZING &&
        onboardingState.status !== OnboardingStatus.LOADING_DATA) {
      setOnboardingState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        status: OnboardingStatus.DATA_READY
      }));
    }
  }, [onboardingState.currentStepIndex, onboardingState.status]);

  const goToNextStep = useCallback(() => {
    if (canGoToNextStep) {
      const currentStep = availableSteps[onboardingState.currentStepIndex];
      if (currentStep && !onboardingState.completedSteps.includes(currentStep.id)) {
        markStepCompleted(currentStep.id);
      }

      setOnboardingState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        status: prev.currentStepIndex + 1 === availableSteps.length - 1 ?
            OnboardingStatus.PRESENTATION_MODE : OnboardingStatus.DATA_READY
      }));
    }
  }, [canGoToNextStep, availableSteps, onboardingState.currentStepIndex, onboardingState.completedSteps, markStepCompleted]);

  const onGestureEnd = useCallback((event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    'worklet';
    if (event.nativeEvent.state !== State.END) {
      return;
    }
    const threshold = SCREEN_WIDTH * 0.25;

    if (event.nativeEvent.translationX > threshold &&
        onboardingState.currentStepIndex > 0 &&
        onboardingState.status !== OnboardingStatus.INITIALIZING &&
        onboardingState.status !== OnboardingStatus.LOADING_DATA) {
      translateX.value = withSpring(0);
      runOnJS(goToPreviousStep)();
    } else if (event.nativeEvent.translationX < -threshold && canGoToNextStep) {
      translateX.value = withSpring(0);
      runOnJS(goToNextStep)();
    } else {
      translateX.value = withSpring(0);
    }
  }, [onboardingState.currentStepIndex, onboardingState.status, goToPreviousStep, goToNextStep, translateX, canGoToNextStep]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setQuizCompleted(true);
        markStepCompleted('quiz');
      }
    }, 2500);
  }, [currentQuestionIndex, quizQuestions.length, markStepCompleted]);

  // Initialize onboarding on mount
  useEffect(() => {
    initializeOnboarding();
  }, [initializeOnboarding]);

  // Effect to handle step completion for overview step
  useEffect(() => {
    if (weeklyMetrics && showParticles &&
        onboardingState.status === OnboardingStatus.DATA_READY &&
        availableSteps[onboardingState.currentStepIndex]?.id === 'overview') {
      const timer = setTimeout(() => {
        markStepCompleted('overview');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showParticles, weeklyMetrics, onboardingState.status, onboardingState.currentStepIndex, availableSteps, markStepCompleted]);

  // Effect to handle step completion for learning step
  useEffect(() => {
    if (weeklyMetrics &&
        onboardingState.status === OnboardingStatus.DATA_READY &&
        availableSteps[onboardingState.currentStepIndex]?.id === 'learning') {
      const timer = setTimeout(() => {
        markStepCompleted('learning');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [weeklyMetrics, onboardingState.status, onboardingState.currentStepIndex, availableSteps, markStepCompleted]);

  // Effect to handle step completion for activity step
  useEffect(() => {
    if (onboardingState.status === OnboardingStatus.DATA_READY &&
        availableSteps[onboardingState.currentStepIndex]?.id === 'activity') {
      const timer = setTimeout(() => {
        markStepCompleted('activity');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [onboardingState.status, onboardingState.currentStepIndex, availableSteps, markStepCompleted]);

  // Render step content components - définir comme composants mémorisés
  const OverviewStep = useMemo(() => {
    if (!weeklyMetrics) return null;

    return (
        <View style={styles.stepContainer}>
          <View style={styles.overviewContainer}>
            <PulsingBadge pulse={weeklyMetrics.weeklyGoalAchieved}>
              <MaterialCommunityIcons
                  name={weeklyMetrics.weeklyGoalAchieved ? "trophy" : "star-circle"}
                  size={80}
                  color={"orange"}
              />
            </PulsingBadge>

            <AnimatedCounter
                value={weeklyMetrics.xpGained}
                duration={2000}
                suffix=" XP"
                style={[styles.mainXpText, { color: "orange" }]}
                onComplete={() => {
                  setShowParticles(true);
                }}
                showParticles={showParticles}
            />

            <Text style={[styles.overviewSubtitle, isDark && styles.textDark]}>
              gagnés cette semaine
            </Text>


            <View style={styles.overviewStatsContainer}>
              <View style={[styles.overviewStatItem, isDark && styles.overviewStatItemDark]}>
                <PulsingBadge pulse={weeklyMetrics.streakDays >= 7}>
                  <MaterialCommunityIcons
                      name="fire"
                      size={32}
                      color={weeklyMetrics.streakDays >= 7 ? theme.color.error : theme.color.primary[500]}
                  />
                </PulsingBadge>
                <AnimatedCounter
                    value={weeklyMetrics.streakDays}
                    duration={1500}
                    suffix=" jours"
                    style={[styles.overviewStatValue, isDark && styles.textDark]}
                />
                <Text style={[styles.overviewStatLabel, isDark && styles.textDark]}>
                  Série actuelle
                </Text>
              </View>

              <View style={[styles.overviewStatItem, isDark && styles.overviewStatItemDark]}>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={32}
                    color={theme.color.info[500]}
                />
                <AnimatedCounter
                    value={weeklyMetrics.timeSpent}
                    duration={1800}
                    suffix="m"
                    style={[styles.overviewStatValue, isDark && styles.textDark]}
                />
                <Text style={[styles.overviewStatLabel, isDark && styles.textDark]}>
                  Temps d'étude
                </Text>
              </View>

              <View style={[styles.overviewStatItem, isDark && styles.overviewStatItemDark]}>
                <MaterialCommunityIcons
                    name="calendar-check"
                    size={32}
                    color={theme.color.warning}
                />
                <AnimatedCounter
                    value={weeklyMetrics.activeDays}
                    duration={1600}
                    suffix="/7"
                    style={[styles.overviewStatValue, isDark && styles.textDark]}
                />
                <Text style={[styles.overviewStatLabel, isDark && styles.textDark]}>
                  Jours actifs
                </Text>
              </View>
            </View>


          </View>
        </View>
    );
  }, [weeklyMetrics, isDark, showParticles, getPerformanceLevelText, getPerformanceLevelColor]);

  const LearningStep = useMemo(() => {
    if (!weeklyMetrics) return null;

    return (
        <View style={styles.stepContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
                style={[styles.learningContainer, {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'}]}>
              <View
                  style={[styles.learningItem, isDark && styles.learningItemDark, {flex: 1, minWidth: 150, margin: 8}]}>
                <PulsingBadge pulse={weeklyMetrics.completedLessons > 5}>
                  <MaterialCommunityIcons
                      name="book-open-variant"
                      size={48}
                      color={theme.color.primary[500]}
                  />
                </PulsingBadge>
                <AnimatedCounter
                    value={weeklyMetrics.completedLessons}
                    duration={1700}
                    style={[styles.learningValue, {color: theme.color.primary[500]}]}
                />
                <Text style={[styles.learningLabel, isDark && styles.textDark]}>
                  Cours complétés
                </Text>
              </View>

              <View
                  style={[styles.learningItem, isDark && styles.learningItemDark, {flex: 1, minWidth: 150, margin: 8}]}>
                <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={48}
                    color={"orange"}
                />
                <AnimatedCounter
                    value={weeklyMetrics.quizzesTaken}
                    duration={1400}
                    style={[styles.learningValue, {color: "orange"}]}
                />
                <Text style={[styles.learningLabel, isDark && styles.textDark]}>
                  Quiz complétés
                </Text>
              </View>

              <View
                  style={[styles.learningItem, isDark && styles.learningItemDark, {flex: 1, minWidth: 150, margin: 8}]}>
                <MaterialCommunityIcons
                    name="pencil-outline"
                    size={48}
                    color={theme.color.info[500]}
                />
                <AnimatedCounter
                    value={weeklyMetrics.completedExercises}
                    duration={1900}
                    style={[styles.learningValue, {color: theme.color.info[500]}]}
                />
                <Text style={[styles.learningLabel, isDark && styles.textDark]}>
                  Exercices complétés
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
    );
  }, [weeklyMetrics, isDark]);

  const ActivityStep = useMemo(() => (
      <View style={styles.stepContainer}>
        <View style={styles.activityContainer}>
          <View style={styles.chartContent}>
            {dailyActivity.map((day, index) => {
              const dayName = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' });
              const maxBarHeight = 120;
              const maxDailyXp = Math.max(...dailyActivity.map(d => d.xp));
              const barHeight = maxDailyXp > 0 ? Math.max(15, (day.xp / maxDailyXp) * maxBarHeight) : 0;

              return (
                  <View
                      key={day.date}
                      style={styles.chartBar}
                  >
                    <Text style={[styles.chartBarLabel, isDark && styles.textDark]}>{dayName}</Text>
                    <View style={[styles.chartBarContainer, isDark && styles.chartBarContainerDark]}>
                      <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: barHeight,
                              backgroundColor: day.xp > 0 ? theme.color.primary[500] :
                                  isDark ? theme.color.gray[700] : theme.color.gray[300]
                            }
                          ]}
                      />
                    </View>
                    <Text style={[styles.chartBarValue, isDark && styles.textDark]}>
                      {day.xp > 0 ? `${day.xp}` : '-'}
                    </Text>
                  </View>
              );
            })}
          </View>

          <View style={styles.activityLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: theme.color.primary[500] }]} />
              <Text style={[styles.legendText, isDark && styles.textDark]}>Jours actifs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: isDark ? theme.color.gray[700] : theme.color.gray[300] }]} />
              <Text style={[styles.legendText, isDark && styles.textDark]}>Jours inactifs</Text>
            </View>
          </View>
        </View>
      </View>
  ), [dailyActivity, isDark]);

  const QuizStep = useMemo(() => {
    const showConfetti = quizCompleted && score > 0;
    const showPulse = quizCompleted && score === quizQuestions.length;

    if (quizCompleted) {
      return (
          <View style={styles.stepContainer}>
            <View style={styles.quizResultContainer}>
              <ConfettiExplosion trigger={showConfetti}/>
              <PulsingBadge pulse={showPulse}>
                <MaterialCommunityIcons
                    name={score === quizQuestions.length ? "trophy" : "medal"}
                    size={80}
                    color={score === quizQuestions.length ? theme.color.warning[500] : theme.color.gray[500]}
                />
              </PulsingBadge>
              <Text style={[styles.quizResultTitle, isDark && styles.textDark]}>
                Quiz Terminé !
              </Text>
              <Text style={[styles.quizResultScore, { color: theme.color.primary[500] }]}>
                Score : {score}/{quizQuestions.length}
              </Text>
              <Text style={[styles.quizResultMessage, isDark && styles.textDark]}>
                {score === quizQuestions.length ?
                    "🎉 Parfait ! Vous connaissez bien vos statistiques !" :
                    "👍 Pas mal ! Continuez à suivre vos progrès !"
                }
              </Text>
              <TouchableOpacity
                  style={[styles.retryButton, isDark && styles.retryButtonDark]}
                  onPress={() => {
                    setCurrentQuestionIndex(0);
                    setQuizCompleted(false);
                    setScore(0);
                  }}
              >
                <Text style={styles.retryButtonText}>Refaire le Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
      );
    }

    return (
        <View style={styles.stepContainer}>
          <View style={styles.quizProgressContainer}>
            <Text style={[styles.quizProgressText, isDark && styles.textDark]}>
              Question {currentQuestionIndex + 1} sur {quizQuestions.length}
            </Text>
            <View style={[styles.quizProgressBar, isDark && styles.quizProgressBarDark]}>
              <View
                  style={[
                    styles.quizProgressFill,
                    {
                      width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`,
                      backgroundColor: theme.color.primary[500]
                    }
                  ]}
              />
            </View>
          </View>

          {quizQuestions.length > 0 && (
              <InteractiveQuiz
                  question={quizQuestions[currentQuestionIndex]}
                  onAnswer={handleQuizAnswer}
                  isDark={isDark}
              />
          )}
        </View>
    );
  }, [quizCompleted, score, quizQuestions, isDark, currentQuestionIndex, handleQuizAnswer]);

  const SummaryStep = useMemo(() => {
    if (!weeklyMetrics) return null;

    return (
        <View style={styles.stepContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.summaryContainer}>
              {/* Achievement Badges */}
              <View style={styles.badgesSection}>
                <Text style={[styles.badgesSectionTitle, isDark && styles.textDark]}>🏆 Récompenses Gagnées</Text>
                <View style={styles.badgesContainer}>
                  <PulsingBadge pulse={weeklyMetrics.streakDays >= 7}>
                    <View style={[styles.badge, { backgroundColor: theme.color.error[500] }]}>
                      <MaterialCommunityIcons name="fire" size={24} color="#FFF" />
                      <Text style={styles.badgeText}>Série de Feu</Text>
                    </View>
                  </PulsingBadge>

                  <PulsingBadge pulse={weeklyMetrics.completedLessons >= 8}>
                    <View style={[styles.badge, { backgroundColor: theme.color.primary[500] }]}>
                      <MaterialCommunityIcons name="school" size={24} color="#FFF" />
                      <Text style={styles.badgeText}>Super Apprenant</Text>
                    </View>
                  </PulsingBadge>

                  <PulsingBadge pulse={weeklyMetrics.activeDays >= 6}>
                    <View style={[styles.badge, { backgroundColor: theme.color.success[500] }]}>
                      <MaterialCommunityIcons name="calendar-check" size={24} color="#FFF" />
                      <Text style={styles.badgeText}>Assidu</Text>
                    </View>
                  </PulsingBadge>

                  {weeklyMetrics.weeklyGoalAchieved && (
                      <PulsingBadge pulse={true}>
                        <View style={[styles.badge, { backgroundColor: theme.color.warning[500] }]}>
                          <MaterialCommunityIcons name="trophy" size={24} color="#FFF" />
                          <Text style={styles.badgeText}>Objectif Atteint</Text>
                        </View>
                      </PulsingBadge>
                  )}
                </View>
              </View>

              {/* Summary Stats */}
              <View style={styles.summaryStats}>
                {[
                  { icon: 'trophy-outline', label: 'XP total', value: weeklyMetrics.totalXp },
                  { icon: 'star-outline', label: 'XP cette semaine', value: weeklyMetrics.xpGained },
                  { icon: 'book-open-variant', label: 'Leçons complétées', value: weeklyMetrics.completedLessons },
                  { icon: 'help-circle-outline', label: 'Quiz complétés', value: weeklyMetrics.quizzesTaken },
                  { icon: 'check-circle-outline', label: 'Réponses correctes', value: weeklyMetrics.correctAnswers },
                  { icon: 'pencil-outline', label: 'Exercices complétés', value: weeklyMetrics.completedExercises },
                  { icon: 'clock-outline', label: 'Temps d\'étude', value: formatTime(weeklyMetrics.timeSpent), isTime: true },
                  { icon: 'calendar-check', label: 'Jours actifs', value: `${weeklyMetrics.activeDays}/7`, isRatio: true }
                ].map((item, index) => (
                    <View
                        key={index}
                        style={[styles.summaryRow, isDark && styles.summaryRowDark]}
                    >
                      <MaterialCommunityIcons
                          name={item.icon as any}
                          size={24}
                          color={theme.color.primary[500]}
                      />
                      <Text style={[styles.summaryText, isDark && styles.textDark]}>
                        {item.label}:
                      </Text>
                      <View style={styles.summaryValueContainer}>
                        {item.isTime || item.isRatio ? (
                            <Text style={[styles.summaryValue, { color: theme.color.primary[500] }]}>{item.value}</Text>
                        ) : (
                            <AnimatedCounter
                                value={typeof item.value === 'number' ? item.value : 0}
                                duration={1500}
                                style={[styles.summaryValue, { color: theme.color.primary[500] }]}
                            />
                        )}
                      </View>
                    </View>
                ))}
              </View>

              <TouchableOpacity
                  style={[styles.completeButton, isDark && styles.completeButtonDark]}
                  onPress={() => {
                    markStepCompleted('summary');
                    setOnboardingState(prev => ({ ...prev, status: OnboardingStatus.COMPLETED }));
                  }}
              >
                <Text style={styles.completeButtonText}>Terminer l'Onboarding</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
    );
  }, [weeklyMetrics, isDark, formatTime, markStepCompleted]);

  // Error state
  if (onboardingState.status === OnboardingStatus.ERROR) {
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={80} color={theme.color.error[500]} />
            <Text style={[styles.errorTitle, isDark && styles.textDark]}>Oops! Une erreur s'est produite</Text>
            <Text style={[styles.errorMessage, isDark && styles.textDark]}>
              {onboardingState.errorMessage}
            </Text>
            <TouchableOpacity
                style={[styles.retryButton, isDark && styles.retryButtonDark]}
                onPress={initializeOnboarding}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  }

  // Loading state
  if (onboardingState.status === OnboardingStatus.INITIALIZING ||
      onboardingState.status === OnboardingStatus.LOADING_DATA ||
      !weeklyMetrics) {
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
            <Text style={[styles.loadingText, isDark && styles.textDark]}>
              {onboardingState.status === OnboardingStatus.INITIALIZING ?
                  'Initialisation...' : 'Analyse de vos performances...'}
            </Text>
            <View style={styles.loadingProgress}>
              <Text style={[styles.loadingProgressText, isDark && styles.textDark]}>
                {onboardingState.userProgress.toFixed(0)}% complété
              </Text>
            </View>
            <View style={styles.loadingParticles}>
              <Particle delay={0} color={theme.color.primary[500]} />
              <Particle delay={200} color={theme.color.success[500]} />
              <Particle delay={400} color={theme.color.info[500]} />
            </View>
          </View>
        </View>
    );
  }

  // Completed state
  if (onboardingState.status === OnboardingStatus.COMPLETED) {
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.completedContainer}>
            <ConfettiExplosion trigger={true} />
            <MaterialCommunityIcons name="check-circle" size={100} color={theme.color.primary["500"]}/>
            <Text style={[styles.completedTitle, isDark && styles.textDark]}>Félicitations !</Text>
            <Text style={[styles.completedMessage, isDark && styles.textDark]}>
              Vous avez terminé votre onboarding hebdomadaire avec succès !
            </Text>
            <TouchableOpacity
                style={[styles.completeButton, isDark && styles.completeButtonDark]}
                onPress={() => {
                  // Navigate back or close modal
                  Alert.alert('Onboarding terminé', 'Vous pouvez maintenant continuer votre apprentissage !');
                }}
            >
              <Text style={styles.completeButtonText}>Continuer l'apprentissage</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  }

  const currentStep = availableSteps[onboardingState.currentStepIndex];
  const isPreviousDisabled = onboardingState.currentStepIndex === 0;

  if (!currentStep) return null;

  // Render current step content
  const renderCurrentStepContent = () => {
    switch (currentStep.id) {
      case 'overview':
        return OverviewStep;
      case 'learning':
        return LearningStep;
      case 'activity':
        return ActivityStep;
      case 'quiz':
        return QuizStep;
      case 'summary':
        return SummaryStep;
      default:
        return null;
    }
  };

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, isDark && styles.containerDark]}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, isDark && styles.textDark]}>{currentStep.title}</Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{currentStep.subtitle}</Text>
            </View>
            <View style={[styles.stepIndicator, isDark && styles.stepIndicatorDark]}>
              <Text style={[styles.stepIndicatorText, isDark && styles.stepIndicatorTextDark]}>
                {onboardingState.currentStepIndex + 1}/{availableSteps.length}
              </Text>
            </View>
          </View>


          {/* Step Content with Swipe Gesture */}
          <PanGestureHandler
              onGestureEvent={((event) => {
                'worklet';
                translateX.value = event.nativeEvent.translationX;
              })}
              onHandlerStateChange={onGestureEnd}
          >
            <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
              {renderCurrentStepContent()}
            </Animated.View>
          </PanGestureHandler>

          {/* Navigation */}
          <View style={[styles.navigationContainer, isDark && styles.navigationContainerDark]}>
            <TouchableOpacity
                style={[
                  styles.navButton,
                  isPreviousDisabled && styles.navButtonDisabled,
                  isDark && styles.navButtonDark
                ]}
                onPress={goToPreviousStep}
                disabled={isPreviousDisabled}
            >
              <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={isPreviousDisabled
                      ? theme.color.gray[400] : (isDark ? '#FFFFFF' : '#1A1A1A')}
              />
              <Text style={[
                styles.navButtonText,
                isDark && styles.textDark,
                isPreviousDisabled && styles.navButtonTextDisabled
              ]}>
                Précédent
              </Text>
            </TouchableOpacity>

            <View style={styles.dotsContainer}>
              {availableSteps.map((step, index) => (
                  <View
                      key={step.id}
                      style={[
                        styles.dot,
                        index === onboardingState.currentStepIndex && styles.activeDot,
                        isDark && styles.dotDark,
                        onboardingState.completedSteps.includes(step.id) && styles.completedDot
                      ]}
                  />
              ))}
            </View>

            <TouchableOpacity
                style={[
                  styles.navButton,
                  !canGoToNextStep && styles.navButtonDisabled,
                  isDark && styles.navButtonDark
                ]}
                onPress={goToNextStep}
                disabled={!canGoToNextStep}
            >
              <Text style={[
                styles.navButtonText,
                isDark && styles.textDark,
                !canGoToNextStep && styles.navButtonTextDisabled
              ]}>
                Suivant
              </Text>
              <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={!canGoToNextStep ? theme.color.gray[400] : (isDark ? '#FFFFFF' : '#1A1A1A')}
              />
            </TouchableOpacity>
          </View>

          {/* Swipe Hint */}
          {onboardingState.currentStepIndex === 0 && (
              <View style={[styles.swipeHint, isDark && styles.swipeHintDark]}>
                <MaterialCommunityIcons
                    name="gesture-swipe-horizontal"
                    size={20}
                    color={theme.color.gray[500]}
                />
                <Text style={styles.swipeHintText}>
                  Swipez pour naviguer
                </Text>
              </View>
          )}
        </View>
      </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  loadingProgress: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingProgressText: {
    fontSize: 16,
    opacity: 0.7,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  loadingParticles: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  completedMessage: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
    lineHeight: 26,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: theme.color.gray[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.gray[700],
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    fontFamily: theme.typography.fontFamily,
    color: theme.color.gray[600],
  },
  subtitleDark: {
    color: theme.color.gray[400],
  },
  stepIndicator: {
    backgroundColor: theme.color.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
  },
  stepIndicatorDark: {
    backgroundColor: theme.color.primary[900],
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.primary[700],
    fontFamily: theme.typography.fontFamily,
  },
  stepIndicatorTextDark: {
    color: theme.color.primary[300],
  },
  progressBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.color.gray[50],
  },
  progressBarHeaderDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.color.gray[200],
    borderRadius: theme.border.radius.small,
    marginRight: 12,
  },
  progressBarTrackDark: {
    backgroundColor: theme.color.gray[700],
  },
  progressBarProgress: {
    height: '100%',
    borderRadius: theme.border.radius.small,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.color.gray[50],
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  navigationContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderTopColor: theme.color.gray[700],
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.border.radius.small,
    minWidth: 100,
    backgroundColor: theme.color.gray[100],
  },
  navButtonDark: {
    backgroundColor: theme.color.gray[800],
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  navButtonTextDisabled: {
    opacity: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.gray[300],
    marginHorizontal: 4,
  },
  dotDark: {
    backgroundColor: theme.color.gray[600],
  },
  activeDot: {
    backgroundColor: theme.color.primary[500],
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completedDot: {
    backgroundColor: theme.color.success[500],
  },
  swipeHint: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
  },
  swipeHintDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeHintText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: theme.typography.fontFamily,
  },
  textDark: {
    color: "#FFFFFF",
  },

  // Particle styles
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  particleOverlay: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -3 }],
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },

  // Overview styles
  overviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mainXpText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
  },
  overviewSubtitle: {
    fontSize: 18,
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  goalAchievedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.success[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.color.success[200],
  },
  goalAchievedBannerDark: {
    backgroundColor: theme.color.success[900],
    borderColor: theme.color.success[700],
  },
  goalAchievedText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.success[700],
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily,
  },
  goalAchievedTextDark: {
    color: theme.color.success[300],
  },
  overviewStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  overviewStatItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    flex: 1,
    minWidth: 90,
  },
  overviewStatItemDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  overviewStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  overviewStatLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  performanceBadge: {
    backgroundColor: theme.color.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    marginTop: 20,
    borderWidth: 2,
  },
  performanceBadgeDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  performanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },

  // Learning styles
  learningContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 24,
  },
  learningItem: {
    alignItems: 'center',
    padding: 20,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    minWidth: 200,
    width: '100%',
    maxWidth: 300,
  },
  learningItemDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  learningValue: {
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
  },
  learningLabel: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },

  // Activity styles
  activityContainer: {
    padding: 20,
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 40,
  },
  chartBarContainer: {
    height: 120,
    width: 16,
    backgroundColor: theme.color.gray[200],
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginVertical: 8,
  },
  chartBarContainerDark: {
    backgroundColor: theme.color.gray[700],
  },
  chartBarFill: {
    width: '100%',
    borderRadius: theme.border.radius.small,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  chartBarValue: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  activityLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },

  // Quiz styles
  quizProgressContainer: {
    marginBottom: 24,
  },
  quizProgressText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  quizProgressBar: {
    height: 8,
    backgroundColor: theme.color.gray[200],
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
  },
  quizProgressBarDark: {
    backgroundColor: theme.color.gray[700],
  },
  quizProgressFill: {
    height: '100%',
    borderRadius: theme.border.radius.small,
  },
  quizContainer: {
    padding: 24,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    margin: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  quizContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  quizQuestion: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[50],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quizOptionDark: {
    backgroundColor: theme.color.gray[800],
  },
  quizOptionSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[50],
  },
  quizOptionCorrect: {
    borderColor: theme.color.success[500],
    backgroundColor: theme.color.success[50],
  },
  quizOptionWrong: {
    borderColor: theme.color.error[500],
    backgroundColor: theme.color.error[50],
  },
  quizOptionText: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  quizOptionTextSelected: {
    color: theme.color.primary[700],
    fontWeight: '600',
  },
  quizExplanation: {
    marginTop: 20,
    padding: 16,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.info[50],
    borderWidth: 1,
    borderColor: theme.color.info[200],
  },
  quizExplanationDark: {
    backgroundColor: theme.color.info[900],
    borderColor: theme.color.info[700],
  },
  quizExplanationText: {
    fontSize: 16,
    color: theme.color.info[700],
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: theme.typography.fontFamily,
  },
  quizResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  quizResultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  quizResultScore: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: theme.typography.fontFamily,
  },
  quizResultMessage: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
    lineHeight: 26,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  retryButton: {
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.border.radius.small,
  },
  retryButtonDark: {
    backgroundColor: theme.color.primary[600],
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },

  // Summary styles
  summaryContainer: {
    padding: 20,
  },
  badgesSection: {
    marginBottom: 32,
  },
  badgesSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.border.radius.small,
    minWidth: 80,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  summaryStats: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
  },
  summaryRowDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  summaryText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    color: "#1A1A1A",
  },
  summaryValueContainer: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
  },
  completeButton: {
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: theme.border.radius.small,
    marginTop: 32,
    alignItems: 'center',
  },
  completeButtonDark: {
    backgroundColor: theme.color.primary[600],
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },
});

export default OnboardingWeeklyPerformance;
