import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    useColorScheme,
    Dimensions,
    Alert
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons, Ionicons} from '@expo/vector-icons';
import {theme} from '@/constants/theme';
import {useAuth} from '@/contexts/auth';
import {useProgramProgress} from "@/hooks/useProgramProgress";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useRouter} from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import {LearningPath} from "@/app/(app)/learn";

const {width} = Dimensions.get('window');

const ModernLearningPathCard = ({path, previewMode = false}: { path: LearningPath, previewMode?: boolean }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const isEnrolled = path.enrollmentId || false
    const {user} = useAuth();
    const {totalProgress} = isEnrolled ? useProgramProgress(path.id, user?.id || "") : {totalProgress: 0};
    const {trigger} = useHaptics();
    const router = useRouter();

    const concours = path.concours_learningpaths?.[0]?.concour;
    const school = concours?.school;

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
        router.push(`/(app)/(catalogue)/shop`);
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
                        text: "Voir l'offre",
                        onPress: () => router.push(`/(app)/(catalogue)/shop`),
                    },
                    {
                        text: "Annuler",
                        style: "cancel"
                    }
                ]
            );
        }
    };

    const formatDate = (dateString: Date) => {
        const date = new Date(dateString);
        const options = {day: 'numeric', month: 'short'};
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
        <Animated.View style={[
            styles.cardContainer,
            animatedCardStyle,
            !isEnrolled && !previewMode && styles.notEnrolledCard
        ]}>
            <Pressable
                style={[
                    styles.card,
                    isDarkMode && styles.cardDark,
                    !isEnrolled && !previewMode && styles.notEnrolledCardInner
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleCardPress}
                onLongPress={handleLongPress}
                android_ripple={{color: 'rgba(0, 0, 0, 0.1)'}}
            >
                {/* Not enrolled badge */}
                {!isEnrolled && !previewMode && (
                    <View style={styles.notEnrolledBadge}>
                        <Text style={styles.notEnrolledText}>Accès limité</Text>
                    </View>
                )}

                {/* Left color accent */}
                <View style={[
                    styles.accent,
                    !isEnrolled && !previewMode && styles.notEnrolledAccent
                ]}/>

                {/* Card content */}
                <View style={styles.contentContainer}>
                    {/* Header section with school and course info */}
                    <View style={styles.header}>
                        <View style={styles.schoolBadge}>
                            <Image
                                source={{uri: school?.imageUrl || `https://api.dicebear.com/9.x/initials/png?seed=${school?.name}`}}
                                style={styles.schoolLogo}
                            />
                            <Text style={[styles.schoolText, isDarkMode && styles.schoolTextDark]}>
                                {school?.name}
                            </Text>
                        </View>

                        {/* Progress circle */}
                        {(isEnrolled || previewMode) && (
                            <View style={styles.progressCircleContainer}>
                                <View style={styles.progressBackground}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {width: `${totalProgress}%`}
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.progressText, isDarkMode && styles.progressTextDark]}>
                                    {totalProgress}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Title and description */}
                    <View style={styles.titleContainer}>
                        <Text style={[
                            styles.title,
                            isDarkMode && styles.titleDark,
                            !isEnrolled && !previewMode && styles.notEnrolledTitle
                        ]} numberOfLines={2}>
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
                                color={daysRemaining && daysRemaining < 30 ? "#E11D48" : (!isEnrolled && !previewMode ? '#9CA3AF' : theme.color.primary[600])}
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

                {/* Action buttons - Double bouton pour les non-enrollés */}
                {!isEnrolled && !previewMode ? (
                    <View style={styles.doubleButtonContainer}>
                        {/* Bouton d'accès limité */}
                        <Pressable
                            style={styles.limitedAccessButton}
                            onPress={handleCardPress}
                        >
                            <MaterialCommunityIcons
                                name="eye"
                                size={18}
                                color={theme.color.primary[600]}
                            />
                        </Pressable>

                        {/* Bouton shop */}
                        <LinearGradient
                            colors={[theme.color.primary[500], theme.color.primary[700]]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.shopButton}
                        >
                            <Pressable
                                style={styles.shopButtonPressable}
                                onPress={handleShopPress}
                            >
                                <MaterialCommunityIcons
                                    name="cart"
                                    size={18}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </LinearGradient>
                    </View>
                ) : (
                    /* Bouton continuer pour les enrollés */
                    <LinearGradient
                        colors={[theme.color.primary[500], theme.color.primary[700]]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.continueButton}
                    >
                        <MaterialCommunityIcons
                            name="arrow-right"
                            size={20}
                            color="#FFFFFF"
                        />
                    </LinearGradient>
                )}
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
    notEnrolledCardInner: {
        opacity: 0.92,
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
    notEnrolledTitle: {
        color: '#4B5563',
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
        width: '80%',
        backgroundColor: 'rgba(209, 213, 219, 0.15)',
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    titleDark: {
        color: '#FFFFFF',
    },
    concoursName: {
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
    doubleButtonContainer: {
        width: 40,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    limitedAccessButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        marginBottom: 1,
    },
    shopButton: {
        flex: 1,
    },
    shopButtonPressable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ModernLearningPathCard;