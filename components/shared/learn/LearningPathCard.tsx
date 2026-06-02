import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    useColorScheme,
    Alert
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

import {theme} from '@/constants/theme';
import {useAuth} from '@/contexts/auth';
import {useProgramProgress} from "@/hooks/useProgramProgress";
import {useLearningPathEnrollmentCounts} from "@/hooks/useLearningPathEnrollmentCounts";
import {getInflatedEnrollmentCount} from "@/utils/inflatedCount";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {LearningPath} from "@/app/(app)/learn";

const getLevelLabel = (level?: number | string | null) => {
    if (level === undefined || level === null || level === '') {
        return null;
    }

    return `Niveau ${level}`;
};

const ModernLearningPathCard = ({path, previewMode = false}: { path: LearningPath, previewMode?: boolean }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const isEnrolled = !!path.isEnrolled
    const isGenerousWeek = path.isGenerousWeek || false;
    const {user} = useAuth();
    
    // Always call the hook - never conditionally
    const {totalProgress: hookProgress} = useProgramProgress(path.id, user?.id || "");
    
    // Use progress only if enrolled
    const totalProgress = isEnrolled ? hookProgress : 0;

    // Social proof: real enrolled count from DB (the only dynamic part).
    const {countFor} = useLearningPathEnrollmentCounts();
    const realEnrolled = countFor(path.id);

    const {trigger} = useHaptics();
    const router = useRouter();

    const concours = path.concours_learningpaths?.[0]?.concour;
    const school = concours?.school;
    const levelLabel = getLevelLabel(concours?.study_cycles?.level);
    const logoUri = school?.imageUrl || concours?.image?.url || `https://api.dicebear.com/9.x/initials/png?seed=${school?.name || concours?.name || path.id}`;

    // Inflated display count: stable base/drift seeded by concours name + real count.
    const enrolledCount = getInflatedEnrollmentCount(concours?.name ?? path.id, realEnrolled);

    // Animation values
    const pressed = useSharedValue(0);

    const animatedCardStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {scale: interpolate(pressed.value, [0, 1], [1, 0.98], Extrapolate.CLAMP)},
            ],
        };
    });

    const handlePressIn = () => {
        pressed.value = withSpring(1);
    };

    const handlePressOut = () => {
        pressed.value = withSpring(0);
    };

    const handleCardPress = () => {
        trigger(HapticType.LIGHT);
        // Navigation vers le contenu (même pour les non-enrollés avec accès limité)
        router.push(`/(app)/learn/${path.id}`);
    };

    const handleShopPress = () => {
        trigger(HapticType.MEDIUM);
        router.push(`/(app)/learn/${path.id}/payment`);
    };

    const handleLongPress = () => {
        if (!isEnrolled && !previewMode) {
            trigger(HapticType.HEAVY);
            Alert.alert(
                "Actions disponibles",
                "Que souhaitez-vous faire ?",
                [
                    {
                        text: "Accès limité",
                        onPress: () => router.push(`/(app)/learn/${path.id}`),
                    },
                    {
                        text: "S'inscrire",
                        onPress: () => router.push(`/(app)/learn/${path.id}/payment`),
                    },
                    {
                        text: "Annuler",
                        style: "cancel"
                    }
                ]
            );
        }
    };
    return (
        <Animated.View style={[
            styles.cardContainer,
            animatedCardStyle,
            !isEnrolled && !previewMode && !isGenerousWeek && styles.notEnrolledCard,
            isGenerousWeek && styles.generousWeekCard
        ]}>
            <Pressable
                style={[
                    styles.card,
                    isDarkMode && styles.cardDark,
                    !isEnrolled && !previewMode && !isGenerousWeek && styles.notEnrolledCardInner,
                    isGenerousWeek && !isDarkMode && styles.generousWeekCardInner,
                    isGenerousWeek && isDarkMode && styles.generousWeekCardInnerDark
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleCardPress}
                onLongPress={handleLongPress}
                android_ripple={{color: 'rgba(0, 0, 0, 0.1)'}}
            >
                {/* Not enrolled badge */}
                {!isEnrolled && !previewMode && !isGenerousWeek && (
                    <View style={styles.notEnrolledBadge}>
                        <Text style={styles.notEnrolledText}>Accès limité</Text>
                    </View>
                )}

                {/* Generous week badge */}
                {isGenerousWeek && (
                    <View style={styles.generousWeekBadge}>
                        <Text style={styles.generousWeekText}>Semaine Généreuse</Text>
                    </View>
                )}

                {/* Left color accent */}
                <View style={[
                    styles.accent,
                    !isEnrolled && !previewMode && !isGenerousWeek && styles.notEnrolledAccent,
                    isGenerousWeek && styles.generousWeekAccent
                ]}/>

                {/* Card content */}
                <View style={styles.contentContainer}>
                    {/* Header section with school and course info */}
                    <View style={styles.header}>
                        <View style={styles.schoolBadge}>
                            <Image
                                source={{uri: logoUri}}
                                style={styles.schoolLogo}
                                resizeMode="contain"
                            />
                            <View style={styles.schoolMeta}>
                                <Text style={[styles.schoolSigle, isDarkMode && styles.schoolSigleDark]} numberOfLines={1}>
                                    {levelLabel ? `${school?.sigle || school?.name} • ${levelLabel}` : (school?.sigle || school?.name)}
                                </Text>
                                <Text style={[styles.schoolText, isDarkMode && styles.schoolTextDark]} numberOfLines={1}>
                                    {school?.name}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Course statistics */}
                    <View style={[styles.statsRow, isDarkMode && styles.statsRowDark]}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name="book-open-page-variant"
                                size={16}
                                color={!isEnrolled && !previewMode ? '#9CA3AF' : theme.color.primary[500]}
                            />
                            <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                {path.course_count}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                cours
                            </Text>
                        </View>

                        <View style={styles.statDivider}/>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name="help-circle-outline"
                                size={16}
                                color={!isEnrolled && !previewMode ? '#9CA3AF' : theme.color.primary[500]}
                            />
                            <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                {path.quiz_count}
                            </Text>
                            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                quiz
                            </Text>
                        </View>

                        {enrolledCount > 0 && (
                            <>
                                <View style={styles.statDivider}/>

                                <View style={styles.statItem}>
                                    <MaterialCommunityIcons
                                        name="account-group"
                                        size={16}
                                        color={!isEnrolled && !previewMode ? '#9CA3AF' : theme.color.primary[500]}
                                    />
                                    <Text style={[styles.statText, isDarkMode && styles.statTextDark]}>
                                        {enrolledCount}
                                    </Text>
                                    <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                                        inscrits
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {(isEnrolled || previewMode) && (
                        <View style={styles.progressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={[styles.progressLabel, isDarkMode && styles.progressLabelDark]}>
                                    Progression
                                </Text>
                                <Text style={[styles.progressPercent, isDarkMode && styles.progressPercentDark]}>
                                    {totalProgress}%
                                </Text>
                            </View>
                            <View style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {width: `${totalProgress}%`}
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.ctaRow}>
                        {!isEnrolled && !previewMode ? (
                            <>
                                <Pressable
                                    style={[styles.secondaryCta, isDarkMode && styles.secondaryCtaDark]}
                                    onPress={handleCardPress}
                                >
                                    <MaterialCommunityIcons
                                        name="eye-outline"
                                        size={18}
                                        color={theme.color.primary[600]}
                                    />
                                    <Text style={styles.secondaryCtaText}>Aperçu</Text>
                                </Pressable>

                                <LinearGradient
                                    colors={[theme.color.primary[500], theme.color.primary[700]]}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 0}}
                                    style={styles.primaryCtaGradient}
                                >
                                    <Pressable
                                        style={styles.primaryCta}
                                        onPress={handleShopPress}
                                    >
                                        <MaterialCommunityIcons
                                            name="cart-outline"
                                            size={18}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.primaryCtaText}>S'inscrire</Text>
                                    </Pressable>
                                </LinearGradient>
                            </>
                        ) : (
                            <LinearGradient
                                colors={[theme.color.primary[500], theme.color.primary[700]]}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 0}}
                                style={styles.primaryCtaGradient}
                            >
                                <Pressable
                                    style={styles.primaryCta}
                                    onPress={handleCardPress}
                                >
                                    <Text style={styles.primaryCtaText}>
                                        {previewMode ? 'Voir le programme' : 'Continuer'}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="arrow-right"
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                </Pressable>
                            </LinearGradient>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 0,
        borderRadius: 6,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
    },
    notEnrolledCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
        shadowOpacity: 0.08,
    },
    generousWeekCard: {
        borderWidth: 1,
        borderColor: '#10B981', // Green border for generous week
        elevation: 3,
        shadowOpacity: 0.15,
        shadowColor: '#10B981',
    },
    notEnrolledCardInner: {
        opacity: 0.92,
    },
    generousWeekCardInner: {
        backgroundColor: '#F0FDF4', // Light green background for generous week
    },
    generousWeekCardInnerDark: {
        backgroundColor: theme.color.dark.background.primary, // Dark green background for generous week in dark mode
    },
    notEnrolledAccent: {
        backgroundColor: '#D1D5DB',
    },
    notEnrolledBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    notEnrolledText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    generousWeekBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#10B981', // Green color for generous week
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    generousWeekText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    generousWeekAccent: {
        backgroundColor: '#10B981', // Green color for generous week
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
        flex: 1,
        backgroundColor: 'rgba(209, 213, 219, 0.15)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    schoolLogo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        marginRight: 10,
        backgroundColor: '#FFFFFF',
    },
    schoolMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    schoolSigle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    schoolSigleDark: {
        color: '#FFFFFF',
    },
    schoolText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '500',
        color: '#4B5563',
    },
    schoolTextDark: {
        color: '#D1D5DB',
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '500',
        color: '#1F2937',
        marginLeft: 4,
    },
    statTextDark: {
        color: '#F9FAFB',
    },
    statLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 2,
    },
    statLabelDark: {
        color: '#D1D5DB',
    },
    progressSection: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    progressLabelDark: {
        color: '#CBD5E1',
    },
    progressPercent: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '700',
        color: theme.color.primary[600],
    },
    progressPercentDark: {
        color: '#DCFCE7',
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressTrackDark: {
        backgroundColor: '#334155',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
        borderRadius: 999,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    secondaryCta: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.color.primary[200],
        backgroundColor: theme.color.primary[50],
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    secondaryCtaDark: {
        backgroundColor: 'rgba(20, 83, 45, 0.22)',
        borderColor: '#22C55E',
    },
    secondaryCtaText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '700',
        color: theme.color.primary[700],
    },
    primaryCtaGradient: {
        flex: 1,
        borderRadius: 10,
    },
    primaryCta: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    primaryCtaText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default React.memo(ModernLearningPathCard);
