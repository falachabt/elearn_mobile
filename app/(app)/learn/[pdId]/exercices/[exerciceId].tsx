import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import ExerciseContent, { Block as ContentBlock } from "@/components/shared/BlockNoteContent";
import WebView from "react-native-webview";
import { useAuth } from "@/contexts/auth";


interface Exercise {
    id: string;
    title: string;
    description: string;
    content: ContentBlock[];
    correction: ContentBlock[];
    course: {
        name: string;
        courses_categories?: {
            name: string;
        };
    };
}

const ExercisePage: React.FC = () => {
    const { exerciceId } = useLocalSearchParams();
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCorrection, setIsCorrection] = useState(false);
    const [correctionLoading, setCorrectionLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(true);
    const { session } = useAuth();

    useEffect(() => {
        (async () => {
            await fetchExerciseData();
        })();
    }, [exerciceId]);

    const fetchExerciseData = async () => {
        try {
            const { data, error } = await supabase
                .from("exercices")
                .select(`
                    *,
                    course:courses (
                        name,
                        courses_categories (
                            name
                        )
                    )
                `)
                .eq("id", exerciceId)
                .single();

            if (error) {
                console.error("Error fetching exercise:", error);
                return;
            }
            setExercise(data);
        } catch (error) {
            console.error("Unexpected error fetching exercise:", error);
        } finally {
            setLoading(false);
        }
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
        originWhitelist: ['*'] as string[],
        javaScriptEnabled: true,
        domStorageEnabled: true,
        startInLoadingState: true,
        scalesPageToFit: true,
        nestedScrollEnabled: true,
        useWebKit: true,
        injectedJavaScript: darkModeScript,
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    if (!exercise) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={[styles.errorText, isDark && styles.textDark]}>
                    Exercise not found
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
                        {exercise.course.name}
                    </Text>
                    <Text style={[styles.categoryName, isDark && styles.textDark]}>
                        {exercise.course.courses_categories?.name || "No category"}
                    </Text>
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
                    {/*{correctionLoading && isCorrection && (*/}
                    {/*    <ExerciseContent blocks={exercise?.correction} />*/}
                    {/*)}*/}
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
                    {/*{contentLoading && !isCorrection && (*/}
                    {/*    <ExerciseContent blocks={exercise?.content} />*/}
                    {/*)}*/}
                </View>
            </View>

            <TouchableOpacity
                style={[
                    styles.correctionButton,
                    !exercise.correction && styles.disabledButton,
                ]}
                onPress={() => setIsCorrection(!isCorrection)}
                disabled={!exercise.correction || (correctionLoading && contentLoading)}
            >
                <Text style={[styles.correctionButtonText, isDark && styles.textDark]}>
                    {isCorrection ? "Voir l'exercice" : "Voir la correction"}
                </Text>
            </TouchableOpacity>
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
    categoryName: {
        fontSize: 14,
        color: theme.color.gray[600],
        marginTop: 2,
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
    correctionButton: {
        backgroundColor: theme.color.primary[500],
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        margin: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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