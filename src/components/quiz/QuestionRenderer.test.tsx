import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  TextInputQuestion,
} from '../../lib/types';
import QuestionRenderer from './QuestionRenderer';

const mcq: MultipleChoiceQuestion = {
  id: 'q1',
  type: 'multiple_choice',
  question: '選択問題',
  choices: [
    { id: 'a', text: '選択肢A' },
    { id: 'b', text: '選択肢B' },
  ],
  answer: 'a',
};

const tfq: TrueFalseQuestion = {
  id: 'q2',
  type: 'true_false',
  question: '○×問題',
  answer: true,
};

const tiq: TextInputQuestion = {
  id: 'q3',
  type: 'text_input',
  question: '入力問題',
  answer: '答え',
};

describe('QuestionRenderer', () => {
  it('multiple_choiceの問題を描画し、回答を伝播する', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<QuestionRenderer question={mcq} onAnswer={onAnswer} />);

    expect(screen.getByText('選択問題')).toBeInTheDocument();
    await user.click(screen.getByText('選択肢A'));
    expect(onAnswer).toHaveBeenCalledWith('a');
  });

  it('true_falseの問題を描画し、回答を伝播する', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<QuestionRenderer question={tfq} onAnswer={onAnswer} />);

    expect(screen.getByText('○×問題')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '○' }));
    expect(onAnswer).toHaveBeenCalledWith('true');
  });

  it('text_inputの問題を描画し、回答を伝播する', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<QuestionRenderer question={tiq} onAnswer={onAnswer} />);

    expect(screen.getByText('入力問題')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('解答を入力'), '答え{Enter}');
    expect(onAnswer).toHaveBeenCalledWith('答え');
  });

  it('disabledをサブコンポーネントに伝播する', () => {
    render(
      <QuestionRenderer question={tfq} onAnswer={vi.fn()} disabled />,
    );

    expect(screen.getByRole('button', { name: '○' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '×' })).toBeDisabled();
  });
});
