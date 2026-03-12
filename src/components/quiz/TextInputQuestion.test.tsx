import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TextInputQuestion as TIQType } from '../../lib/types';
import TextInputQuestion from './TextInputQuestion';

const question: TIQType = {
  id: 'q1',
  type: 'text_input',
  question: 'HTMLの正式名称は？',
  answer: 'HyperText Markup Language',
};

describe('TextInputQuestion', () => {
  it('問題文と入力フィールドを表示する', () => {
    render(<TextInputQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByText('HTMLの正式名称は？')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('解答を入力')).toBeInTheDocument();
  });

  it('テキストを入力してEnterキーで送信するとonAnswerが呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TextInputQuestion question={question} onAnswer={onAnswer} />);

    const input = screen.getByPlaceholderText('解答を入力');
    await user.type(input, 'HyperText Markup Language{Enter}');
    expect(onAnswer).toHaveBeenCalledWith('HyperText Markup Language');
  });

  it('空文字では送信できない', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TextInputQuestion question={question} onAnswer={onAnswer} />);

    const input = screen.getByPlaceholderText('解答を入力');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('送信ボタンでも回答できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TextInputQuestion question={question} onAnswer={onAnswer} />);

    const input = screen.getByPlaceholderText('解答を入力');
    await user.type(input, 'HTML');
    await user.click(screen.getByRole('button', { name: '送信' }));
    expect(onAnswer).toHaveBeenCalledWith('HTML');
  });

  it('disabled時は入力・送信ができない', () => {
    render(
      <TextInputQuestion question={question} onAnswer={vi.fn()} disabled />,
    );

    expect(screen.getByPlaceholderText('解答を入力')).toBeDisabled();
  });
});
