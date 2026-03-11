import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');

    return <MockText>{name}</MockText>;
  },
}));

jest.mock('lottie-react-native', () => ({
  __esModule: true,
  default: 'LottieView',
}));

import { QuizResultDialog } from '../shared/learn/quiz/ResultModal';

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
};

describe('QuizResultDialog', () => {
  it('renders the modal content and constrains the title to two lines', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <QuizResultDialog
          visible
          isDark={false}
          quizName="Quiz de biologie tres long pour verifier la contrainte de rendu"
          results={results}
          onRetry={jest.fn().mockResolvedValue(undefined)}
          onContinue={jest.fn().mockResolvedValue(undefined)}
          onClose={jest.fn()}
        />
      );
    });

    const quizNameNode = tree!.root.findAll(
      node => node.props.numberOfLines === 2 && node.props.children?.includes?.('Quiz de biologie')
    )[0];

    expect(quizNameNode.props.numberOfLines).toBe(2);
  });

  it('calls retry, close and continue handlers when the buttons are pressed', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    const onContinue = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <QuizResultDialog
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

    const buttons = tree!.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.disabled !== undefined &&
        Array.isArray(node.props.style)
    );

    await act(async () => {
      await buttons[0].props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);

    act(() => {
      buttons[1].props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      await buttons[2].props.onPress();
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
