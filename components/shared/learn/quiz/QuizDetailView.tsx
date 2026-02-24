import React, { useState, useEffect, useRef, useMemo } from "react";
import { logger } from '@/utils/logger';
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
    Dimensions
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import QuizAttemptsList from "@/components/shared/learn/quiz/QuizAttempList";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useUser } from "@/contexts/useUserInfo";
import { useCustomRouter } from "@/hooks/useCustomRouter";
import { useQuizDetails, useQuizPins, useQuizAttempts } from "@/hooks/useQuizData";

// Define interfaces for the data
interface QuizCourse {
    courses: {
        id: number;
        name: string;
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

export interface QuizDetailViewProps {
    quizId: string;
    programId: string;
    basePath: string; // e.g., "/(app)/learn" or "/(app)/secondary/program"
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
                name={icon}
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
export const QuizDetailView: React.FC<QuizDetailViewProps> = ({ quizId, programId, basePath }) => {
    const router = useCustomRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isPinned, setPinned] = useState(false);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [showAllPrereqs, setShowAllPrereqs] = useState(false);
    const { user } = useAuth();
    const { trigger } = useHaptics();
    const [isEnrolled, setIsEnrolled] = useState(false);
    const { isLearningPathEnrolled, isSecondaryProgramEnrolled } = useUser();

    // Check if we're in secondary context
    const isSecondaryContext = basePath.includes("secondary");

    // Check if user is enrolled in this program
    useEffect(() => {
        if (!programId) return;
        
        const checkEnrollment = async () => {
            const enrolled = isSecondaryContext 
                ? isSecondaryProgramEnrolled(String(programId))
                : await isLearningPathEnrolled(String(programId));
            setIsEnrolled(enrolled);
        };
        checkEnrollment();
    }, [programId, isSecondaryContext, isLearningPathEnrolled, isSecondaryProgramEnrolled]);

    // Set preview mode based on enrollment status
    const [, setIsPreviewMode] = useState<boolean>(!isEnrolled);

    // Update preview mode when enrollment status changes
    useEffect(() => {
        setIsPreviewMode(!isEnrolled);
    }, [isEnrolled]);

    // Handle purchase flow
    const handlePurchaseFlow = () => {
        trigger(HapticType.SELECTION);
        router.navigateToShop(programId);
    };

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;

    // Use shared hooks for quiz data
    const { isPinned: checkIsPinned, mutate: mutateQuizPin } = useQuizPins(quizId);
    const { attempts: quizAttempts } = useQuizAttempts(quizId, "completed");
    const { quiz, isLoading: quizLoading, error: quizError, mutate: refreshQuiz } = useQuizDetails(
        quizId,
        programId,
        isSecondaryContext
    );

    // Create a new quiz attempt
    const createQuizAttempt = async (): Promise<void> => {
        try {
            trigger(HapticType.SELECTION);

            // If user is not enrolled, check if they've already made an attempt
            if (!isEnrolled) {
                const isPreviewQuiz = false;

                if (!isPreviewQuiz) {
                    handlePurchaseFlow();
                    return;
                }

                // Check if user has already made an attempt on this quiz
                if (!user?.id) throw new Error("User not authenticated");
                
                const { data: existingAttempts, error: attemptsError } = await supabase
                    .from("quiz_attempts")
                    .select("id")
                    .eq("quiz_id", quizId)
                    .eq("user_id", user.id);

                if (attemptsError) throw attemptsError;

                if (existingAttempts && existingAttempts.length > 0) {
                    alert("En mode aperçu, vous ne pouvez faire qu'une seule tentative par quiz. Inscrivez-vous pour accéder à toutes les fonctionnalités.");
                    handlePurchaseFlow();
                    return;
                }
            }

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

            // Navigate to the quiz play page with attempt ID using basePath
            router.push(`${basePath}/${programId}/quizzes/${quizId}/${attempt.id}` as Href);
        } catch (error) {
            logger.error("Error creating quiz attempt:", error);
        }
    };

    // Toggle pin status for the quiz
    const triggerQuizPin = async (): Promise<void> => {
        try {
            if (!user?.id) return;
            
            trigger(HapticType.SELECTION);
            setPinned(!isPinned);

            if (isPinned) {
                await supabase
                    .from("quiz_pin")
                    .delete()
                    .eq("quiz_id", quizId)
                    .eq("user_id", user.id);
            } else {
                await supabase
                    .from("quiz_pin")
                    .insert([{quiz_id: quizId, user_id: user.id, is_pinned: true}]);
            }

            await mutateQuizPin();
        } catch (error) {
            logger.error("Error pinning quiz:", error);
        }
    };

    // Calculate average success and duration
    const { averageSuccess, averageDuration } = useMemo(() => {
        if (!quizAttempts || quizAttempts.length === 0) {
            return { averageSuccess: 0, averageDuration: 0 };
        }

        const totalSuccessRate = quizAttempts.reduce((sum, attempt) => {
            return sum + (attempt.score || 0);
        }, 0);
        const averageSuccess = totalSuccessRate / quizAttempts.length;

        const totalDuration = quizAttempts.reduce((sum, attempt) => {
            if (!attempt.start_time || !attempt.end_time) return sum;
            const startTime = new Date(attempt.start_time);
            const endTime = new Date(attempt.end_time);
            const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            return sum + durationInMinutes;
        }, 0);
        const averageDuration = totalDuration / quizAttempts.length;

        return {
            averageSuccess,
            averageDuration: Math.round(averageDuration),
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

        if (!isEnrolled) {
            handlePurchaseFlow();
            return;
        }

        router.push(`${basePath}/${programId}/courses/${courseId}` as Href);
    };

    // Update isPinned state when checkIsPinned changes
    useEffect(() => {
        setPinned(checkIsPinned(quizId || ""));
    }, [checkIsPinned, quizId]);

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

    if (typeof isEnrolled === 'undefined') {
        return (
            <View style={[styles.centerContainer, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#65B741"} />
                <ThemedText style={styles.loadingText}>Vérification de l'inscription...</ThemedText>
            </View>
        );
    }

    if (quizLoading) {
        return <QuizDetailSkeleton isDark={isDark} />;
    }

    if (quizError || !quiz) {
        return <ErrorState onRetry={handleRetry} isDark={isDark} />;
    }

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

                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerTitle} numberOfLines={1}>
                        {quiz?.name}
                    </ThemedText>

                    <View style={[
                        styles.enrollmentBadge,
                        isEnrolled ? styles.enrolledBadge : styles.previewBadge
                    ]}>
                        <MaterialCommunityIcons
                            name={isEnrolled ? "check-circle" : "eye-outline"}
                            size={14}
                            color={isEnrolled ? "#10B981" : "#F59E0B"}
                        />
                        <ThemedText style={[
                            styles.enrollmentBadgeText,
                            isEnrolled ? styles.enrolledBadgeText : styles.previewBadgeText
                        ]}>
                            {isEnrolled ? "Inscrit" : "Aperçu"}
                        </ThemedText>
                    </View>
                </View>

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

                        {(showAllPrereqs
                                ? quiz.quiz_courses
                                : quiz.quiz_courses.slice(0, 2)
                        ).map((prereq, index) => (
                            <PrerequisiteItem
                                key={`prereq-${prereq.courses.id}`}
                                prereq={prereq}
                                isDark={isDark}
                                index={index}
                                onPress={isEnrolled ? handlePrereqPress : () => {}}
                            />
                        ))}

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
                        quizId={isEnrolled ? String(quizId) : ""}
                        isDark={isDark}
                        onAttemptPress={(a) => {
                            trigger(HapticType.SELECTION);
                            router.push(`${basePath}/${programId}/quizzes/${quizId}/${a.id}` as Href);
                        }}
                    />
                </View>
            </Animated.ScrollView>

            {/* Footer with Start Button or Purchase Button */}
            <View style={[styles.footer, isDark && styles.footerDark]}>
                {isEnrolled ? (
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
                ) : (
                    <Pressable
                        style={[styles.purchaseButton, isDark && styles.purchaseButtonDark]}
                        onPress={handlePurchaseFlow}
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <MaterialCommunityIcons
                            name="cart"
                            size={24}
                            color="#FFFFFF"
                        />
                        <ThemedText style={styles.startButtonText}>S'inscrire au programme</ThemedText>
                    </Pressable>
                )}
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
    headerTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginRight: 8,
    },
    enrollmentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    enrolledBadge: {
        backgroundColor: '#DCFCE7',
    },
    previewBadge: {
        backgroundColor: '#FEF3C7',
    },
    enrollmentBadgeText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    enrolledBadgeText: {
        color: '#10B981',
    },
    previewBadgeText: {
        color: '#F59E0B',
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: "700",
        marginTop: 8,
    },
    statLabel: {
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        marginBottom: Platform.OS === "ios" ? 32 : 60,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
    },
    purchaseButton: {
        backgroundColor: "#F59E0B",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    purchaseButtonDark: {
        backgroundColor: "#D97706",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    errorTitle: {
        fontFamily: theme.typography.fontFamily,
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
    loadingText: {
        marginTop: 16,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#6B7280",
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },
    skeletonLine: {
        borderRadius: 4,
        marginVertical: 2,
    },
});

export default QuizDetailView;
