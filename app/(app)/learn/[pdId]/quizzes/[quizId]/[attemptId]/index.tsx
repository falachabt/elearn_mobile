import React, { useEffect, useState } from "react";
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
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { theme } from "@/constants/theme";
import {
  useQuiz,
  useQuizQuestions,
  useQuizAttempt,
  useQuizResults,
} from "@/hooks/useQuiz";
import { QuizProvider, useQuizContext } from "@/contexts/quizContext";
import LottieView from "lottie-react-native";
import { QuizResultDialog } from "@/components/shared/learn/quiz/ResultModal";
import { QuizService } from "@/services/quiz.service";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { QuizResults } from "@/types/quiz.type";
import QuizResultsDisplay from "@/components/shared/learn/quiz/QuizResultDisplay";
import BlockNoteContent from "@/components/shared/BlockNoteContent";

// Header component showing progress and timer
const QuizHeader = ({ isDark }: { isDark: boolean }) => {
  const { currentQuestion, totalQuestions, progress, attempt, results } =
    useQuizContext();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.header, isDark && styles.headerDark]}>
      <View style={styles.progressInfo}>
        <ThemedText style={styles.questionCounter}>
          Question {(currentQuestion?.order ?? 0) + 1}/{totalQuestions}
        </ThemedText>
        <ThemedText style={styles.timer}>
          Time: {formatTime(results?.status === "in_progress" ? attempt.timeSpent ?? 0 : results?.timeSpent ?? 0)}
        </ThemedText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}> 
      {
        results?.status !== "in_progress" && <ThemedText style={styles.timer} > { results?.score?.toFixed(2) }% </ThemedText>
      }
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${ results?.status === "in_progress" ? progress : Number(results?.score)}%` }]} />
      </View>
        </View> 
    </View>
  );
};

// Question display component
const QuestionContent = ({ isDark }: { isDark: boolean }) => {
  const { currentQuestion, attempt, handleAnswerSelect, results } =
    useQuizContext();

  if (!currentQuestion) return null;

  if (results?.status !== "in_progress") {
    return (
      <QuizResultsDisplay
        currentQuestion={currentQuestion}
        attempt={results}
        isDark={isDark}
      />
    );
  }

  return (
    <View style={[styles.questionCard, isDark && styles.questionCardDark]}>
      {currentQuestion.hasImg && currentQuestion.image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: (currentQuestion.image as { url: string }).url }}
            style={styles.questionImage}
            resizeMode="contain"
          />
        </View>
      )}

      <ThemedText style={styles.questionTitle}>
        {currentQuestion.title}
      </ThemedText>

      <View style={styles.optionsContainer}>
        {currentQuestion.options?.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.optionButton,
              isDark && styles.optionButtonDark,
              attempt.selectedAnswers.includes(option.id) &&
                styles.optionSelected,
            ]}
            onPress={() => handleAnswerSelect(option.id)}
          >
            <ThemedText
              style={[
                styles.optionText,
                attempt.selectedAnswers.includes(option.id) &&
                  styles.optionTextSelected,
              ]}
            >
              {option.value}
            </ThemedText>
            {currentQuestion.isMultiple && (
              <MaterialCommunityIcons
                name={
                  attempt.selectedAnswers.includes(option.id)
                    ? "checkbox-marked"
                    : "checkbox-blank-outline"
                }
                size={24}
                color={
                  attempt.selectedAnswers.includes(option.id)
                    ? theme.color.primary[500]
                    : "#6B7280"
                }
              />
            )}
          </Pressable>
        ))}
      </View>

      {currentQuestion.hasDetails && currentQuestion.details && (
        <View style={styles.detailsContainer}>
              <BlockNoteContent blocks={currentQuestion.details} />

        </View>
      )}
    </View>
  );
};

// Footer with navigation buttons
const QuizFooter = ({
    isDark,
    onFinish,
}: {
    isDark: boolean;
    onFinish: (results: QuizResults) => void;
}) => {
    const {
        attempt: { selectedAnswers, status },
        results,
        isLastQuestion,
        isFirstQuestion,
        handleNextQuestion,
        handlePreviousQuestion
    } = useQuizContext();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        try {
            results?.status == "in_progress" && setIsSubmitting(true);
            if (isLastQuestion) {
                const re = await handleNextQuestion();

                if (typeof re === "object" && re !== null && re?.status !== "in_progress") {
                    onFinish(re);
                }
            } else {
                await handleNextQuestion();
            }
        } catch (error) {
            Alert.alert("Error", "Failed to submit answer. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevious =  () => {
        handlePreviousQuestion()
    } 

    return (
        <View style={[styles.footer, isDark && styles.footerDark]}>
            <Pressable
                style={[
                    styles.submitButton,
                    ( isFirstQuestion) &&
                        styles.submitButtonDisabled,
                ]}
                onPress={handlePrevious}
                disabled={
                    (
                    isSubmitting) || (isFirstQuestion)
                }
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color="#FFFFFF"
                        />
                        <ThemedText style={styles.submitButtonText}>
                            { "Précédent"}
                        </ThemedText>
                    </>
                )}
            </Pressable>
            <Pressable
                style={[
                    styles.submitButton,
                    ((selectedAnswers.length === 0 && results?.status === "in_progress") || (results?.status !== "in_progress" && isLastQuestion)) &&
                        styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                    (selectedAnswers.length === 0 ||
                    isSubmitting) &&
                    results?.status === "in_progress"  || (results?.status !== "in_progress" && isLastQuestion) 
                }
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                        <ThemedText style={styles.submitButtonText}>
                            {isLastQuestion ? "Soumettre" : "Suivant"}
                        </ThemedText>
                        <MaterialCommunityIcons
                            name="arrow-right"
                            size={24}
                            color="#FFFFFF"
                        />
                    </>
                )}
            </Pressable>
        </View>
    );
};

// Main quiz content component
const QuizContent = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { quizId, pdId, attempId } = useLocalSearchParams();
  const { currentQuestion, handleNextQuestion } = useQuizContext();
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<QuizResults | null>(null);
  const { quiz } = useQuiz(String(quizId));
  const { user } = useAuth();

  const resetQuiz = async () => {
    try {
      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert([
          {
            quiz_id: quizId,
            user_id: user?.id, // Get current user ID
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 30 * 60000).toISOString(),
            status: "in_progress",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Navigate to the quiz play page with attempt ID
      router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${attempt.id}`);
    } catch (error) {
      console.error("Error creating quiz attempt:", error);
      // Handle error (show toast/alert)
    }
  };

  if (!currentQuestion) {
    // handleNextQuestion();
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
        <ThemedText style={styles.errorText}>
          Failed to load question
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <QuizHeader isDark={isDark} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <QuestionContent isDark={isDark} />
      </ScrollView>

      <QuizFooter
        isDark={isDark}
        onFinish={(data) => {
          setResults(data);
          setShowResult(true);
        }}
      />

      {showResult && results && (
        <QuizResultDialog
          visible={showResult}
          isDark={isDark}
          quizName={quiz?.name || ""}
          results={results}
          onRetry={async () => {
            setShowResult(false);
              resetQuiz();
          }}
          onClose={() => {
            setShowResult(false);
          }}
          onContinue={async () => {
            setShowResult(false);
            router.replace("/(app)/(tabs)/learn" as any);
          }}
        />
      )}
    </View>
  );
};

// Main component
const QuizPlay = () => {
  const { quizId, attemptId } = useLocalSearchParams();
  const { quiz, isLoading: quizLoading } = useQuiz(String(quizId));

  if (quizLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
        <ThemedText style={styles.errorText}>Quiz not found</ThemedText>
      </View>
    );
  }

  return (
    <QuizProvider quizId={String(quizId)} attemptId={String(attemptId)}>
      <QuizContent />
    </QuizProvider>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    fontSize: 16,
    fontWeight: "600",
  },
  timer: {
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
        shadowOffset: { width: 0, height: 2 },
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
  // ... continuing the styles object
  questionImage: {
    width: "100%",
    height: "100%",
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    lineHeight: 28,
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
  },
  optionButtonDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  optionSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: `${theme.color.primary[500]}10`,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  optionTextSelected: {
    color: theme.color.primary[500],
    fontWeight: "600",
  },
  detailsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: theme.border.radius.small,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    flexDirection: "row", 
    gap: 16,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 16 : 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
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
        shadowOffset: { width: 0, height: 2 },
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
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  scoreValue: {
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
        shadowOffset: { width: 0, height: 1 },
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
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  message: {
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
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: theme.color.primary[500],
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default QuizPlay;
