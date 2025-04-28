import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Platform,
  Text,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { theme } from '@/constants/theme';
import { QuizAttempt, QuizQuestion } from '@/types/quiz.type';
import { useQuizContext } from '@/contexts/quizContext';
import Katex from 'react-native-katex';
import { CorrectionService } from '@/services/correction.service'; // Import the CorrectionService

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced mixed content renderer with improved LaTeX rendering - matching main component
const MixedContentRenderer = React.memo(({
  text,
  style,
  isDark,
  containerWidth: customWidth
}) => {
  const [katexHeight, setKatexHeight] = useState(50);

  // Calculate container width (accounting for padding)
  const containerWidth = customWidth || SCREEN_WIDTH;

  // Detect if text contains math expressions
  const hasMath = String(text)?.includes('$$');

  // Convert mixed content to LaTeX expression
  const convertToLatexExpression = useCallback((mixedText) => {
    const tempMarker = "___DOLLAR___";
    let processedText = mixedText.replace(/\\\$/g, tempMarker);

    const segments = processedText.split(/(\$\$[^$]+\$\$)/g);

    let latexExpression = '';
    segments.forEach((segment) => {
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

  // Get KaTeX styling
  const getKatexStyle = useCallback(() => {
    const textColor = isDark ? '#FFFFFF' : '#000000';

    return `
      html {
        margin: 0;
        padding: 0;
      }

      .katex-display {
        display: block;
        margin: 0;
        padding: 10px 0;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .katex {
        /* Increased font size for better readability */
        font-size: 2.7em;
        line-height: 1.4;
        /* Important for preventing formula breaks */
        white-space: nowrap;
        color: ${textColor};
        display: inline-block;
        margin: 0;
        padding: 10px 0;
        font-weight: 500;
      }

      /* For text content only (not math) */
      .katex .mord.text {
        font-size: 1em;
        line-height: 1.4;
        color: ${textColor};
        display: inline;
        margin: 0;
        padding: 10px 0;
        white-space: normal;
        word-wrap: break-word;
      }

      /* Handle long expressions with scrolling instead of breaking */
      .katex .base {
        /* No word breaking for math expressions */
      }
    `;
  }, [isDark, containerWidth]);

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
        overflow: 'auto'
      }}>
        <Katex
          expression={latexExpression}
          style={[styles.katexComponent, {
            height: Math.max(katexHeight, 40),
            width: containerWidth
          }]}
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

const QuizResultsDisplay = ({ currentQuestion, attempt, isDark }) => {
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [isLoadingCorrection, setIsLoadingCorrection] = useState(false);
  const { results, handleNextQuestion } = useQuizContext();

  // Calculate available widths
  const questionWidth = SCREEN_WIDTH - 72;
  const optionWidth = SCREEN_WIDTH - 120; // Account for icon and padding

  useEffect(() => {
    if (currentQuestion) {
      setIsLoadingCorrection(true);
      CorrectionService.generateAnswer(currentQuestion)
        .then(setCorrection)
        .finally(() => setIsLoadingCorrection(false));
    }
  }, [currentQuestion]);

  if (!currentQuestion || !attempt) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>No results available</ThemedText>
      </View>
    );
  }

  const isAnswerCorrect = (optionId) => {
    const isSelected = attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(optionId) ?? false;
    const isCorrect = currentQuestion.correct.includes(String(optionId));
    return isSelected && isCorrect;
  };

  const isAnswerIncorrect = (optionId) => {
    const isSelected = attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(optionId) ?? false;
    const isCorrect = currentQuestion.correct.includes(String(optionId));
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

          {/* Question Title with KaTeX support */}
          <View style={styles.questionTitleContainer}>
            <MixedContentRenderer
              text={currentQuestion.title}
              style={[styles.questionTitle, isDark && styles.questionTitleDark]}
              isDark={isDark}
              containerWidth={questionWidth}
            />
          </View>

          {/* Options with KaTeX support */}
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
                    !attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(option.id) && isCorrectAnswer && styles.optionHighlight,
                  ]}
                >
                  <View style={styles.optionTextContainer}>
                    <MixedContentRenderer
                      text={option.value}
                      style={[
                        styles.optionText,
                        isDark && styles.optionTextDark,
                        (correct || isCorrectAnswer) && styles.optionTextCorrect,
                        incorrect && styles.optionTextIncorrect,
                      ]}
                      isDark={isDark}
                      containerWidth={optionWidth}
                    />
                  </View>

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
                  {!attempt.answers?.[currentQuestion?.id]?.selectedOptions.includes(option.id) && isCorrectAnswer && (
                    <MaterialCommunityIcons
                      name="information"
                      size={24}
                      color={theme.color.success}
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
                  {/* Use MixedContentRenderer for explanation details */}
                  {currentQuestion.details.map((detail, index) => (
                    <MixedContentRenderer
                      key={index}
                      text={detail}
                      style={[styles.explanationText, isDark && styles.explanationTextDark]}
                      isDark={isDark}
                      containerWidth={questionWidth - 32} // Account for padding
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Correction Section */}
          <View style={styles.correctionContainer}>
            <ThemedText style={styles.correctionTitle}>Explications</ThemedText>
            {isLoadingCorrection ? (
              <ActivityIndicator size="small" color={theme.color.primary[500]} />
            ) : (
              <MixedContentRenderer
                text={correction || 'No correction available'}
                style={[styles.correctionText, isDark && styles.correctionTextDark]}
                isDark={isDark}
                containerWidth={questionWidth}
              />
            )}
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
  questionTitleContainer: {
    marginBottom: 20,
  },
  questionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    color: '#1A1A1A',
  },
  questionTitleDark: {
    color: '#FFFFFF',
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
  optionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#1A1A1A',
  },
  optionTextDark: {
    color: '#FFFFFF',
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: '#4B5563',
  },
  explanationTextDark: {
    color: '#D1D5DB', // Lighter gray for dark mode
  },
  correctionContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: theme.border.radius.small,
  },
  correctionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  correctionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  correctionTextDark: {
    color: '#D1D5DB', // Lighter gray for dark mode
  },
  // KaTeX styles - updated to match main component
  katexComponent: {
    minHeight: 50,
    backgroundColor: 'transparent',
    flex: 1,
    overflow: 'hidden',
  },
});

export default QuizResultsDisplay;
