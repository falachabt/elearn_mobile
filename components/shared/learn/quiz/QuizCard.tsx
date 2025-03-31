import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import {QUIZ_CATEGORY_COLORS, QUIZ_CATEGORY_ICONS} from "@/components/shared/learn/quiz/QuizCategoryFilter";

// Get screen width to calculate ideal card width
const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 24; // Two cards per row with padding

// Define types for component props
interface QuizCardProps {
    quizItem: {
        quizId: number;
        lpId: string;
        quiz: {
            id: number;
            name: string;
            category?: {
                id?: number;
                name: string;
            };
            quiz_questions?: Array<{ id: number }>;
            course?: {
                id: number;
                name: string;
            };
        };
        isPinned?: boolean;
        progress?: number;
    };
    pdId: string;
    isDark?: boolean;
    index?: number;
}

const EnhancedQuizCard: React.FC<QuizCardProps> = ({ quizItem, pdId, isDark = false, index = 0 }) => {
    const router = useRouter();
    const { trigger } = useHaptics();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Extract quiz details
    const { quiz, isPinned, progress = 0 } = quizItem;
    const questions = quiz?.quiz_questions?.length || 0;
    const categoryName = quiz?.category?.name || 'default';

    // Get category color and icon
   const categoryColor = QUIZ_CATEGORY_COLORS[categoryName as keyof typeof QUIZ_CATEGORY_COLORS] || QUIZ_CATEGORY_COLORS.default;
   const categoryIcon = QUIZ_CATEGORY_ICONS[categoryName as keyof typeof QUIZ_CATEGORY_ICONS] || QUIZ_CATEGORY_ICONS.default;
    // Animation effects
    useEffect(() => {
        // Delay based on index for staggered entrance
        const delay = Math.min(index * 80, 500);

        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.5))
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                delay,
                useNativeDriver: true,
            })
        ]).start();

        // Progress bar animation
        Animated.timing(progressAnim, {
            toValue: progress / 100,
            duration: 800,
            delay: delay + 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false
        }).start();
    }, [index, progress]);

    // Calculate progress width for animation
    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    // Handle quiz press
    const handleQuizPress = () => {
        trigger(HapticType.SELECTION);
        router.push(`/(app)/learn/${pdId}/quizzes/${quiz.id}`);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim
                }
            ]}
        >
            <Pressable
                style={[styles.card, isDark && styles.cardDark]}
                onPress={handleQuizPress}
                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
                <View style={styles.cardContent}>
                    {/* Category & Pin Indicator */}
                    <View style={styles.topRow}>
                        {quiz?.category?.name && (
                            <View style={[
                                styles.categoryBadge,
                                {backgroundColor: `${categoryColor}15`}
                            ]}>
                               <MaterialCommunityIcons
                                    name={categoryIcon as any}
                                    size={12}
                                    color={categoryColor}
                                    style={{ marginRight: 4 }}
                                />
                                <ThemedText style={[
                                    styles.categoryText,
                                    {color: categoryColor}
                                ]}>
                                    {quiz.category.name}
                                </ThemedText>
                            </View>
                        )}

                        {isPinned && (
                            <MaterialCommunityIcons
                                name="pin"
                                size={16}
                                color={theme.color.primary[500]}
                                style={styles.pinIcon}
                            />
                        )}
                    </View>

                    {/* Quiz Icon */}
                    <View style={[
                        styles.iconContainer,
                        isDark && styles.iconContainerDark,
                        { backgroundColor: `${categoryColor}15` }
                    ]}>
                        <MaterialCommunityIcons
                            name={categoryIcon as any}
                            size={28}
                            color={categoryColor}
                        />
                    </View>

                    {/* Quiz Title */}
                    <ThemedText
                        style={[styles.title, isDark && styles.titleDark]}
                        numberOfLines={2}
                    >
                        {quiz.name}
                    </ThemedText>

                    {/* Question Count */}
                    <View style={styles.questionsContainer}>
                        <MaterialCommunityIcons
                            name="help-circle-outline"
                            size={12}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                            style={styles.questionIcon}
                        />
                        <ThemedText style={[styles.questionsText, isDark && styles.questionsTextDark]}>
                            {questions} question{questions !== 1 ? 's' : ''}
                        </ThemedText>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: progressWidth, backgroundColor: categoryColor }
                            ]}
                        />
                    </View>

                    {/* Progress Text */}
                    {progress > 0 && (
                        <ThemedText style={[styles.progressText, { color: categoryColor }]}>
                            {Math.round(progress)}% complété
                        </ThemedText>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        marginBottom: 16,
    },
    card: {
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        margin: 2, // To make the shadow visible
    },
    cardDark: {
        backgroundColor: '#1F2937',
        shadowColor: '#000',
        shadowOpacity: 0.3,
    },
    cardContent: {
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        maxWidth: '80%',
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '500',
    },
    pinIcon: {
        marginLeft: 'auto',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconContainerDark: {
        backgroundColor: 'rgba(129, 140, 248, 0.15)',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
        minHeight: 44, // Space for 2 lines
    },
    titleDark: {
        color: '#F9FAFB',
    },
    questionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    questionIcon: {
        marginRight: 4,
    },
    questionsText: {
        fontSize: 12,
        color: '#6B7280',
    },
    questionsTextDark: {
        color: '#9CA3AF',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarDark: {
        backgroundColor: '#374151',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'right',
    },
});

export default EnhancedQuizCard;