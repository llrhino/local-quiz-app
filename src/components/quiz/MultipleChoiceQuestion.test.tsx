import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MultipleChoiceQuestion as MCQType } from '../../lib/types';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';

const question: MCQType = {
  id: 'q1',
  type: 'multiple_choice',
  question: 'JavaScriptの型でないものは？',
  choices: [
    { id: 'a', text: 'string' },
    { id: 'b', text: 'number' },
    { id: 'c', text: 'char' },
    { id: 'd', text: 'boolean' },
  ],
  answer: 'c',
};

describe('MultipleChoiceQuestion', () => {
  it('問題文と選択肢を表示する', () => {
    render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByText('JavaScriptの型でないものは？')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
    expect(screen.getByText('char')).toBeInTheDocument();
    expect(screen.getByText('boolean')).toBeInTheDocument();
  });

  it('選択肢をクリックするとonAnswerが選択肢IDで呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByText('char'));
    expect(onAnswer).toHaveBeenCalledWith('c');
  });

  it('1〜4キーで対応する選択肢を選択できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('3');
    expect(onAnswer).toHaveBeenCalledWith('c');
  });

  it('選択肢数を超えるキーは無視される', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('5');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('disabled時は選択肢をクリックしてもonAnswerが呼ばれない', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <MultipleChoiceQuestion question={question} onAnswer={onAnswer} disabled />,
    );

    await user.click(screen.getByText('char'));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('disabled時はキーボード操作も無効', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <MultipleChoiceQuestion question={question} onAnswer={onAnswer} disabled />,
    );

    await user.keyboard('1');
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
