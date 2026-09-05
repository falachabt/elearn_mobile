import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');

    return <MockText>{name}</MockText>;
  },
}));

jest.mock('react-native-modal', () => {
  const { View } = require('react-native');

  return ({ isVisible, children }: { isVisible: boolean; children: React.ReactNode }) =>
    isVisible ? <View>{children}</View> : null;
});

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: View,
    Circle: View,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/services/quiz.service', () => ({
  QuizService: {
    getQuizLeaderboard: jest.fn().mockResolvedValue([]),
    getMyQuizRank: jest.fn().mockResolvedValue(null),
  },
}));

import { QuizResultBottomSheet } from '../shared/learn/quiz/QuizResultBottomSheet';

const results = {
  attemptId: 'attempt-1',
  attempt: {
    id: 1,
    user_id: 'user-1',
    quiz_id: 'quiz-1',
    start_time: '2026-03-11T00:00:00.000Z',
    status: 'completed' as const,
  },
  totalQuestions: 10,
  correctAnswers: 8,
  quizId: 'quiz-1',
  userId: 'user-1',
  score: 80,
  status: 'passed' as const,
  completedAt: '2026-03-11T00:10:00.000Z',
  timeSpent: 125,
  xpGained: 30,
  maxCombo: 5,
  previousTimeSpent: null,
};

describe('QuizResultBottomSheet', () => {
  it('renders the quiz name and score ring', async () => {
    jest.setTimeout(15000);
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <QuizResultBottomSheet
          visible
          isDark={false}
          quizName="Quiz de biologie"
          results={results}
          onRetry={jest.fn().mockResolvedValue(undefined)}
          onContinue={jest.fn().mockResolvedValue(undefined)}
          onClose={jest.fn()}
        />
      );
    });

    const scoreNode = tree!.root.findByProps({ testID: 'quiz-result-score' });

    expect(scoreNode.props.children.join('')).toBe('8/10');
  });

  it('calls close, retry and continue handlers when pressed', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    const onContinue = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <QuizResultBottomSheet
          visible
          isDark={false}
          quizName="Quiz final"
          results={results}
          onRetry={onRetry}
          onContinue={onContinue}
          onClose={onClose}
        />
      );
    });

    const closeButton = tree!.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.props.hitSlop !== undefined
    )[0];
    act(() => {
      closeButton.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const retryButton = tree!.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.props.disabled !== undefined &&
        node.props.children?.props?.children?.[1]?.props?.children === 'Recommencer'
    )[0];
    await act(async () => {
      await retryButton.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);

    const continueButton = tree!.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.props.disabled !== undefined &&
        node.props.children?.props?.children === 'Continuer'
    )[0];
    await act(async () => {
      await continueButton.props.onPress();
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
