import React, {useState, useEffect, useCallback, useMemo, memo} from "react";
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Platform,
    StatusBar,
    Alert,
    Dimensions,
    Image,
    Text,
} from "react-native";
import {useRouter, useLocalSearchParams} from "expo-router";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {ThemedText} from "@/components/ThemedText";
import {useColorScheme} from "@/hooks/useColorScheme";
import {theme} from "@/constants/theme";
import {
    useQuiz,
    useQuizQuestions,
    useQuizAttempt,
    useQuizResults,
} from "@/hooks/useQuiz";
import {QuizProvider, useQuizContext} from "@/contexts/quizContext";
import LottieView from "lottie-react-native";
import {QuizResultDialog} from "@/components/shared/learn/quiz/ResultModal";
import {QuizService} from "@/services/quiz.service";
import {supabase} from "@/lib/supabase";
import {useAuth} from "@/contexts/auth";
import {QuizResults} from "@/types/quiz.type";
import QuizResultsDisplay from "@/components/shared/learn/quiz/QuizResultDisplay";
import BlockNoteContent from "@/components/shared/BlockNoteContent";
import ExerciseInstructionsDrawer from "@/components/shared/learn/quiz/ExerciseInstructionsDrawer";
import Katex from 'react-native-katex';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Define TypeScript interfaces for component props
type MixedContentRendererProps = {
    text: string;
    style: any;
    isDark: boolean;
    containerWidth?: number;
};

type OptionButtonProps = {
    option: {
        id: string;
        value: string;
    };
    isSelected: boolean;
    isMultiple: boolean;
    onPress: (id: string) => void;
    isDark: boolean;
    contentWidth: number;
    disabled: boolean;
};

type QuizHeaderProps = {
    isDark: boolean;
};

type QuestionContentProps = {
    isDark: boolean;
};

type QuizFooterProps = {
    isDark: boolean;
    onFinish: (data: any) => void;
};

