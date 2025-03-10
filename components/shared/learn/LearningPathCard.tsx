import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    useColorScheme,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useProgramProgress } from "@/hooks/useProgramProgress";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import {LearningPath} from "@/app/(app)/learn";

const { width } = Dimensions.get('window');



const ModernLearningPathCard = ({ path } : { path : LearningPath}) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { user } = useAuth();
    const { totalProgress } = useProgramProgress(path.id, user?.id || "");
    const { trigger } = useHaptics();
    const router = useRouter();

    const concours = path.concours_learningpaths?.[0]?.concour;
    const school = concours?.school;

    // Animation values
    const pressed = useSharedValue(0);

    const animatedCardStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: interpolate(pressed.value, [0, 1], [1, 0.98], Extrapolate.CLAMP) },
            ],
        };
    });

    const handlePressIn = () => {
        pressed.value = withSpring(1);
    };

    const handlePressOut = () => {
        pressed.value = withSpring(0);
    };

    const handlePress = () => {
        trigger(HapticType.LIGHT);
        router.push(`/(app)/learn/${path.id}`);
    };

    const formatDate = (dateString: Date) => {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short' };
        // @ts-ignore
        return date.toLocaleDateString('fr-FR', options);
    };

    // Calculate days remaining until exam
    const getDaysRemaining = () => {
        if (!concours?.nextDate) return null;

        const examDate = new Date(concours.nextDate);
        const today = new Date();
        // @ts-ignore
        const diffTime = Math.abs(examDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const daysRemaining = getDaysRemaining();

    return (
        <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
            <Pressable
                style={[
                    styles.card,
                    isDarkMode && styles.cardDark,
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
                {/* Left color accent */}
                <View style={styles.accent} />

                {/* Card content */}
                <View style={styles.contentContainer}>
                    {/* Header section with school and course info */}
                    <View style={styles.header}>
                        <View style={styles.schoolBadge}>
                            <Image
                                source={{ uri: school?.imageUrl || `https://api.dicebear.com/9.x/initials/png?seed=${school?.name}` }}
                                style={styles.schoolLogo}
                            />
                            <Text style={[styles.schoolText, isDarkMode && styles.schoolTextDark]}>
                                {school?.name}
                            </Text>
                        </View>

                        {/* Progress circle */}
                        <View style={styles.progressCircleContainer}>
                            <View style={styles.progressBackground}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${totalProgress}%` }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.progressText, isDarkMode && styles.progressTextDark]}>
                                {totalProgress}%
                            </Text>
                        </View>
                    </View>

                    {/* Title and description */}
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, isDarkMode && styles.titleDark]} numberOfLines={2}>
                            {path.title}
                        </Text>
                        <Text style={[styles.concoursName, isDarkMode && styles.concoursNameDark]}>
                            {concours?.name}
                        </Text>
                    </View>

                    {/* Course statistics */}
                    <View style={[styles.statsRow, isDarkMode && styles.statsRowDark]}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name="book-open-page-variant"
                                size={16}
                                color={theme.color.primary[500]}
                            />
                            <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                {path.course_count}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                cours
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name="help-circle-outline"
                                size={16}
                                color={theme.color.primary[500]}
                            />
                            <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                {path.quiz_count}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                quiz
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={16}
                                color={theme.color.primary[500]}
                            />
                            <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                {path.total_duration}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                heures
                            </Text>
                        </View>
                    </View>

                    {/* Exam date countdown */}
                    {concours?.nextDate && (
                        <View style={[
                            styles.examCountdown,
                            isDarkMode && styles.examCountdownDark,
                            daysRemaining && daysRemaining < 30 ? styles.urgentCountdown : null
                        ]}>
                            <Ionicons
                                name="calendar"
                                size={16}
                                color={daysRemaining && daysRemaining < 30 ? "#E11D48" : theme.color.primary[600]}
                            />
                            <Text style={[
                                styles.examText,
                                daysRemaining && daysRemaining < 30 ? styles.urgentExamText : null,
                                isDarkMode && styles.examTextDark
                            ]}>
                                {daysRemaining ?
                                    `J-${daysRemaining} avant l'examen` :
                                    `Examen le ${formatDate(concours.nextDate)}`
                                }
                            </Text>
                        </View>
                    )}
                </View>

                {/* Continue button */}
                <LinearGradient
                    colors={[theme.color.primary[500], theme.color.primary[700]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.continueButton}
                >
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 0,
        borderRadius: 6,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
    },
    cardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    accent: {
        width: 6,
        backgroundColor: theme.color.primary[500],
    },
    contentContainer: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    schoolBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(209, 213, 219, 0.2)',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    schoolLogo: {
        width: 0,
        height: 16,
        borderRadius: 8,
        marginRight: 6,
    },
    schoolText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4B5563',
    },
    schoolTextDark: {
        color: '#D1D5DB',
    },
    progressCircleContainer: {
        alignItems: 'center',
    },
    progressBackground: {
        width: 50,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
    },
    progressText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.color.primary[600],
        marginTop: 2,
    },
    progressTextDark: {
        color: theme.color.primary[400],
    },
    titleContainer: {
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    titleDark: {
        color: '#FFFFFF',
    },
    concoursName: {
        fontSize: 13,
        color: theme.color.primary[600],
        fontWeight: '500',
    },
    concoursNameDark: {
        color: theme.color.primary[400],
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 5,
        padding: 10,
        marginBottom: 12,
    },
    statsRowDark: {
        backgroundColor: '#374151',

    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    statDivider: {
        height: 20,
        width: 1,
        backgroundColor: '#E5E7EB',
    },
    statText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1F2937',
        marginLeft: 4,
    },
    statTextDark: {
        color: '#F9FAFB',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 2,
    },
    statLabelDark: {
        color: '#D1D5DB',
    },
    examCountdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    examCountdownDark: {
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
    },
    urgentCountdown: {
        backgroundColor: 'rgba(225, 29, 72, 0.1)',
    },
    examText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.color.primary[600],
        marginLeft: 6,
    },
    examTextDark: {
        color: theme.color.primary[400],
    },
    urgentExamText: {
        color: '#E11D48',
    },
    continueButton: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ModernLearningPathCard;