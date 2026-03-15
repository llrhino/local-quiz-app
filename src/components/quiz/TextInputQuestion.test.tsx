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

  it('問題が切り替わると入力欄がクリアされる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    const question2: TIQType = {
      id: 'q2',
      type: 'text_input',
      question: 'CSSの正式名称は？',
      answer: 'Cascading Style Sheets',
    };

    const { rerender } = render(
      <TextInputQuestion question={question} onAnswer={onAnswer} />,
    );

    const input = screen.getByPlaceholderText('解答を入力');
    await user.type(input, 'テスト回答');
    expect(input).toHaveValue('テスト回答');

    // 問題が切り替わったら入力欄がクリアされる
    rerender(<TextInputQuestion question={question2} onAnswer={onAnswer} />);
    expect(screen.getByPlaceholderText('解答を入力')).toHaveValue('');
  });

  it('初期表示で入力欄にフォーカスされている', () => {
    render(<TextInputQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByPlaceholderText('解答を入力')).toHaveFocus();
  });

  it('問題が切り替わると入力欄に再フォーカスされる', async () => {
    const question2: TIQType = {
      id: 'q2',
      type: 'text_input',
      question: 'CSSの正式名称は？',
      answer: 'Cascading Style Sheets',
    };

    const { rerender } = render(
      <TextInputQuestion question={question} onAnswer={vi.fn()} />,
    );
    rerender(<TextInputQuestion question={question2} onAnswer={vi.fn()} />);
    expect(screen.getByPlaceholderText('解答を入力')).toHaveFocus();
  });

  it('disabled時は入力・送信ができない', () => {
    render(
      <TextInputQuestion question={question} onAnswer={vi.fn()} disabled />,
    );

    expect(screen.getByPlaceholderText('解答を入力')).toBeDisabled();
  });

  it('日本語入力向けに lang 属性を持つ', () => {
    render(<TextInputQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByPlaceholderText('解答を入力')).toHaveAttribute('lang', 'ja');
  });
});
