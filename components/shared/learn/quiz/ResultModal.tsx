import React, {useState} from 'react';
import {View, Modal, Pressable, StyleSheet, Platform, ActivityIndicator} from 'react-native';
import {ThemedText} from '@/components/ThemedText';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {theme} from '@/constants/theme';
import LottieView from 'lottie-react-native';
import {QuizResults} from '@/types/quiz.type';
import {useGlobalSearchParams, useRouter} from 'expo-router';


interface QuizResultDialogProps {
    visible: boolean;
    isDark: boolean;
    quizName: string;
    results: QuizResults;
    onRetry: () => Promise<void>;
    onContinue: () => Promise<void>;
    onClose: () => void;
}

const StatCard = ({icon, value, label, color, isDark}: {
    icon: string;
    value: string | number;
    label: string;
    color?: string;
    isDark?: boolean;
}) => (
    <View style={[styles.statCard, isDark && styles.statCardDark]}>
        <MaterialCommunityIcons
            name={icon as any}
            size={24}
            color={color || theme.color.primary[500]}
        />
        <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
);

export const QuizResultDialog = ({
                                     visible,
                                     isDark,
                                     quizName,
                                     results,
                                     onRetry,
                                     onContinue,
                                     onClose,
                                 }: QuizResultDialogProps) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const {pdId, quizId, attempId} = useGlobalSearchParams();

    // console.log("results", results);
    const isPassed = (results && results.score !== null ? results.score >= 70 : false);
    const formattedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleRetry = async () => {
        setLoading(true);
        await onRetry();
        setLoading(false);
    };

    const handleContinue = async () => {
        setLoading(true);
        await onContinue();
        setLoading(false);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
                    {/* Animation */}
                    <View style={styles.animationContainer}>
                        <LottieView
                            source={
                                isPassed
                                    ? require('@/assets/animations/success.json')
                                    : require('@/assets/animations/failed.json')
                            }
                            autoPlay
                            loop={false}
                            style={styles.animation}
                        />
                    </View>

                    {/* Quiz Name */}
                    <ThemedText style={styles.quizName} numberOfLines={2}>
                        {quizName}
                    </ThemedText>

                    {/* Score */}
                    <View style={styles.scoreContainer}>
                        <ThemedText style={[
                            styles.scoreValue,
                            {color: isPassed ? '#10B981' : '#EF4444'}
                        ]}>
                            {results?.score !== null ? Math.round(results.score) : 0}%
                        </ThemedText>
                        <ThemedText style={styles.scoreLabel}>
                            {isPassed ? 'Félicitaions !' : 'Ne baisse pas les bras !'}
                        </ThemedText>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="check-circle"
                            value={`${results?.correctAnswers}/${results?.totalQuestions}`}
                            label="Correct Answers"
                            isDark={isDark}
                            color="#10B981"
                        />
                        <StatCard
                            icon="clock-outline"
                            value={formattedTime(results?.timeSpent ?? 0)}
                            isDark={isDark}
                            label="Time Taken"
                        />
                        <StatCard
                            icon="star"
                            value={`+${results?.xpGained}`}
                            isDark={isDark}
                            label="XP Gained"
                            color="#F59E0B"
                        />
                    </View>

                    {/* Message */}
                    <ThemedText style={styles.message}>
                        {isPassed
                            ? "Vous avez réussi le quiz avec succès. Continuez comme ça !"
                            : "Ne vous inquiétez pas ! La pratique rend parfait."}
                    </ThemedText>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[styles.button, styles.retryButton]}
                            onPress={handleRetry}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={theme.color.primary[500]}/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="refresh"
                                        size={20}
                                        color={theme.color.primary[500]}
                                    />
                                </>
                            )}
                        </Pressable>

                        <Pressable
                            style={[styles.button, styles.continueButton]}
                            onPress={() => {
                                onClose()
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF"/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="eye"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </>
                            )}
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.continueButton]}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF"/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="arrow-right"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.medium,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    modalContainerDark: {
        backgroundColor: '#1F2937',
    },
    animationContainer: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    animation: {
        width: '100%',
        height: '100%',
    },
    quizName: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    scoreValue: {
        textAlignVertical: 'center',
        height: 60,
        fontSize: 40,
        fontWeight: '700',
    },
    scoreLabel: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        width: '100%',
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: theme.border.radius.small,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    statCardDark: {
        backgroundColor: '#374151',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
        color: '#6B7280',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: theme.border.radius.small,
        gap: 8,
    },
    retryButton: {
        backgroundColor: `${theme.color.primary[500]}10`,
    },
    retryButtonText: {
        color: theme.color.primary[500],
        fontWeight: '600',
        fontSize: 16,
    },
    continueButton: {
        backgroundColor: theme.color.primary[500],
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});