// Enhanced mixed content renderer with improved LaTeX rendering
const MixedContentRenderer = memo(({
                                       text,
                                       style,
                                       isDark,
                                       containerWidth: customWidth
                                   }: MixedContentRendererProps) => {
    const [katexHeight, setKatexHeight] = useState(50);

    // Calculate container width (accounting for padding)
    const containerWidth = customWidth || SCREEN_WIDTH;

    // Detect if text contains math expressions
    const hasMath = String(text)?.includes('$$');

    // Hooks are now always called, regardless of conditions
    const convertToLatexExpression = useCallback((mixedText: string) => {
        const tempMarker = "___DOLLAR___";
        let processedText = mixedText.replace(/\\\$/g, tempMarker);

        const segments = processedText.split(/(\$\$[^$]+\$\$)/g);

        let latexExpression = '';
        segments.forEach((segment: string) => {
            if (segment.startsWith('$$') && segment.endsWith('$$')) {
                const formula = segment.slice(2, -2);
                latexExpression += formula + ' ';
            } else if (segment.trim()) {
                const escapedText = segment
                    .replace(/\\/g, '\\\\')
                    .replace(/\{/g, '\\{')
                    .replace(/\}/g, '\\}')
                    .replace(/\_/g, '\\_')
                    .replace(/\^/g, '\\^')
                    .replace(/\#/g, '\\#')
                    .replace(/\&/g, '\\&')
                    .replace(/\$/g, '\\$')
                    .replace(/\%/g, '\\%')
                    .replace(new RegExp(tempMarker, 'g'), '$');

                latexExpression += `\\text{${escapedText}} `;
            }
        });

        return latexExpression;
    }, []);

    const getKatexStyle = useCallback(() => {
        const fontSize = style?.fontSize || 16;
        const textColor = isDark ? '#FFFFFF' : '#000000';

        return `
    html {
        // Remove the width constraint
    }
    
    .katex-display {
        display: block;
        margin: 0;
        padding: 10px 0;
        overflow-x: auto;
        overflow-y: hidden;
    }
    
    .katex {
        font-size: 2.7em;
        line-height: 1.2;
        // Change this from normal to nowrap for math expressions
        white-space: nowrap;
        // Remove these word breaking properties for math content
        // word-wrap: break-word;
        // word-break: break-word;
        color: ${textColor};
        display: inline-block; // Change from block to inline-block
        // Remove the fixed width here
        margin: 0;
        padding: 10px 0;
        // Remove overflow-wrap property
    }
    
    // For text content only (not math)
    .katex .mord.text {
         font-size: 2em;
        line-height: 1.2;
        color: ${textColor};
        display: inline; // Change to inline
        // Remove the fixed width
        margin: 0;
        padding: 10px 0;
        white-space: normal; // Normal text can wrap
        word-wrap: break-word;
    }
    
    .katex-html {
        // Only use these properties for text content
        // white-space: normal;
        // word-wrap: break-word;
        // word-break: break-word;
        // overflow-wrap: break-word;
    }
    
    /* Handle long expressions with scrolling instead of breaking */
    .katex .base {
        // Remove these properties to prevent breaking math expressions
        // word-break: break-word;
        // word-wrap: break-word;
        // overflow-wrap: break-word;
    }
    
    /* Add specific handling for math operators and symbols */
    .katex .mbin, .katex .mrel, .katex .mop {
        display: inline-block;
    }
`;
    }, [isDark, style, containerWidth]);




    const injectedJavaScript = `
        function updateSize() {
            const height = document.documentElement.scrollHeight;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'dimensions',
                height: height
            }));
        }
        updateSize();
        const observer = new MutationObserver(updateSize);
        observer.observe(document.body, { childList: true, subtree: true });
        true;
    `;

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'dimensions') {
                setKatexHeight(data.height / 4);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    if (!text) return null;

    if (!hasMath) {
        return <Text style={style}>{text}</Text>;
    }

    try {
        const latexExpression = convertToLatexExpression(text);
        return (
            <View style={{
                width: containerWidth,
                minHeight: 30,
            }}>
                <Katex
                    expression={latexExpression}
                    style={[styles.katexComponent, { height: katexHeight }]}
                    inlineStyle={getKatexStyle()}
                    throwOnError={false}
                    displayMode={false}
                    errorColor={isDark ? '#FF6B6A' : '#FF0000'}
                    onError={console.warn}
                    injectedJavaScript={injectedJavaScript}
                    onMessage={onMessage}
                />
            </View>
        );
    } catch (error) {
        console.error('MixedContentRenderer error:', error);
        return <Text style={style}>{text.replace(/\$\$(.*?)\$\$/g, '[Math]')}</Text>;
    }
});

// Header component showing progress and timer
const QuizHeader = memo(({isDark}: QuizHeaderProps) => {
    const {currentQuestion, totalQuestions, progress, attempt, results} =
        useQuizContext();

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }, []);

    // Calculate time display only when timeSpent changes
    const timeDisplay = useMemo(() => {
        const timeToFormat = results?.status === "in_progress"
            ? attempt.timeSpent ?? 0
            : results?.timeSpent ?? 0;
        return formatTime(timeToFormat);
    }, [formatTime, results?.status, attempt.timeSpent, results?.timeSpent]);

    // Calculate progress width only when progress or results change
    const progressWidth = useMemo(() => {
        return `${results?.status === "in_progress" ? progress : Number(results?.score)}%`;
    }, [progress, results?.status, results?.score]);

    return (
        <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={styles.progressInfo}>
                <ThemedText style={styles.questionCounter}>
                    Question {(currentQuestion?.order ?? 0) + 1}/{totalQuestions}
                </ThemedText>
                <ThemedText style={styles.timer}>
                    Time: {timeDisplay}
                </ThemedText>
            </View>
            <View style={{flexDirection: "row", alignItems: "center"}}>
                {
                    results?.status !== "in_progress" &&
                    <ThemedText style={styles.timer}> {results?.score?.toFixed(2)}% </ThemedText>
                }
                <View style={styles.progressBar}>
                    <View
                        style={[styles.progressFill, {width: progressWidth}]}/>
                </View>
            </View>
        </View>
    );
});

