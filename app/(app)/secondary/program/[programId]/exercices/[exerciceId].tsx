import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
    Platform
} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, Href} from "expo-router";
import useSWR, { mutate as mutateGlobal } from "swr";
import WebView from "react-native-webview";
import {useCallback, useEffect, useState} from "react";

import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useAuth} from "@/contexts/auth";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useSound} from "@/hooks/useSound";
import {useUser} from "@/contexts/useUserInfo";
import {trackEvent, Events} from '@/utils/analytics';
import {useCustomRouter} from "@/hooks/useCustomRouter";
import {useAppConfig} from "@/contexts/useAppConfig";
import { useNavigation } from "@/contexts/NavigationContext";


const SecondaryExercisePage = () => {
    const {exerciceId, programId} = useLocalSearchParams();
    const router = useCustomRouter();
    const { getExercicePath } = useNavigation();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";
    const {trigger} = useHaptics();
    const {playNextLesson, playCorrect} = useSound();
    const {isSecondaryProgramEnrolled} = useUser();
    const {getWebViewUrls} = useAppConfig();
    const webViewUrls = getWebViewUrls();

    // Check if user is enrolled in this program
    const isEnrolled = isSecondaryProgramEnrolled(String(programId));
    const [isCorrection, setIsCorrection] = useState(false);
    const [correctionLoading, setCorrectionLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(true);
    const {session, user} = useAuth();

    // Fetcher for exercise data
    const exerciseFetcher = useCallback(async () => {
        const {data, error} = await supabase
            .from("exercices")
            .select(`
                *,
                course:courses (
                    name,
                    id,
                    courses_categories (
                        id,
                        name
                    )
                )
            `)
            .eq("id", String(exerciceId))
            .single();

        if (error) throw error;
        return data;
    }, [exerciceId]);

    // Fetcher for pin state
    const pinFetcher = useCallback(async () => {
        if (!user?.id) return {is_pinned: false};

        const {data, error} = await supabase
            .from("exercices_pin")
            .select("is_pinned")
            .eq("exercice_id", exerciceId)
            .eq("user_id", user.id)
            .single();

        if (error && error.code === "PGRST116") return {is_pinned: false};
        if (error) throw error;

        return data;
    }, [exerciceId, user?.id]);

    // Fetcher for completion state
    const completeFetcher = useCallback(async () => {
        if (!user?.id) return {is_completed: false};

        const {data, error} = await supabase
            .from("exercices_complete")
            .select("is_completed")
            .eq("exercice_id", exerciceId)
            .eq("user_id", user.id)
            .single();

        if (error && error.code === "PGRST116") return {is_completed: false};
        if (error) throw error;

        return data;
    }, [exerciceId, user?.id]);

    // Fetcher for next exercise
    const nextExerciseFetcher = useCallback(async () => {
        if (!exerciceId) return null;

        const {data: currentExercise} = await supabase
            .from("exercices")
            .select(`course_id, created_at`)
            .eq("id", exerciceId)
            .single();

        if (!currentExercise) return null;

        const {data: nextExo} = await supabase
            .from("exercices")
            .select("id")
            .eq("course_id", currentExercise?.course_id)
            .neq("id", exerciceId)
            .order('created_at', {ascending: true})
            .gt("created_at", currentExercise?.created_at)
            .limit(1)
            .single();

        return nextExo?.id || null;
    }, [exerciceId]);

    // Fetcher for previous exercise
    const previousExerciseFetcher = useCallback(async () => {
        if (!exerciceId) return null;

        const {data: currentExercise} = await supabase
            .from("exercices")
            .select(`course_id, created_at`)
            .eq("id", exerciceId)
            .single();

        if (!currentExercise) return null;

        const {data: previousExo} = await supabase
            .from("exercices")
            .select("id")
            .eq("course_id", currentExercise?.course_id)
            .neq("id", exerciceId)
            .order('created_at', {ascending: false})
            .lt("created_at", currentExercise?.created_at)
            .limit(1)
            .single();

        return previousExo?.id || null;
    }, [exerciceId]);

    const {data: exercise, error: exerciseError, isLoading: exerciseLoading} =
        useSWR(`secondary-exercise-${exerciceId}`, exerciseFetcher);

    const {data: pinData, mutate: mutatePinData} =
        useSWR(`secondary-exercise-pin-${exerciceId}-${user?.id}`, pinFetcher);

    const {data: completeData, mutate: mutateCompleteData} =
        useSWR(`secondary-exercise-complete-${exerciceId}-${user?.id}`, completeFetcher);

    const {data: nextExerciseId} =
        useSWR(`secondary-next-exercise-${exerciceId}`, nextExerciseFetcher);

    const {data: previousExerciseId} =
        useSWR(`secondary-previous-exercise-${exerciceId}`, previousExerciseFetcher);

    const isPinned = pinData?.is_pinned || false;
    const isCompleted = completeData?.is_completed || false;

    // Track exercise start when component mounts
    useEffect(() => {
        if (exercise) {
            trackEvent(Events.START_EXERCISE, {
                exercise_id: exerciceId,
                exercise_name: exercise.name,
                course_id: exercise.course_id,
                course_name: exercise.course?.name,
                program_id: programId
            });
        }
    }, [exercise, exerciceId, programId]);

    const handleToggleComplete = async () => {
        const newCompletionState = !isCompleted;
        mutateCompleteData({is_completed: newCompletionState}, false);
        trigger(HapticType.SUCCESS);

        if (newCompletionState) {
            playCorrect();

            // Track exercise completion event
            if (exercise) {
                trackEvent(Events.COMPLETE_EXERCISE, {
                    exercise_id: exerciceId,
                    exercise_name: exercise.name,
                    course_id: exercise.course_id,
                    course_name: exercise.course?.name,
                    program_id: programId
                });
            }
        }

        try {
            await supabase
                .from("exercices_complete")
                .upsert(
                    {
                        user_id: user?.id,
                        exercice_id: String(exerciceId),
                        is_completed: newCompletionState,
                    },
                    {onConflict: "user_id,exercice_id"}
                );

            mutateCompleteData();
            
            // Invalidate the exercise list cache to refresh the UI
            mutateGlobal(['secondary-program-exercises', programId, user?.id]);
        } catch (error) {
            console.error("Error updating completion state:", error);
            mutateCompleteData({is_completed: isCompleted}, false);
        }
    };

    const handleTogglePin = async () => {
        const newPinState = !isPinned;
        mutatePinData({is_pinned: newPinState}, false);
        trigger(HapticType.SUCCESS);

        try {
            await supabase
                .from("exercices_pin")
                .upsert(
                    {
                        user_id: user?.id,
                        exercice_id: exerciceId,
                        is_pinned: newPinState,
                    },
                    {onConflict: "user_id,exercice_id"}
                );

            mutatePinData();
            
            // Invalidate the exercise list cache to refresh the UI
            mutateGlobal(['secondary-program-exercises', programId, user?.id]);
        } catch (error) {
            console.error("Error updating pin state:", error);
            mutatePinData({is_pinned: isPinned}, false);
        }
    };

    const handleNextExercise = () => {
        if (nextExerciseId) {
            playNextLesson();
            trigger(HapticType.SELECTION);
            router.replace(getExercicePath(nextExerciseId) as Href);
        }
    };

    const handlePreviousExercise = () => {
        if (previousExerciseId) {
            playNextLesson();
            trigger(HapticType.SELECTION);
            router.replace(getExercicePath(previousExerciseId) as Href);
        }
    };

    const toggleCorrection = () => {
        trigger(HapticType.LIGHT);
        playNextLesson();
        setIsCorrection(!isCorrection);
    };

    // Enhanced dark mode script for better iframe integration
    const darkModeScript = `(function() {
        function applyDarkMode() {
            if (${isDark}) {
                // Apply dark mode to the container
                const container = document.querySelector('.bn-container');
                if (container) {
                    container.classList.add('dark');
                    container.setAttribute('data-color-scheme', 'dark');

                    // Add custom CSS variables for dark mode
                    document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                    document.documentElement.style.setProperty('--bn-colors-editor-background', '#0F172A');
                    document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                    document.documentElement.style.setProperty('--bn-colors-menu-background', '#0F172A');
                    document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');

                    // Inject dark mode style
                    const darkModeStyle = document.createElement('style');
                    darkModeStyle.textContent = 
                        "body { 
                            background-color: #0F172A;
                            color: #FFFFFF;
                        }
                        .bn-container[data-color-scheme=dark] {
                            --bn-colors-editor-text: #FFFFFF;
                            --bn-colors-editor-background: #0F172A;
                            --bn-colors-menu-text: #F3F4F6;
                            --bn-colors-menu-background: #0F172A;
                            background-color: #0F172A;
                            color: #FFFFFF;
                        }
                        .bn-container[data-color-scheme=dark] * {
                            border-color: #374151 !important;
                        }
                        .bn-container[data-color-scheme=dark] .content {
                            background-color: #0F172A;
                            color: #FFFFFF;
                        }
                        ";
                    
                    document.head.appendChild(darkModeStyle);
                }
            }
        }

        // Apply dark mode on load
        if (document.readyState === 'complete') {
            applyDarkMode();
        } else {
            window.addEventListener('load', applyDarkMode);
        }

        // Set up observer to apply dark mode on DOM changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    applyDarkMode();
                }
            }
        });

        // Start observing once DOM is ready
        if (document.readyState !== 'loading') {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    })();`;

    const commonWebViewProps = {
        originWhitelist: ['*'],
        javaScriptEnabled: true,
        domStorageEnabled: true,
        startInLoadingState: true,
        scalesPageToFit: true,
        nestedScrollEnabled: true,
        useWebKit: true,
        injectedJavaScript: darkModeScript,
    };

    if (exerciseLoading) {
        return (
            <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
            </View>
        );
    }

    if (exerciseError || !exercise) {
        return (
            <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
                <Text style={[styles.errorText, isDark && styles.textDark]}>
                    Exercice non trouvé
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                    />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.courseName, isDark && styles.textDark]} numberOfLines={2}>
                        {exercise.name}
                    </Text>
                    <View style={styles.metaContainer}>
                        <Text style={[styles.categoryName, isDark && styles.categoryNameDark]} numberOfLines={2}>
                            {exercise.course?.name || "Sans cours"}
                        </Text>
                        <View style={styles.statusContainer}>
                            {isCompleted && (
                                <View style={[styles.statusBadge, isDark && styles.statusBadgeDark]}>
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={16}
                                        color={theme.color.primary[500]}
                                    />
                                    <Text style={[styles.statusText, isDark && styles.statusTextDark]}>Complété</Text>
                                </View>
                            )}
                            {isPinned && (
                                <View style={[styles.statusBadge, isDark && styles.statusBadgeDark]}>
                                    <MaterialCommunityIcons
                                        name="pin"
                                        size={16}
                                        color={isDark ? "#FFA500" : "#FF8C00"}
                                    />
                                    <Text style={[styles.statusText, isDark && styles.statusTextDark]}>Épinglé</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleTogglePin}
                    >
                        <MaterialCommunityIcons
                            name={isPinned ? "pin-off" : "pin"}
                            size={22}
                            color={isPinned ? (isDark ? "#FFA500" : "#FF8C00") : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleToggleComplete}
                    >
                        <MaterialCommunityIcons
                            name={isCompleted ? "check-circle" : "check-circle-outline"}
                            size={22}
                            color={isCompleted ? theme.color.primary[500] : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Conditional rendering for web and mobile platforms */}
            {Platform.OS === 'web' ? (
                <>
                    {/* Web-specific rendering using iframes */}
                    <View style={styles.contentContainer}>
                        {/* Loading indicators for web */}
                        {(contentLoading || correctionLoading) && (
                            <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
                                <Text style={[styles.loadingText, isDark && styles.textDark]}>
                                    {isCorrection ? "Chargement de la correction..." : "Chargement de l'exercice..."}
                                </Text>
                            </View>
                        )}

                        {/* Correction iframe */}
                        <View style={[
                            styles.webViewContainer,
                            !isCorrection && styles.hidden
                        ]}>
                            <iframe
                                src={`${webViewUrls?.exercise_url}/${exerciceId}/correction?theme=${isDark ? "dark" : "light"}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    backgroundColor: isDark ? theme.color.dark.background.primary : '#FFFFFF',
                                }}
                                onLoad={() => setCorrectionLoading(false)}
                            />
                        </View>

                        {/* Content iframe */}
                        <View style={[
                            styles.webViewContainer,
                            isCorrection && styles.hidden
                        ]}>
                            <iframe
                                src={`${webViewUrls?.exercise_url}/${exerciceId}/content?theme=${isDark ? "dark" : "light"}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    backgroundColor: isDark ? theme.color.dark.background.primary : '#FFFFFF',
                                }}
                                onLoad={() => setContentLoading(false)}
                            />
                        </View>
                    </View>
                </>
            ) : (
                <>
                    {/* Mobile-specific rendering using WebView component */}
                    <View style={styles.contentContainer}>
                        {/* Loading indicators for mobile */}
                        {(contentLoading || correctionLoading) && (
                            <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
                                <Text style={[styles.loadingText, isDark && styles.textDark]}>
                                    {isCorrection ? "Chargement de la correction..." : "Chargement de l'exercice..."}
                                </Text>
                            </View>
                        )}

                        {/* Correction WebView */}
                        <View style={[
                            styles.webViewContainer,
                            !isCorrection && styles.hidden
                        ]}>
                            <WebView
                                source={{
                                    uri: `${webViewUrls?.exercise_url}/${exerciceId}/correction?theme=${isDark ? "dark" : "light"}`,
                                    headers: {
                                        Authorization: `Bearer ${session?.access_token}`,
                                        "color-scheme": isDark ? "dark" : "light",
                                    },
                                }}
                                style={[
                                    styles.webView,
                                    isDark && styles.webViewDark,
                                ]}
                                {...commonWebViewProps}
                                onLoadStart={() => setCorrectionLoading(true)}
                                onLoadEnd={() => setCorrectionLoading(false)}
                                onError={() => setCorrectionLoading(false)}
                            />
                        </View>

                        {/* Content WebView */}
                        <View style={[
                            styles.webViewContainer,
                            isCorrection && styles.hidden
                        ]}>
                            <WebView
                                source={{
                                    uri: `${webViewUrls?.exercise_url}/${exerciceId}/content?theme=${isDark ? "dark" : "light"}`,
                                    headers: {
                                        Authorization: `Bearer ${session?.access_token}`,
                                        "color-scheme": isDark ? "dark" : "light",
                                    },
                                }}
                                style={[
                                    styles.webView,
                                    isDark && styles.webViewDark,
                                ]}
                                {...commonWebViewProps}
                                onLoadStart={() => setContentLoading(true)}
                                onLoadEnd={() => setContentLoading(false)}
                                onError={() => setContentLoading(false)}
                            />
                        </View>
                    </View>
                </>
            )}

            <View style={[styles.bottomButtonsContainer, isDark && styles.bottomButtonsContainerDark]}>
                {/* Only show navigation buttons if user is enrolled */}
                {isEnrolled && previousExerciseId && (
                    <TouchableOpacity
                        style={[styles.nextButton, {marginRight: 8}]}
                        onPress={handlePreviousExercise}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF"/>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[
                        styles.correctionButton,
                        !exercise.correction && styles.disabledButton,
                        !isEnrolled && {flex: 1}, // Take full width if not enrolled
                    ]}
                    onPress={toggleCorrection}
                    disabled={!exercise.correction || correctionLoading || contentLoading}
                >
                    <Text style={[styles.correctionButtonText, isDark && styles.textDark]}>
                        {isCorrection ? "Voir l'exercice" : "Voir la correction"}
                    </Text>
                </TouchableOpacity>

                {isEnrolled && nextExerciseId && (
                    <TouchableOpacity
                        style={styles.nextButton}
                        onPress={handleNextExercise}
                    >
                        <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF"/>
                    </TouchableOpacity>
                )}

                {/* Show purchase button if not enrolled */}
                {!isEnrolled && (
                    <TouchableOpacity
                        style={[styles.nextButton, {backgroundColor: '#F59E0B'}]}
                        onPress={() => router.navigateToShop(programId)}
                    >
                        <MaterialCommunityIcons name="cart" size={24} color="#FFFFFF"/>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        marginBottom: 68,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.border,
        backgroundColor: "#FFFFFF",
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    courseName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        flexWrap: 'wrap',
    },
    categoryName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.gray[600],
        marginRight: 8,
    },
    categoryNameDark: {
        color: theme.color.gray[400],
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(101, 183, 65, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 6,
    },
    statusBadgeDark: {
        backgroundColor: 'rgba(101, 183, 65, 0.2)',
    },
    statusText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        marginLeft: 4,
        color: theme.color.gray[700],
    },
    statusTextDark: {
        color: theme.color.gray[300],
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        zIndex: 10,
    },
    loadingContainerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    loadingText: {
        marginTop: 16,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: theme.color.gray[600],
    },
    webViewContainer: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    webView: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        left: Platform.OS !== "web" ? "-10%" : 0,
        width: Platform.OS !== "web" ? "120%" : "100%",
        marginBottom: 20,
        marginTop: 20,
    },
    webViewDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    hidden: {
        display: 'none',
    },
    bottomButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: theme.color.border,
    },
    bottomButtonsContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderTopColor: theme.color.dark.border,
    },
    correctionButton: {
        flex: 1,
        backgroundColor: theme.color.primary[500],
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    nextButton: {
        width: 56,
        height: 56,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    disabledButton: {
        backgroundColor: "#BDBDBD",
    },
    correctionButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        lineHeight: 24,
    },
    textDark: {
        color: "#FFFFFF",
    },
    errorText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        color: theme.color.gray[600],
    },
});

export default SecondaryExercisePage;
