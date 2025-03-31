import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import {QUIZ_CATEGORY_COLORS, QUIZ_CATEGORY_ICONS} from "@/components/shared/learn/quiz/QuizCategoryFilter";

// Define types for component props
interface QuizItemProps {
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

const EnhancedQuizRowItem: React.FC<QuizItemProps> = ({ quizItem, pdId, isDark = false, index = 0 }) => {
    const router = useRouter();
    const { trigger } = useHaptics();

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Extract quiz details
    const { quiz, isPinned, progress = 0 } = quizItem;
    const questions = quiz?.quiz_questions?.length || 0;
    const relatedCourse = quiz?.course?.name;
    const categoryName = quiz?.category?.name || 'default';

    // Get category color and icon
    // @ts-ignore
    const categoryColor = QUIZ_CATEGORY_COLORS[categoryName] || QUIZ_CATEGORY_COLORS.default;
    // @ts-ignore
    const categoryIcon = QUIZ_CATEGORY_ICONS[categoryName] || QUIZ_CATEGORY_ICONS.default;

    // Animation effects
    useEffect(() => {
        // Sequential animations for a nicer entrance effect
        const delay = index * 100; // Stagger the animations

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            })
        ]).start();

        // Progress bar animation
        Animated.timing(progressAnim, {
            toValue: progress / 100,
            duration: 800,
            delay: delay + 300, // Start after the item appears
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
        <Animated.View style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
            <Pressable
                style={[styles.quizItem, isDark && styles.quizItemDark]}
                onPress={handleQuizPress}
                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
                <View style={styles.quizContent}>
                    <View style={styles.quizHeader}>
                        <View style={[
                            styles.quizIcon,
                            isDark && styles.quizIconDark,
                            { backgroundColor: `${categoryColor}15` }
                        ]}>
                            <MaterialCommunityIcons
                                name={categoryIcon}
                                size={24}
                                color={categoryColor}
                            />
                        </View>

                        <View style={styles.quizDetails}>
                            <ThemedText style={[styles.quizTitle, isDark && styles.quizTitleDark]} numberOfLines={1}>
                                {quiz.name}
                            </ThemedText>

                            <View style={styles.quizInfoRow}>
                                <ThemedText style={[styles.quizInfo, isDark && styles.quizInfoDark]}>
                                    <MaterialCommunityIcons
                                        name="help-circle-outline"
                                        size={12}
                                        color={isDark ? "#9CA3AF" : "#6B7280"}
                                    /> {questions} question{questions !== 1 ? 's' : ''}
                                </ThemedText>

                                {relatedCourse && (
                                    <ThemedText style={[styles.quizInfo, isDark && styles.quizInfoDark]}>
                                        <MaterialCommunityIcons
                                            name="book-open-page-variant"
                                            size={12}
                                            color={isDark ? "#9CA3AF" : "#6B7280"}
                                        /> {relatedCourse}
                                    </ThemedText>
                                )}
                            </View>

                            <View style={styles.badgeRow}>
                                {isPinned && (
                                    <View style={styles.pinnedBadge}>
                                        <MaterialCommunityIcons name="pin" size={12} color={theme.color.primary[500]} />
                                        <ThemedText style={styles.pinnedText}>Épinglé</ThemedText>
                                    </View>
                                )}

                                {quiz?.category?.name && (
                                    <View style={[
                                        styles.categoryBadge,
                                        { backgroundColor: `${categoryColor}15` }
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={categoryIcon}
                                            size={12}
                                            color={categoryColor}
                                            style={{ marginRight: 4 }}
                                        />
                                        <ThemedText style={[styles.categoryText, { color: categoryColor }]}>
                                            {quiz.category.name}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>
                        </View>

                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={isDark ? "#6B7280" : "#9CA3AF"}
                            style={styles.chevron}
                        />
                    </View>

                    <View style={styles.progressSection}>
                        <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    { width: progressWidth, backgroundColor: categoryColor }
                                ]}
                            />
                        </View>

                        {progress > 0 && (
                            <ThemedText style={[styles.progressText, { color: categoryColor }]}>
                                {Math.round(progress)}% complété
                            </ThemedText>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    quizItem: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    quizItemDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    quizContent: {
        padding: 16,
    },
    quizHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    quizIcon: {
        width: 44,
        height: 44,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    quizIconDark: {
        backgroundColor: 'rgba(129, 140, 248, 0.15)',
    },
    quizDetails: {
        flex: 1,
    },
    quizTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    quizTitleDark: {
        color: '#F9FAFB',
    },
    quizInfoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    quizInfo: {
        fontSize: 12,
        color: '#6B7280',
        flexDirection: 'row',
        alignItems: 'center',
    },
    quizInfoDark: {
        color: '#9CA3AF',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        gap: 4,
    },
    pinnedText: {
        fontSize: 12,
        color: theme.color.primary[500],
        fontWeight: '500',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
    },
    chevron: {
        alignSelf: 'center',
        marginLeft: 8,
    },
    progressSection: {
        marginTop: 12,
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
        fontSize: 12,
        marginTop: 4,
        textAlign: 'right',
        fontWeight: '500',
    },
});

export default EnhancedQuizRowItem;