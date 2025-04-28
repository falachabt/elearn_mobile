import React from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Platform,
    Dimensions,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ThemedText} from '@/components/ThemedText';
import {theme} from '@/constants/theme';
import useSWR from 'swr';
import {supabase} from '@/lib/supabase';
import {useAuth} from "@/contexts/auth";

interface QuizAttempt {
    id: string;
    quiz_id: string;
    start_time: string;
    status: 'completed' | 'in_progress' | 'failed';
    timeSpent: number;
    score: number;
    current_question_index: number;
    answers: Record<number, {
        questionId: number;
        selectedOptions: string[];
        isCorrect: boolean;
        timeSpent: number;
    }>;
    quiz: { quiz_questions: { count: number }[] }
}

interface QuizAttemptsListProps {
    quizId: string;
    isDark: boolean;
    onAttemptPress: (attempt: QuizAttempt) => void;
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};

const getStatusConfig = (status: string, score: number): { icon: string; color: string; label: string } => {
    switch (status) {
        case 'completed':
            if (score >= 70) {
                return {
                    icon: 'check-circle',
                    color: theme.color.success,
                    label: 'Réussi'
                };
            } else {
                return {
                    icon: 'close-circle',
                    color: theme.color.error,
                    label: 'Echec'
                };
            }
        case 'in_progress':
            return {
                icon: 'progress-clock',
                color: theme.color.primary[500],
                label: 'En cours'
            };
        case 'failed':
            return {
                icon: 'close-circle',
                color: theme.color.error,
                label: 'Echec'
            };
        default:
            return {
                icon: 'help-circle',
                color: '#6B7280',
                label: 'Inconnu'
            };
    }
};

const QuizProgressBar = ({progress, isDark}: { progress: number; isDark: boolean }) => (
    <View style={[styles.progressBarContainer, isDark && styles.progressBarContainerDark]}>
        <View
            style={[
                styles.progressBarFill,
                {width: `${progress}%`},
                progress >= 100 && styles.progressBarComplete
            ]}
        />
    </View>
);

const AttemptCard = ({attempt, isDark, onPress, isLast}: {
    attempt: QuizAttempt;
    isDark: boolean;
    onPress: () => void;
    isLast: boolean;
}) => {
    const status = getStatusConfig(attempt.status, attempt.score);
    const progress = (attempt.current_question_index / 10) * 100; // Assuming 10 questions, adjust as needed

    return (
        <Pressable
            style={[
                styles.attemptCard,
                isDark && styles.attemptCardDark,
                isLast && styles.lastAttempt,
            ]}
            onPress={onPress}
        >
            {/* Status Badge */}
            <View style={[styles.statusBadge, {backgroundColor: `${status.color}15`}]}>
                <MaterialCommunityIcons
                    name={status.icon as any}
                    size={16}
                    color={status.color}
                />
                <ThemedText style={[styles.statusText, {color: status.color}]}>
                    {status.label}
                </ThemedText>
            </View>

            {/* Main Content */}
            <View style={styles.cardContent}>
                <View style={styles.dateTimeContainer}>
                    <MaterialCommunityIcons
                        name="calendar-clock"
                        size={16}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                    <ThemedText style={styles.dateText}>
                        {formatDate(attempt.start_time)}
                    </ThemedText>
                </View>

                {/* Progress Section */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <ThemedText style={styles.progressLabel}>
                            Progress
                        </ThemedText>
                        <ThemedText style={styles.progressText}>
                            {attempt.status !== "in_progress" ? `${Object.values(attempt.answers).filter(answer => answer.isCorrect).length}/${attempt.quiz.quiz_questions[0].count}` : ""}
                        </ThemedText>
                    </View>
                    <QuizProgressBar progress={attempt.status !== "in_progress" ? attempt.score : 0} isDark={isDark}/>
                </View>

                {/* Stats Row */}
                <View style={[styles.statsRow, isDark && styles.statsRowDark]}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons
                            name="clock-outline"
                            size={18}
                            color={theme.color.primary[500]}
                        />
                        <View>
                            <ThemedText style={styles.statLabel}>Duration</ThemedText>
                            <ThemedText style={styles.statValue}>
                                {formatDuration(attempt.timeSpent || 0)}
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.statDivider}/>

                    <View style={styles.statItem}>
                        <MaterialCommunityIcons
                            name="percent"
                            size={18}
                            color={theme.color.primary[500]}
                        />
                        <View>
                            <ThemedText style={styles.statLabel}>Score</ThemedText>
                            <ThemedText style={styles.statValue}>
                                {attempt.score ? `${Math.round(attempt.score)}%` : '--'}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                {/* Action Hint */}
                {attempt.status === 'in_progress' && (
                    <View style={styles.actionHint}>
                        <ThemedText style={styles.actionText}>
                            Tap to continue
                        </ThemedText>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={theme.color.primary[500]}
                        />
                    </View>
                )}
            </View>
        </Pressable>
    );
};