// Option button component to reduce re-renders
const OptionButton = memo(({
                               option,
                               isSelected,
                               isMultiple,
                               onPress,
                               isDark,
                               contentWidth,
                               disabled
                           }: OptionButtonProps) => {
    return (
        <Pressable
            key={option.id}
            style={[
                styles.optionButton,
                isDark && styles.optionButtonDark,
                isSelected && styles.optionSelected,
                disabled && styles.buttonDisabled
            ]}
            onPress={() => !disabled && onPress(option.id)}
            disabled={disabled}
        >
            <View style={styles.optionTextContainer}>
                <MixedContentRenderer
                    text={option.value}
                    style={[
                        styles.optionText,
                        isDark && styles.optionTextDark,
                        isSelected && styles.optionTextSelected,
                    ]}
                    isDark={isDark}
                    containerWidth={contentWidth - 48} // Account for option padding and icon
                />
            </View>
            {isMultiple && (
                <MaterialCommunityIcons
                    name={
                        isSelected
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                    }
                    size={24}
                    color={
                        isSelected
                            ? theme.color.primary[500]
                            : "#6B7280"
                    }
                />
            )}
        </Pressable>
    );
});

// Question display component
const QuestionContent = memo(({isDark}: QuestionContentProps) => {
    const {currentQuestion, attempt, handleAnswerSelect, results, isCompleted} =
        useQuizContext();

    // Early return for null question
    if (!currentQuestion) return null;

    // Show results if not in progress
    if (results?.status !== "in_progress" || isCompleted) {
        return (
            <QuizResultsDisplay
                currentQuestion={currentQuestion}
                attempt={results}
                isDark={isDark}
            />
        );
    }

    // Calculate available width for content - memoized to prevent recalculation
    const contentWidth = useMemo(() => SCREEN_WIDTH - 72, []);

    // Memoize answer selection handler
    const onSelectAnswer = useCallback((optionId: string) => {
        handleAnswerSelect(optionId);
    }, [handleAnswerSelect]);

    return (
        <View style={[styles.questionCard, isDark && styles.questionCardDark]}>
            {currentQuestion.hasImg && currentQuestion.image && (
                <View style={styles.imageContainer}>
                    <Image
                        source={{uri: (currentQuestion.image).url}}
                        style={styles.questionImage}
                        resizeMode="contain"
                    />
                </View>
            )}

            {/* Question title with integrated KaTeX rendering */}
            <View style={styles.questionTitleContainer}>
                <MixedContentRenderer
                    text={currentQuestion.title}
                    style={[styles.questionTitle, isDark && styles.questionTitleDark]}
                    isDark={isDark}
                    containerWidth={contentWidth}
                />
            </View>

            <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option) => (
                    <OptionButton
                        key={option.id}
                        option={option}
                        isSelected={attempt.selectedAnswers.includes(option.id)}
                        isMultiple={currentQuestion.isMultiple}
                        onPress={onSelectAnswer}
                        isDark={isDark}
                        contentWidth={contentWidth}
                        disabled={isCompleted || results?.status !== "in_progress"}
                    />
                ))}
            </View>

            <BlockNoteContent blocks={currentQuestion.details}/>
        </View>
    );
});

