import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {useRouter, useLocalSearchParams, useNavigation} from "expo-router";
import { theme } from "@/constants/theme";
import ExerciseContent, { Block as ContentBlock } from "@/components/shared/BlockNoteContent";
import WebView from "react-native-webview";
import { useAuth } from "@/contexts/auth";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { useSound } from "@/hooks/useSound";
import useSWR from "swr";

interface Exercise {
    id: string;
    title: string;
    description: string;
    content: ContentBlock[];
    correction: ContentBlock[];
    course: {
        name: string;
        id: string;
        courses_categories?: {
            name: string;
            id: string;
        };
    };
}

interface ExercisePin {
    is_pinned: boolean;
}

interface ExerciseComplete {
    is_completed: boolean;
}

const ExercisePage = () => {
    const { exerciceId, pdId } = useLocalSearchParams();
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";
    const { trigger } = useHaptics();
    const { playNextLesson, playCorrect } = useSound();

    const [isCorrection, setIsCorrection] = useState(false);
    const [correctionLoading, setCorrectionLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(true);
    const { session, user } = useAuth();

    // Fetcher pour les données d'exercice
    const exerciseFetcher = useCallback(async () => {
        const { data, error } = await supabase
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
            .eq("id", exerciceId)
            .single();

        if (error) throw error;
        return data;
    }, [exerciceId]);

    // Fetcher pour l'état épinglé
    const pinFetcher = useCallback(async () => {
        if (!user?.id) return { is_pinned: false };

        const { data, error } = await supabase
            .from("exercices_pin")
            .select("is_pinned")
            .eq("exercice_id", exerciceId)
            .eq("user_id", user.id)
            .single();

        // Si l'entrée n'existe pas encore, on retourne false par défaut
        if (error && error.code === "PGRST116") return { is_pinned: false };
        if (error) throw error;

        return data;
    }, [exerciceId, user?.id]);

    // Fetcher pour l'état complété
    const completeFetcher = useCallback(async () => {
        if (!user?.id) return { is_completed: false };

        const { data, error } = await supabase
            .from("exercices_complete")
            .select("is_completed")
            .eq("exercice_id", exerciceId)
            .eq("user_id", user.id)
            .single();

        // Si l'entrée n'existe pas encore, on retourne false par défaut
        if (error && error.code === "PGRST116") return { is_completed: false };
        if (error) throw error;

        return data;
    }, [exerciceId, user?.id]);

    // Fetcher pour l'exercice suivant
    const nextExerciseFetcher = useCallback(async () => {
        if (!exerciceId) return null;

        // Étape 1: Obtenir les détails de l'exercice actuel
        const { data: currentExercise } = await supabase
            .from("exercices")
            .select(`course_id, created_at`)
            .eq("id", exerciceId)
            .single();

        console.log("currentExercise", currentExercise);

        if (!currentExercise) return null;

        // Étape 2: Trouver les exercices dans la même catégorie
        const { data: nextExo } = await supabase
            .from("exercices")
            .select("id")
            .eq("course_id", currentExercise?.course_id)
            .neq("id", exerciceId)
            .order('created_at', { ascending: true })
            .gt("created_at", currentExercise?.created_at)
            .limit(1)
            .single()

        console.log("nextExo", nextExo);

        if (!nextExo) return null;


        return nextExo.id;
    }, [exerciceId]);


    // Fetcher pour l'exercice précédent
    const previousExerciseFetcher = useCallback(async () => {
        if (!exerciceId) return null;

        // Étape 1: Obtenir les détails de l'exercice actuel
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
            .single()

        console.log("previousExo", previousExo);

        if (!previousExo) return null;

        return previousExo.id;
    }, [exerciceId]);

    // Utilisation de SWR pour optimiser les appels à la base de données
    const { data: exercise, error: exerciseError, isLoading: exerciseLoading } =
        useSWR(`exercise-${exerciceId}`, exerciseFetcher);

    const { data: pinData, mutate: mutatePinData } =
        useSWR(`exercise-pin-${exerciceId}-${user?.id}`, pinFetcher);

    const { data: completeData, mutate: mutateCompleteData } =
        useSWR(`exercise-complete-${exerciceId}-${user?.id}`, completeFetcher);

    const { data: nextExerciseId } =
        useSWR(`next-exercise-${exerciceId}`, nextExerciseFetcher);

    const { data: previousExerciseId } =
        useSWR(`previous-exercise-${exerciceId}`, previousExerciseFetcher);

    // Obtenir les états booléens
    const isPinned = pinData?.is_pinned || false;
    const isCompleted = completeData?.is_completed || false;

    // Gérer le marquage de l'exercice comme terminé
    const handleToggleComplete = async () => {
        const newCompletionState = !isCompleted;

        // Update optimiste pour l'UI
        mutateCompleteData({ is_completed: newCompletionState }, false);

        trigger(HapticType.SUCCESS);

        if (newCompletionState) {
            playCorrect();
        }

        try {
            await supabase
                .from("exercices_complete")
                // @ts-ignore
                .upsert(
                    {
                        user_id: user?.id,
                        exercice_id: String(exerciceId),
                        is_completed: newCompletionState,
                    },
                    { onConflict: ["user_id", "exercice_id"] }
                );

            // Revalider les données
            mutateCompleteData();
        } catch (error) {
            console.error("Error updating completion state:", error);
            // Revert on error
            mutateCompleteData({ is_completed: isCompleted }, false);
        }
    };

    // Gérer l'épinglage de l'exercice
    const handleTogglePin = async () => {
        const newPinState = !isPinned;

        // Update optimiste pour l'UI
        mutatePinData({ is_pinned: newPinState }, false);

        trigger(HapticType.SUCCESS);

        try {
            await supabase
                .from("exercices_pin")
                // @ts-ignore
                .upsert(
                    {
                        user_id: user?.id,
                        exercice_id: exerciceId,
                        is_pinned: newPinState,
                    },
                    { onConflict: ["user_id", "exercice_id"] }
                );

            // Revalider les données
            mutatePinData();
        } catch (error) {
            console.error("Error updating pin state:", error);
            // Revert on error
            mutatePinData({ is_pinned: isPinned }, false);
        }
    };

    // Passer à l'exercice suivant
    const handleNextExercise = () => {
        if (nextExerciseId) {
            playNextLesson();
            trigger(HapticType.SELECTION);
            router.replace({
                pathname: "/(app)/learn/[pdId]/exercices/[exerciceId]",
                params: {
                    pdId: String(pdId),
                    exerciceId: nextExerciseId,
                },
            });
        }
    };

    // passer à l'exercice précédent
    const handlePreviousExercise = () => {
        if (previousExerciseId) {
            playNextLesson();
            trigger(HapticType.SELECTION);
            router.replace({
                pathname: "/(app)/learn/[pdId]/exercices/[exerciceId]",
                params: {
                    pdId: String(pdId),
                    exerciceId: previousExerciseId,
                },
            });
        }
    };

    // Toggle entre l'exercice et la correction
    const toggleCorrection = () => {
        trigger(HapticType.LIGHT);
        playNextLesson();
        setIsCorrection(!isCorrection);
    };

    const darkModeScript = `(function() {
        function applyDarkMode() {
            if (${isDark}) {
                const container = document.querySelector('.bn-container');
                if (container) {
                    container.classList.add('dark');
                    container.setAttribute('data-color-scheme', 'dark');
                    
                    document.documentElement.style.setProperty('--bn-colors-editor-text', '#FFFFFF');
                    document.documentElement.style.setProperty('--bn-colors-editor-background', '#111827');
                    document.documentElement.style.setProperty('--bn-colors-menu-text', '#F3F4F6');
                    document.documentElement.style.setProperty('--bn-colors-menu-background', '#1F2937');
                    document.documentElement.style.setProperty('--bn-colors-editor-border', '#374151');
      
                    const style = document.createElement('style');
                    style.textContent = \`
                        .bn-container[data-color-scheme=dark] {
                            --bn-colors-editor-text: #FFFFFF;
                            --bn-colors-editor-background: #111827;
                            --bn-colors-menu-text: #F3F4F6;
                            --bn-colors-menu-background: #1F2937;
                            background-color: #111827;
                            color: #FFFFFF;
                        }
                        .bn-container[data-color-scheme=dark] * {
                            border-color: #374151 !important;
                        }
                        .bn-container[data-color-scheme=dark] .content {
                            background-color: #111827;
                            color: #FFFFFF;
                        }
                    \`;
                    document.head.appendChild(style);
                }
            }
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    applyDarkMode();
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
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
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    if (exerciseError || !exercise) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={[styles.errorText, isDark && styles.textDark]}>
                    Exercice non trouvé
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
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
                        {exercise.title}
                    </Text>
                    <View style={styles.metaContainer}>
                        <Text style={[styles.categoryName, isDark && styles.textDark]} numberOfLines={2}>
                            {exercise.course.name || "Sans cours"}
                        </Text>
                        <View style={styles.statusContainer}>
                            {isCompleted && (
                                <View style={styles.statusBadge}>
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={16}
                                        color={theme.color.primary[500]}
                                    />
                                    <Text style={styles.statusText}>Complété</Text>
                                </View>
                            )}
                            {isPinned && (
                                <View style={styles.statusBadge}>
                                    <MaterialCommunityIcons
                                        name="pin"
                                        size={16}
                                        color={isDark ? "#FFA500" : "#FF8C00"}
                                    />
                                    <Text style={styles.statusText}>Épinglé</Text>
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

            <View style={styles.contentContainer}>
                {/* Correction WebView */}
                <View style={[
                    styles.webViewContainer,
                    !isCorrection && styles.hidden
                ]}>
                    <WebView
                        source={{
                            uri: `https://elearn.ezadrive.com/fr/webview/exercices/${exerciceId}/correction?theme=${isDark ? "dark" : "light"}`,
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
                        onError={() => setCorrectionLoading(true)}
                    />
                </View>

                {/* Content WebView */}
                <View style={[
                    styles.webViewContainer,
                    isCorrection && styles.hidden
                ]}>
                    <WebView
                        source={{
                            uri: `https://elearn.ezadrive.com/fr/webview/exercices/${exerciceId}/content?theme=${isDark ? "dark" : "light"}`,
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
                        onError={() => setContentLoading(true)}
                    />
                </View>
            </View>

            <View style={styles.bottomButtonsContainer}>
                {previousExerciseId && (
                    <TouchableOpacity
                        style={[styles.nextButton, {marginRight: 8}]}
                        onPress={handlePreviousExercise}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                )}


                <TouchableOpacity
                    style={[
                        styles.correctionButton,
                        !exercise.correction && styles.disabledButton,
                    ]}
                    onPress={toggleCorrection}
                    disabled={!exercise.correction || (correctionLoading && contentLoading)}
                >
                    <Text style={[styles.correctionButtonText, isDark && styles.textDark]}>
                        {isCorrection ? "Voir l'exercice" : "Voir la correction"}
                    </Text>
                </TouchableOpacity>

                {nextExerciseId && (
                    <TouchableOpacity
                        style={styles.nextButton}
                        onPress={handleNextExercise}
                    >
                        <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
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
    },
    backButton: {
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    courseName: {
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
        fontSize: 14,
        color: theme.color.gray[600],
        marginRight: 8,
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
    statusText: {
        fontSize: 12,
        marginLeft: 4,
        color: theme.color.gray[700],
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
        left: "-10%",
        width: "120%",
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
        fontSize: 16,
        fontWeight: "600",
        lineHeight: 24,
    },
    textDark: {
        color: "#FFFFFF",
    },
    errorText: {
        fontSize: 18,
        color: theme.color.gray[600],
    },
});

export default ExercisePage;