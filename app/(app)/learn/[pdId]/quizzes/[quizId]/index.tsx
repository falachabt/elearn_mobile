import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    View,
    Pressable,
    ActivityIndicator,
    Platform,
    StatusBar,
    Animated,
    Easing,
    Image,
    Dimensions
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { CoursesCategories, Quiz, Tags } from "@/types/type";
import { useAuth } from "@/contexts/auth";
import QuizAttemptsList from "@/components/shared/learn/quiz/QuizAttempList";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

// Define interfaces for the data
interface QuizCourse {
    courses: {
        id: number;
        name: string;
    };
}

interface QuizTag {
    tags: Tags;
}

interface QuizQuestion {
    count: number;
}

interface QuizWithDetails extends Quiz {
    quiz_category: CoursesCategories;
    quiz_tags: QuizTag[];
    quiz_questions: QuizQuestion[];
    quiz_courses: QuizCourse[];
}

interface QuizAttempt {
    id: string;
    quiz_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    score: number;
    status: string;
    quiz?: {
        quiz_questions: {
            count: number;
        }[];
    };
}

// Define component interfaces
interface StatCardProps {
    icon: string;
    value: string;
    label: string;
    color?: string;
    isDark: boolean;
    index: number;
}

interface PrerequisiteProps {
    prereq: QuizCourse;
    isDark: boolean;
    index: number;
    onPress: (id: number) => void;
}

// Skeleton loading component
const QuizDetailSkeleton = ({ isDark }: { isDark: boolean }) => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: false,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, []);

    const backgroundColor = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: isDark
            ? ['rgba(55, 65, 81, 0.8)', 'rgba(75, 85, 99, 0.8)']
            : ['rgba(229, 231, 235, 0.8)', 'rgba(209, 213, 219, 0.8)']
    });

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header Skeleton */}
            <View style={[styles.header, isDark && styles.headerDark]}>
                <View style={styles.backButton} />
                <Animated.View style={[styles.skeletonLine, { width: '60%', height: 18, backgroundColor }]} />
                <View style={styles.pinButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Stats Grid Skeleton */}
                <View style={styles.statsGrid}>
                    {[1, 2, 3].map((_, i) => (
                        <Animated.View key={i} style={[styles.statCard, { backgroundColor }]} />
                    ))}
                </View>

                {/* Description Skeleton */}
                <View style={styles.section}>
                    <Animated.View style={[styles.skeletonLine, { width: '40%', height: 20, backgroundColor }]} />
                    <Animated.View style={[styles.card, { backgroundColor }]} />
                </View>

                {/* Prerequisites Skeleton */}
                <View style={styles.section}>
                    <Animated.View style={[styles.skeletonLine, { width: '40%', height: 20, backgroundColor }]} />
                    {[1, 2].map((_, i) => (
                        <Animated.View key={i} style={[styles.prerequisiteItem, { backgroundColor, marginBottom: 8 }]} />
                    ))}
                </View>

                {/* Tags Skeleton */}
                <View style={styles.section}>
                    <Animated.View style={[styles.skeletonLine, { width: '30%', height: 20, backgroundColor }]} />
                    <View style={styles.tagsContainer}>
                        {[1, 2, 3].map((_, i) => (
                            <Animated.View key={i} style={[styles.tag, { backgroundColor, width: 80 }]} />
                        ))}
                    </View>
                </View>

                {/* Attempts Skeleton */}
                <View style={[styles.section, styles.lastSection]}>
                    <Animated.View style={[styles.skeletonLine, { width: '30%', height: 20, backgroundColor }]} />
                    <Animated.View style={[styles.card, { backgroundColor, height: 100 }]} />
                </View>
            </ScrollView>

            {/* Footer Skeleton */}
            <View style={[styles.footer, isDark && styles.footerDark]}>
                <Animated.View style={[styles.startButton, { backgroundColor }]} />
            </View>
        </View>
    );
};

// Enhanced stat card component
const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, isDark, index }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay: index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay: index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start();
    }, []);

    const cardColor = color || theme.color.primary[500];

    return (
        <Animated.View
            style={[
                styles.statCard,
                isDark && styles.statCardDark,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    borderLeftWidth: 4,
                    borderLeftColor: cardColor
                }
            ]}
        >
            <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={cardColor}
            />
            <ThemedText style={[styles.statValue, { color: cardColor }]}>{value}</ThemedText>
            <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </Animated.View>
    );
};