// Updated QuizFooter component with Exercise Instructions
const QuizFooter = memo(({
                             isDark,
                             onFinish,
                         }: QuizFooterProps) => {
    const router = useRouter();
    const {quizId, attemptId, pdId} = useLocalSearchParams();
    const {
        attempt: {selectedAnswers, status},
        results,
        isLastQuestion,
        isFirstQuestion,
        handleNextQuestion,
        handlePreviousQuestion,
        isCompleted
    } = useQuizContext();
    const {quiz, isLoading: quizLoading} = useQuiz(String(quizId));

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    const isExerciseMode = useMemo(() => quiz?.isExerciseMode === true, [quiz]);

    // Removed auto-redirect effect to let user control when to exit

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;

        try {
            if (isCompleted) {
                await handleNextQuestion();
                return;
            }

            setIsSubmitting(true);

            if (isLastQuestion) {
                const re = await handleNextQuestion();

                if (typeof re === "object" && re !== null && re?.status !== "in_progress") {
                    onFinish(re);
                }
            } else {
                await handleNextQuestion();
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            Alert.alert("Error", "Failed to submit answer. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, results, isLastQuestion, handleNextQuestion, onFinish, isCompleted]);

    const handlePrevious = useCallback(() => {
        handlePreviousQuestion();
    }, [handlePreviousQuestion]);

    const toggleInstructions = useCallback(() => {
        setShowInstructions(prev => !prev);
    }, []);

    // Determine button disabled states
    // In review mode, allow navigation but not answer selection
    const isPrevDisabled = isSubmitting || isFirstQuestion;
    const isNextDisabled = !isCompleted &&
        (selectedAnswers.length === 0 || isSubmitting) &&
        results?.status === "in_progress";

    return (
        <>
            {/* Exercise Instructions Modal - Only shown when exercise mode is true and button is clicked */}
            {isExerciseMode && (
                <ExerciseInstructionsDrawer
                    quizId={String(quizId)}
                    visible={showInstructions}
                    onClose={() => setShowInstructions(false)}
                />
            )}

            <View style={[
                styles.footer,
                isDark && styles.footerDark
            ]}>
                <Pressable
                    style={[
                        styles.navigationButton,
                        isPrevDisabled && styles.buttonDisabled,
                    ]}
                    onPress={handlePrevious}
                    disabled={isPrevDisabled}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF"/>
                    ) : (
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color="#FFFFFF"
                        />
                    )}
                </Pressable>

                {/* Exercise Button - Only shown in exercise mode */}
                {isExerciseMode && (
                    <Pressable
                        style={[
                            styles.exerciseButton,
                            isDark && styles.exerciseButtonDark,
                            showInstructions && styles.exerciseButtonActive
                        ]}
                        onPress={toggleInstructions}
                    >
                        <MaterialCommunityIcons
                            name="book-open-variant"
                            size={20}
                            color={showInstructions ? "#FFFFFF" : (isDark ? "#FFFFFF" : "#000000")}
                        />
                        <ThemedText
                            style={[
                                styles.exerciseButtonText,
                                showInstructions && styles.exerciseButtonTextActive
                            ]}
                        >
                            Instructions
                        </ThemedText>
                    </Pressable>
                )}

                <Pressable
                    style={[
                        styles.navigationButton,
                        isNextDisabled && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isNextDisabled}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF"/>
                    ) : (
                        <MaterialCommunityIcons
                            name={isLastQuestion ? "check" : "arrow-right"}
                            size={24}
                            color="#FFFFFF"
                        />
                    )}
                </Pressable>
            </View>
        </>
    );
});

