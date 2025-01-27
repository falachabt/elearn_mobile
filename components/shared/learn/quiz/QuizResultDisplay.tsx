import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import { Dimensions } from 'react-native';
import { QuizAttempt, QuizQuestion, QuizResults } from '@/types/quiz.type';
import { Attempt } from '@/hooks/useQuiz';
import { useQuizContext } from '@/contexts/quizContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QuizResultsDisplay = ({ currentQuestion, attempt, isDark } : { currentQuestion : QuizQuestion, attempt: Attempt | undefined , isDark : boolean } ) => {
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);
     const {  results, handleNextQuestion } = useQuizContext();
    



  if (!currentQuestion || !attempt) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>No results available</ThemedText>
      </View>
    );
  }

  const isAnswerCorrect = (optionId : string) => {
    const isSelected = attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(optionId) ?? false;
    const isCorrect = currentQuestion.correct.includes(String(optionId));
    return isSelected && isCorrect;
  };

  const isAnswerIncorrect = (optionId : string) => {
    const isSelected = attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(optionId) ?? false;
    const isCorrect = currentQuestion.correct.includes(String(optionId));

    // console.log("isSelected", isSelected, "isCorrect", isCorrect, "optionId", optionId, "currentQuestion", currentQuestion.id, "attempt", attempt.answers?.[currentQuestion?.id]?.selectedOptions);
    // console.log("currentQuestion.correct", currentQuestion.correct);
    return isSelected && !isCorrect;
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.questionCard, isDark && styles.questionCardDark]}>
          {/* Question Image */}
          {currentQuestion.hasImg && currentQuestion.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentQuestion.image.url }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Question Title */}
          <ThemedText style={styles.questionTitle}>
            {currentQuestion.title}
          </ThemedText>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option) => {
              const correct = isAnswerCorrect(option.id);
              const incorrect = isAnswerIncorrect(option.id);
              const isCorrectAnswer = currentQuestion.correct.includes(String(option.id));

              return (
                <View
                  key={option.id}
                  style={[
                    styles.optionButton,
                    isDark && styles.optionButtonDark,
                    correct && styles.optionCorrect,
                    incorrect && styles.optionIncorrect,
                    !attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(option.id)  && isCorrectAnswer && styles.optionHighlight,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      (correct || isCorrectAnswer) && styles.optionTextCorrect,
                      incorrect && styles.optionTextIncorrect,
                    ]}
                  >
                    {option.value}
                  </ThemedText>
                  
                  {correct && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={theme.color.success}
                    />
                  )}
                  {incorrect && (
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={24}
                      color={theme.color.error}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Explanation Section */}
          {currentQuestion.hasDetails && currentQuestion.details && (
            <View style={styles.explanationContainer}>
              <Pressable
                style={[
                  styles.explanationButton,
                  isDark && styles.explanationButtonDark,
                ]}
                onPress={() => setIsExplanationVisible(!isExplanationVisible)}
              >
                <ThemedText style={styles.explanationButtonText}>
                  View Explanation
                </ThemedText>
                <MaterialCommunityIcons
                  name={isExplanationVisible ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </Pressable>

              {isExplanationVisible && (
                <View style={[
                  styles.explanationContent,
                  isDark && styles.explanationContentDark,
                ]}>
                  {currentQuestion.details.map((detail, index) => (
                    <ThemedText key={index} style={styles.explanationText}>
                      {detail}
                    </ThemedText>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Feedback Section */}
          <View style={[
            styles.feedbackContainer,
            isDark && styles.feedbackContainerDark,
          ]}>
            <ThemedText style={styles.feedbackTitle}>
              Performance
            </ThemedText>
            <ThemedText style={styles.feedbackText}>
              {attempt.answers?.[currentQuestion?.id]?.isCorrect 
                ? "Great job! You selected the correct answer."
                : "Keep practicing! Review the explanation to understand the correct answer."}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    backgroundColor: '#374151',
  },
  imageContainer: {
    width: SCREEN_WIDTH - 72,
    height: 200,
    marginBottom: 20,
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  questionImage: {
    width: '100%',
    height: '100%',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: theme.border.radius.small,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  optionButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  optionCorrect: {
    borderColor: theme.color.success,
    backgroundColor: `${theme.color.success}10`,
  },
  optionIncorrect: {
    borderColor: theme.color.error,
    backgroundColor: `${theme.color.error}10`,
  },
  optionHighlight: {
    borderColor: theme.color.success,
    borderStyle: 'dashed',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  optionTextCorrect: {
    color: theme.color.success,
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: theme.color.error,
    fontWeight: '600',
  },
  explanationContainer: {
    marginTop: 20,
  },
  explanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: theme.border.radius.small,
  },
  explanationButtonDark: {
    backgroundColor: '#1F2937',
  },
  explanationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  explanationContent: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: theme.border.radius.small,
  },
  explanationContentDark: {
    backgroundColor: '#1F2937',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: theme.border.radius.small,
  },
  feedbackContainerDark: {
    backgroundColor: '#1F2937',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default QuizResultsDisplay;