// Enhanced prerequisite item component
const PrerequisiteItem: React.FC<PrerequisiteProps> = ({ prereq, isDark, index, onPress }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay: 300 + index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay: 300 + index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
        }}>
            <Pressable
                style={[styles.prerequisiteItem, isDark && styles.cardDark]}
                onPress={() => onPress(prereq.courses.id)}
                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
                <View style={styles.prereqIconContainer}>
                    <MaterialCommunityIcons
                        name="book-open-variant"
                        size={20}
                        color="#FFFFFF"
                    />
                </View>

                <ThemedText style={styles.prerequisiteText}>
                    {prereq.courses?.name}
                </ThemedText>

                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                />
            </Pressable>
        </Animated.View>
    );
};

// Error state component
const ErrorState: React.FC<{ onRetry: () => void; isDark: boolean }> = ({ onRetry, isDark }) => (
    <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
        <ThemedText style={styles.errorTitle}>
            Oups! Une erreur s'est produite
        </ThemedText>
        <ThemedText style={styles.errorText}>
            Nous n'avons pas pu charger les détails de ce quiz.
        </ThemedText>
        <Pressable
            style={[styles.retryButton, isDark && styles.retryButtonDark]}
            onPress={onRetry}
        >
            <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
        </Pressable>
    </View>
);

