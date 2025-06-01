import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, useColorScheme, ActivityIndicator} from 'react-native';
import TopBar from '@/components/TopBar';
import {theme} from '@/constants/theme';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Link, useRouter} from 'expo-router';
import {useAuth} from '@/contexts/auth';
import {useUser} from '@/contexts/useUserInfo'; // Assuming this provides streaks
import LearningPaths from '@/components/shared/LearningPaths';
import NoProgram from "@/components/shared/catalogue/NoProgramCard";
import {checkAndUpdateNotifications} from "@/utils/notification-utils"; // Original
import CustomizableGoals from "@/components/CustimizableHomeScreenGoals";
import Head from "expo-router/head";

// Imports for Weekly Recap
import { useWeeklyRecap, WeeklyRecapData } from '@/hooks/useWeeklyRecap'; // Adjust path if needed
import WeeklyRecapModal from '@/components/shared/WeeklyRecapModal';   // Adjust path if needed
import { checkAndTriggerWeeklyRecap } from '@/utils/notification-utils'; // Adjust path if needed

const {width} = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_MARGIN = 12; // Not used in this file, but present in original
const PATH_CARD_WIDTH = width * 0.6; // Not used in this file, but present in original

export default function IndexScreen() {
    const {user: authUser} = useAuth(); // authUser from useAuth for ID
    const {user, toDayXp, toDayExo, toDayTime, userPrograms, lastCourse, isLoading: userLoading} = useUser(); // Full user object from useUser
    const colorScheme = useColorScheme();
    const router = useRouter();
    const isDarkMode = colorScheme === 'dark';

    // Weekly Recap State & Hooks
    const {
        recapData,
        isRecapAvailable,
        isLoading: recapLoading,
        markRecapAsSeen,
        refetch: refetchRecap
    } = useWeeklyRecap();

    const [showRecapModal, setShowRecapModal] = useState(false);

    useEffect(() => {
        // Original notification check
        checkAndUpdateNotifications();

        // Check and trigger weekly recap logic
        if (authUser?.id) { // Ensure we have a user to avoid unnecessary calls
            checkAndTriggerWeeklyRecap().then(() => {
                // After checking, refetch recap data. This is important if recap_available was just set to true.
                // We only refetch if recap wasn't already available and data is null to avoid loop.
                if (!isRecapAvailable && !recapData) {
                    // If recapData has periodStart and periodEnd, use them, otherwise let hook fetch default
                    const periodStart = recapData?.periodStart;
                    const periodEnd = recapData?.periodEnd;
                    // @ts-ignore
                    refetchRecap(periodStart, periodEnd);
                }
            });
        }
    }, [authUser?.id, isRecapAvailable, refetchRecap, recapData]); // Added dependencies

    useEffect(() => {
        // Show the modal if recap is available and data is loaded
        if (isRecapAvailable && recapData && !recapLoading) {
            setShowRecapModal(true);
        } else {
            setShowRecapModal(false);
        }
    }, [isRecapAvailable, recapData, recapLoading]);

    const handleCloseRecapModal = () => {
        markRecapAsSeen();
        setShowRecapModal(false);
    };

    if (userLoading) { // Show loading indicator if user data is still loading
        return (
            <View style={[styles.container, isDarkMode && styles.containerDark, styles.centeredContent]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    return (
        <View style={isDarkMode ? styles.containerDark : styles.container}>
            <Head>
                <title>Elearn Prepa | Accueil</title>
                <meta name="description" content="PrÃ©parez vos concours avec Elearn Prepa." />
            </Head>

            <TopBar
                userName={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()}
                streaks={user?.user_streaks?.current_streak || 0}
                xp={user?.user_xp?.total_xp || 0}
                onChangeProgram={() => {
                }}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <Text numberOfLines={1} style={isDarkMode ? styles.welcomeTitleDark : styles.welcomeTitle}>
                        {new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'} {user?.firstname} ðŸ‘‹
                    </Text>
                    <Text numberOfLines={1} style={isDarkMode ? styles.welcomeSubtitleDark : styles.welcomeSubtitle}>
                        PrÃªt Ã  continuer votre apprentissage ?
                    </Text>
                </View>

                {/* Current Course */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>En
                            cours</Text>
                        <TouchableOpacity style={styles.seeAllButton}>
                            <Link href={"/(app)/learn"}>
                                <Text style={styles.seeAllText}>Tout voir</Text>
                            </Link>
                        </TouchableOpacity>
                    </View>

                    <View style={isDarkMode ? styles.currentCourseCardDark : styles.currentCourseCard}>
                        <View style={styles.progressBar}>
                            <View
                                style={[styles.progressFill, {width: `${lastCourse?.course_progress_summary?.[0]?.progress_percentage ?? 0}%`}]}/>
                        </View>
                        <View style={styles.courseContent}>
                            <View style={styles.playIconContainer}>
                                <MaterialCommunityIcons name="play" size={24} color="#FFF"/>
                            </View>
                            <View style={styles.courseTitleContainer}>
                                <Text numberOfLines={1}
                                      style={isDarkMode ? styles.courseTitleDark : styles.courseTitle}>
                                    {lastCourse?.name ?? 'Aucun cours en cours'}
                                </Text>
                                <Text numberOfLines={1}
                                      style={isDarkMode ? styles.lessonProgressDark : styles.lessonProgress}>
                                    LeÃ§on {lastCourse?.courses_content?.order ?? 0} â€¢ {lastCourse?.course_progress_summary?.[0]?.progress_percentage ?? 0}% complÃ©tÃ©
                                </Text>
                            </View>
                            <TouchableOpacity style={[styles.continueButton, (!lastCourse?.id) && { backgroundColor: "gray" }]} disabled={!lastCourse?.id} onPress={() => {
                                router.push(`/(app)/learn/${lastCourse?.learning_path?.id}/courses/${lastCourse?.id}/lessons/${lastCourse?.current_section}`)
                            }}>
                                <Text style={styles.continueText}>Continuer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Daily Goals - Replaced with CustomizableGoals component */}
                <CustomizableGoals
                    isDarkMode={isDarkMode}
                    toDayXp={toDayXp || 0}
                    toDayExo={toDayExo || 0}
                    toDayTime={toDayTime || 0}
                />

                {/* Learning Paths */}
                <View style={[styles.section, styles.lastSection]}>
                    <View style={styles.sectionHeader}>
                        <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                            Parcours recommandÃ©s
                        </Text>
                        <TouchableOpacity style={styles.seeAllButton}>
                            <Link href={"/(app)/learn"}>
                                <Text style={styles.seeAllText}>Tout voir</Text>
                            </Link>
                        </TouchableOpacity>
                    </View>
                    {
                        !userPrograms?.length && <NoProgram/>
                    }
                    <LearningPaths programs={[...userPrograms || []]} isDarkMode={isDarkMode}/>
                </View>
            </ScrollView>

            {/* Weekly Recap Modal */}
            {showRecapModal && recapData && (
                <WeeklyRecapModal
                    visible={showRecapModal}
                    onClose={handleCloseRecapModal}
                    data={recapData}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        flex: 1,
        backgroundColor: theme.color.dark.background.primary,
    },
    centeredContent: { // Style for loading indicator centering
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 80, // For bottom tab bar
    },
    header: {
        marginTop: 16,
        marginBottom: 24,
    },
    welcomeTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    welcomeTitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#666',
    },
    welcomeSubtitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#CCCCCC',
    },
    section: {
        marginBottom: 28,
    },
    lastSection: {
        marginBottom: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    sectionTitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    seeAllButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    seeAllText: {
        color: theme.color.primary[500],
        fontWeight: '600',
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
    },
    currentCourseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    currentCourseCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderRadius: theme.border.radius.small,
        shadowColor: '#000', // Shadow might not be very visible in dark mode
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: 3,
        backgroundColor: '#EEE',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
    },
    courseContent: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playIconContainer: {
        width: 40,
        height: 40,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    courseTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    courseTitleDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    lessonProgress: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#666',
    },
    lessonProgressDark: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#CCCCCC',
    },
    continueButton: {
        backgroundColor: theme.color.primary[500],
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: theme.border.radius.small,
    },
    continueText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
    },
    // Styles for notification related elements - if needed in this file
    notificationContainer: {
        padding: 16,
        borderRadius: theme.border.radius.small,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 16,
    },
    notificationText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        marginBottom: 8,
    },
    errorText: { // If you need to display errors, e.g., from recap fetching
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: theme.color.error,
        marginBottom: 8,
        textAlign: 'center'
    },
    notificationDetails: {
        marginTop: 8,
    },
});