const QuizAttemptsList: React.FC<QuizAttemptsListProps> = ({quizId, isDark, onAttemptPress}) => {
    const {user} = useAuth();
    const {data: attempts, error, isLoading} = useSWR<QuizAttempt[]>(
        quizId ? `quiz-attemptsss-${quizId}` : null,
        async () => {
            const {data, error} = await supabase
                .from('quiz_attempts')
                .select('*, quiz(quiz_questions(count))')
                .eq('quiz_id', quizId)
                .eq('user_id', user?.id)
                .order('start_time', {ascending: false});

            if (error) throw error;

            return data;
        },
        {
            refreshInterval: 5000,
            revalidateOnFocus: true,
            revalidateOnMount: true,

            revalidateOnReconnect: true,


        }
    );

    if (isLoading) {
        return (
            <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
                <MaterialCommunityIcons
                    name="loading"
                    size={32}
                    color={theme.color.primary[500]}
                />
                <ThemedText style={styles.emptyText}>Chargement des essaies...</ThemedText>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
                <MaterialCommunityIcons
                    name="alert-circle"
                    size={32}
                    color={theme.color.error}
                />
                <ThemedText style={styles.emptyText}>chargement des essaies échoué</ThemedText>
            </View>
        );
    }

    if (!attempts?.length) {
        return (
            <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
                <MaterialCommunityIcons
                    name="history"
                    size={48}
                    color={isDark ? '#4B5563' : '#9CA3AF'}
                />
                <ThemedText style={styles.emptyText}>Aucune tentative pour le moment</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                    Commencez le quiz pour suivre vos progrès
                </ThemedText>
            </View>
        );

    }

    return (
        <View style={styles.attemptsContainer}>
            {attempts.map((attempt, index) => (
                <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    isDark={isDark}
                    onPress={() => onAttemptPress(attempt)}
                    isLast={index === attempts.length - 1}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    attemptsContainer: {
        marginTop: 8,
    },
    attemptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        marginBottom: 12,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    attemptCardDark: {
        backgroundColor: '#374151',
    },
    lastAttempt: {
        marginBottom: 0,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: 12,
        right: 12,
    },
    statusText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
    },
    cardContent: {
        padding: 16,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    dateText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
    },
    progressSection: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
    },
    progressText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarContainerDark: {
        backgroundColor: '#1F2937',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
        borderRadius: 3,
    },
    progressBarComplete: {
        backgroundColor: theme.color.success,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: theme.border.radius.small,
        marginTop: 8,
    },
    statsRowDark: {
        backgroundColor: '#1F2937',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    statValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E7EB',
    },
    actionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    actionText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.primary[500],
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: theme.border.radius.medium,
    },
    emptyContainerDark: {
        backgroundColor: '#1F2937',
    },
    emptyText: {
        marginTop: 12,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    emptySubtext: {
        marginTop: 4,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export default QuizAttemptsList;