// Main Quiz Detail Component
const QuizDetail: React.FC = () => {
    const router = useRouter();
    const { quizId, pdId } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isPinned, setPinned] = useState(false);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [showAllPrereqs, setShowAllPrereqs] = useState(false);
    const { user } = useAuth();
    const { trigger } = useHaptics();

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;

    // SWR fetch for quiz pin status
    const { data: isQuizPinned, mutate: mutateQuizPin } = useSWR<{ id: string } | null>(
        quizId ? `quiz-pin-${quizId}` : null,
        async () => {
            const { data } = await supabase
                .from("quiz_pin")
                .select("*")
                .eq("quiz_id", quizId)
                .eq("user_id", user?.id)
                .maybeSingle();

            return data;
        }
    );

    // SWR fetch for quiz attempts
    const { data: quizAttempts } = useSWR<QuizAttempt[]>(
        quizId ? `quiz-attemptss-${quizId}-${user?.id}` : null,
        async () => {
            const { data } = await supabase
                .from("quiz_attempts")
                .select("*, quiz(quiz_questions(count))")
                .eq("quiz_id", quizId)
                .eq("user_id", user?.id)
                .eq("status", "completed"); // Only fetch completed attempts

            return data || [];
        }
    );

    // SWR fetch for quiz details
    const {
        data: quiz,
        error: quizError,
        isLoading: quizLoading,
        mutate: refreshQuiz
    } = useSWR<QuizWithDetails>(
        quizId ? `quiz-${quizId}` : null,
        async () => {
            const { data } = await supabase
                .from("quiz")
                .select(
                    "*, quiz_questions(count), category(name), quiz_tags(tags(id,name)), quiz_courses(courses(id,name))"
                )
                .eq("id", quizId)
                .single();

            return data;
        }
    );

    // Create a new quiz attempt
    const createQuizAttempt = async (): Promise<void> => {
        try {
            trigger(HapticType.SELECTION);

            const { data: attempt, error } = await supabase
                .from("quiz_attempts")
                .insert([
                    {
                        quiz_id: quizId,
                        user_id: user?.id,
                        start_time: new Date().toISOString(),
                        end_time: new Date(Date.now() + 30 * 60000).toISOString(),
                        status: "in_progress",
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Navigate to the quiz play page with attempt ID
            router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${attempt.id}`);
        } catch (error) {
            console.error("Error creating quiz attempt:", error);
            // Handle error (show toast/alert)
        }
    };

    // Toggle pin status for the quiz
    const triggerQuizPin = async (): Promise<void> => {
        try {
            trigger(HapticType.SELECTION);
            setPinned(!isPinned);

            if (isPinned) {
                await supabase
                    .from("quiz_pin")
                    .delete()
                    .eq("quiz_id", quizId)
                    .eq("user_id", user?.id);
            } else {
                await supabase
                    .from("quiz_pin")
                    .insert([{quiz_id: quizId, user_id: user?.id, is_pinned: true}]);
            }

            await mutateQuizPin();
        } catch (error) {
            console.error("Error pinning quiz:", error);
            // Handle error (show toast/alert)
        }
    };

    // Calculate average success and duration
    const { averageSuccess, averageDuration } = useMemo(() => {
        if (!quizAttempts || quizAttempts.length === 0) {
            return { averageSuccess: 0, averageDuration: 0 };
        }

        // Calculate success rate
        const totalSuccessRate = quizAttempts.reduce((sum, attempt) => {
            return sum + (attempt.score || 0);
        }, 0);
        const averageSuccess = totalSuccessRate / quizAttempts.length;

        // Calculate average duration in minutes
        const totalDuration = quizAttempts.reduce((sum, attempt) => {
            const startTime = new Date(attempt.start_time);
            const endTime = new Date(attempt.end_time);
            const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            return sum + durationInMinutes;
        }, 0);
        const averageDuration = totalDuration / quizAttempts.length;

        return {
            averageSuccess,
            averageDuration: Math.round(averageDuration), // Round to nearest minute
        };
    }, [quizAttempts]);

    // Format duration for display
    const formatDuration = (minutes: number): string => {
        if (minutes === 0) return "--";
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0
            ? `${hours}h${remainingMinutes}min`
            : `${hours}h`;
    };

    // Format success rate for display
    const formatSuccessRate = (rate: number): string => {
        if (rate === 0) return "0%";
        return `${Math.round(rate)}%`;
    };

    // Handle navigation to a prerequisite course
    const handlePrereqPress = (courseId: number): void => {
        trigger(HapticType.SELECTION);
        router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
    };

    // Update isPinned state when isQuizPinned changes
    useEffect(() => {
        setPinned(!!isQuizPinned);
    }, [isQuizPinned]);

    // Fade-in animation when component mounts
    useEffect(() => {
        if (!quizLoading && quiz) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(headerOpacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                })
            ]).start();
        }
    }, [quizLoading, quiz]);

    // Handle back button press
    const handleBackPress = (): void => {
        trigger(HapticType.LIGHT);
        router.back();
    };

    // Handle retry when error occurs
    const handleRetry = (): void => {
        refreshQuiz();
    };

    // Loading state
    if (quizLoading) {
        return <QuizDetailSkeleton isDark={isDark} />;
    }

    // Error state
    if (quizError || !quiz) {
        return <ErrorState onRetry={handleRetry} isDark={isDark} />;
    }

    // Get quiz description or default text
    const description = quiz?.description || "Aucune description disponible pour ce quiz.";

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    isDark && styles.headerDark,
                    { opacity: headerOpacity }
                ]}
            >
                <Pressable
                    onPress={handleBackPress}
                    style={[styles.backButton, isDark && styles.backButtonDark]}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111827"}
                    />
                </Pressable>

                <ThemedText style={styles.headerTitle} numberOfLines={1}>
                    {quiz?.name}
                </ThemedText>

                <Pressable
                    onPress={triggerQuizPin}
                    style={styles.pinButton}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons
                        name={isPinned ? "pin" : "pin-outline"}
                        size={24}
                        color={theme.color.primary[500]}
                    />
                </Pressable>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim }}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="help-circle-outline"
                        value={quiz?.quiz_questions[0].count?.toString() || "--"}
                        label="Questions"
                        color="#3B82F6"
                        isDark={isDark}
                        index={0}
                    />
                    <StatCard
                        icon="clock-outline"
                        value={formatDuration(averageDuration)}
                        label="Durée"
                        color="#8B5CF6"
                        isDark={isDark}
                        index={1}
                    />
                    <StatCard
                        icon="trophy-outline"
                        value={formatSuccessRate(averageSuccess)}
                        label="Réussite"
                        color="#10B981"
                        isDark={isDark}
                        index={2}
                    />
                </View>

                {/* Description Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons
                            name="information-outline"
                            size={20}
                            color={isDark ? "#D1D5DB" : "#4B5563"}
                            style={styles.sectionIcon}
                        />
                        <ThemedText style={styles.sectionTitle}>Description</ThemedText>
                    </View>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <ThemedText
                            style={styles.description}
                            numberOfLines={showFullDesc ? undefined : 3}
                        >
                            {description}
                        </ThemedText>
                        {description.length > 150 && (
                            <Pressable
                                onPress={() => {
                                    trigger(HapticType.LIGHT);
                                    setShowFullDesc(!showFullDesc);
                                }}
                                style={styles.showMoreButton}
                            >
                                <ThemedText style={styles.showMoreText}>
                                    {showFullDesc ? "Afficher moins" : "Afficher plus"}
                                </ThemedText>
                                <MaterialCommunityIcons
                                    name={showFullDesc ? "chevron-up" : "chevron-down"}
                                    size={16}
                                    color={theme.color.primary[500]}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Prerequisites Section */}
                {quiz?.quiz_courses && quiz.quiz_courses.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons
                                name="book-open-page-variant"
                                size={20}
                                color={isDark ? "#D1D5DB" : "#4B5563"}
                                style={styles.sectionIcon}
                            />
                            <ThemedText style={styles.sectionTitle}>Prérequis</ThemedText>
                        </View>

                        {/* Prerequisite Items */}
                        {(showAllPrereqs
                                ? quiz.quiz_courses
                                : quiz.quiz_courses.slice(0, 2)
                        ).map((prereq, index) => (
                            <PrerequisiteItem
                                key={`prereq-${prereq.courses.id}`}
                                prereq={prereq}
                                isDark={isDark}
                                index={index}
                                onPress={handlePrereqPress}
                            />
                        ))}

                        {/* Show More/Less Button */}
                        {quiz.quiz_courses.length > 2 && (
                            <Pressable
                                onPress={() => {
                                    trigger(HapticType.LIGHT);
                                    setShowAllPrereqs(!showAllPrereqs);
                                }}
                                style={[
                                    styles.showMorePrereqs,
                                    isDark && styles.showMorePrereqsDark,
                                ]}
                            >
                                <ThemedText style={styles.showMoreText}>
                                    {showAllPrereqs
                                        ? "Afficher moins"
                                        : `Voir ${quiz.quiz_courses.length - 2} autres cours`}
                                </ThemedText>
                                <MaterialCommunityIcons
                                    name={showAllPrereqs ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                            </Pressable>
                        )}
                    </View>
                )}

                {/* Tags Section */}
                {quiz?.quiz_tags && quiz.quiz_tags.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons
                                name="tag-multiple-outline"
                                size={20}
                                color={isDark ? "#D1D5DB" : "#4B5563"}
                                style={styles.sectionIcon}
                            />
                            <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
                        </View>
                        <View style={styles.tagsContainer}>
                            {quiz.quiz_tags.map((tag, index) => (
                                <View
                                    key={`tag-${tag.tags?.id || index}`}
                                    style={[styles.tag, isDark && styles.tagDark]}
                                >
                                    <MaterialCommunityIcons
                                        name="pound"
                                        size={14}
                                        color={theme.color.primary[500]}
                                        style={{ marginRight: 4 }}
                                    />
                                    <ThemedText style={styles.tagText}>
                                        {tag.tags?.name}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Attempts Section */}
                <View style={[styles.section, styles.lastSection]}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons
                            name="history"
                            size={20}
                            color={isDark ? "#D1D5DB" : "#4B5563"}
                            style={styles.sectionIcon}
                        />
                        <ThemedText style={styles.sectionTitle}>Mes essais</ThemedText>
                    </View>
                    <QuizAttemptsList
                        quizId={String(quizId)}
                        isDark={isDark}
                        onAttemptPress={(a) => {
                            trigger(HapticType.SELECTION);
                            router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${a.id}`);
                        }}
                    />
                </View>
            </Animated.ScrollView>

            {/* Footer with Start Button */}
            <View style={[styles.footer, isDark && styles.footerDark]}>
                <Pressable
                    style={styles.startButton}
                    onPress={createQuizAttempt}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <MaterialCommunityIcons
                        name="play-circle"
                        size={24}
                        color="#FFFFFF"
                    />
                    <ThemedText style={styles.startButtonText}>Commencer le quiz</ThemedText>
                </Pressable>
            </View>
        </View>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 48 : 16,
        paddingBottom: 8,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        elevation: 2,
    },
    headerDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    headerTitle: {
        flex: 1,
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginHorizontal: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    backButtonDark: {
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    pinButton: {
        padding: 8,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.medium,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    statCardDark: {
        backgroundColor: "#1F2937",
    },
    statValue: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: "700",
        marginTop: 8,
    },
    statLabel: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIcon: {
        marginRight: 8,
    },
    lastSection: {
        marginBottom: 100,
    },
    sectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.medium,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardDark: {
        backgroundColor: "#1F2937",
    },
    description: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        lineHeight: 24,
    },
    showMoreButton: {
        marginTop: 8,
        alignSelf: "flex-start",
        flexDirection: 'row',
        alignItems: 'center',
    },
    showMoreText: {
        color: theme.color.primary[500],
        fontWeight: "500",
        marginRight: 4,
    },
    prerequisiteItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: theme.border.radius.medium,
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    prereqIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.color.primary[500],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    prerequisiteText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        flex: 1,
    },
    showMorePrereqs: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderRadius: theme.border.radius.small,
        backgroundColor: "#F3F4F6",
        gap: 8,
        marginTop: 8,
    },
    showMorePrereqsDark: {
        backgroundColor: "#374151",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#F3F4F6",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    tagDark: {
        backgroundColor: "#374151",
    },
    tagText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        marginBottom: Platform.OS === "ios" ? 32 : 60, // Account for tab bar
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    footerDark: {
        backgroundColor: "#1F2937",
    },
    startButton: {
        backgroundColor: theme.color.primary[500],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    startButtonText: {
        color: "#FFFFFF",
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "600",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    errorTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    errorText: {
        color: "#6B7280",
        marginBottom: 24,
        textAlign: "center",
        maxWidth: width * 0.8,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.color.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        elevation: 2,
    },
    retryButtonDark: {
        backgroundColor: '#3B82F6',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
    },
    // Skeleton styles
    skeletonLine: {
        borderRadius: 4,
        marginVertical: 2,
    },
});

export default QuizDetail;