// Main quiz content component
const QuizContent = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();
    const {quizId, pdId} = useLocalSearchParams();
    const {currentQuestion, isCompleted, isNewlyCompleted, results} = useQuizContext();
    const [showResult, setShowResult] = useState(false);
    const [quizResults, setQuizResults] = useState<any>(null);
    const {quiz} = useQuiz(String(quizId));
    const {user} = useAuth();

    // Effect to show results automatically ONLY when quiz is newly completed
    // useEffect(() => {
    //     if (isNewlyCompleted && results && !showResult) {
    //         setQuizResults(results);
    //         setShowResult(true);
    //     }
    // }, [isNewlyCompleted, results, showResult]);

    const resetQuiz = useCallback(async () => {
        try {
            const {data: attempt, error} = await supabase
                .from("quiz_attempts")
                .insert([
                    {
                        quiz_id: quizId,
                        user_id: user?.id, // Get current user ID
                        start_time: new Date().toISOString(),
                        end_time: new Date(Date.now() + 30 * 60000).toISOString(),
                        status: "in_progress",
                        answers: {}, // Initialize with empty answers
                        timeSpent: 0,
                        current_question_index: 0,
                        score: null,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Navigate to the quiz play page with new attempt ID
            router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${attempt.id}`);
        } catch (error) {
            console.error("Error creating quiz attempt:", error);
            Alert.alert("Error", "Failed to create new quiz attempt. Please try again.");
        }
    }, [quizId, pdId, user, router]);

    const handleFinish = useCallback((data: any) => {
        setQuizResults(data);
        setShowResult(true);
    }, []);

    const handleRetry = useCallback(async () => {
        setShowResult(false);
        resetQuiz();
    }, [resetQuiz]);

    const handleClose = useCallback(() => {
        setShowResult(false);
    }, []);

    const handleContinue = useCallback(async () => {
        setShowResult(false);
        router.replace(`/(app)/learn/${pdId}/quizzes`);
    }, [pdId, router]);

    if (!currentQuestion) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444"/>
                <ThemedText style={styles.errorText}>
                    Failed to load question
                </ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"}/>
            <QuizHeader isDark={isDark}/>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <QuestionContent isDark={isDark}/>
            </ScrollView>

            <QuizFooter
                isDark={isDark}
                onFinish={handleFinish}
            />
 
            {showResult && quizResults && (
                <QuizResultDialog
                    visible={showResult}
                    isDark={isDark}
                    quizName={quiz?.name || ""}
                    results={quizResults}
                    onRetry={handleRetry}
                    onClose={handleClose}
                    onContinue={handleContinue}
                />
            )}
        </View>
    );
};

// Main component
const QuizPlay = () => {
    const {quizId, attemptId} = useLocalSearchParams();
    const {quiz, isLoading: quizLoading} = useQuiz(String(quizId));

    if (quizLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
            </View>
        );
    }

    if (!quiz) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444"/>
                <ThemedText style={styles.errorText}>Quiz not found</ThemedText>
            </View>
        );
    }

    return (
        <QuizProvider quizId={String(quizId)} attemptId={String(attemptId)}>
            <QuizContent/>
        </QuizProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        marginBottom: 60
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        paddingTop: Platform.OS === "ios" ? 48 : 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    questionCounter: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
    },
    timer: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#6B7280",
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: theme.color.primary[500],
        borderRadius: 2,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    questionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    questionCardDark: {
        backgroundColor: "#374151",
    },
    imageContainer: {
        width: SCREEN_WIDTH - 72,
        height: 200,
        marginBottom: 20,
        borderRadius: theme.border.radius.small,
        overflow: "hidden",
        backgroundColor: "#F3F4F6",
    },
    questionImage: {
        width: "100%",
        height: "100%",
    },
    questionTitleContainer: {
        marginBottom: 20,
    },
    questionTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        lineHeight: 28,
        color: "#000000",
    },
    questionTitleDark: {
        color: "#FFFFFF",
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: theme.border.radius.small,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        minHeight: 56,
    },
    optionButtonDark: {
        backgroundColor: "#1F2937",
        borderColor: "#374151",
    },
    optionSelected: {
        borderColor: theme.color.primary[500],
        backgroundColor: `${theme.color.primary[500]}10`,
    },
    optionTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    optionText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#000000",
    },
    optionTextDark: {
        color: "#FFFFFF",
    },
    optionTextSelected: {
        color: theme.color.primary[500],
        fontWeight: "600",
    },
    // KaTeX styles
    katexComponent: {
        minHeight: 10,
        width : Dimensions.get("screen").width - 72,
        height : 80, // Keeping fixed height as requested
        backgroundColor: "transparent",
        flex: 1,
        overflow: "hidden",
    },
    detailsContainer: {
        marginTop: 20,
        padding: 16,
        backgroundColor: "#F3F4F6",
        borderRadius: theme.border.radius.small,
    },
    detailText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        color: "#4B5563",
        marginBottom: 8,
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        gap: 4,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: -2},
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
    submitButton: {
        backgroundColor: theme.color.primary[500],
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: theme.border.radius.small,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: "600",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "#EF4444",
        marginTop: 8,
        textAlign: "center",
    },
    // Result Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.medium,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
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
        backgroundColor: "#1F2937",
    },
    animationContainer: {
        width: 150,
        height: 100,
        marginBottom: 20,
    },
    animation: {
        width: "100%",
        height: "100%",
    },
    scoreContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    scoreLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#6B7280",
        marginBottom: 8,
    },
    scoreValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 40,
        height: 65,
        width: "100%",
        padding: 0,
        textAlign: "center",
        textAlignVertical: "center",
        fontWeight: "700",
    },
    statsGrid: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 24,
        width: "100%",
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: theme.border.radius.small,
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
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
        backgroundColor: "#374151",
    },
    statValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: "600",
        marginTop: 8,
    },
    statLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
        textAlign: "center",
    },
    message: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: theme.border.radius.small,
        gap: 8,
    },
    retryButton: {
        backgroundColor: `${theme.color.primary[500]}10`,
    },
    retryButtonText: {
        color: theme.color.primary[500],
        fontWeight: "600",
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },
    continueButton: {
        backgroundColor: theme.color.primary[500],
    },
    continueButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },

    // Exercise Instructions Button Styles
    navigationButton: {
        backgroundColor: theme.color.primary[500],
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: theme.border.radius.small,
        gap: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },

    // Exercise button styles
    exerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 6,
        gap: 4,
    },
    exerciseButtonDark: {
        backgroundColor: '#374151',
    },
    exerciseButtonActive: {
        backgroundColor: theme.color.primary[500],
    },
    exerciseButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
    },
    exerciseButtonTextActive: {
        color: '#FFFFFF',
    },
});

export default QuizPlay;