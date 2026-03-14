import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TrueFalseQuestion as TFQType } from '../../lib/types';
import TrueFalseQuestion from './TrueFalseQuestion';

const question: TFQType = {
  id: 'q1',
  type: 'true_false',
  question: 'TypeScriptはJavaScriptのスーパーセットである',
  answer: true,
};

describe('TrueFalseQuestion', () => {
  it('問題文と○/×ボタンを表示する', () => {
    render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);
    expect(
      screen.getByText('TypeScriptはJavaScriptのスーパーセットである'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '○' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
  });

  it('○ボタンをクリックするとonAnswerが"true"で呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: '○' }));
    expect(onAnswer).toHaveBeenCalledWith('true');
  });

  it('×ボタンをクリックするとonAnswerが"false"で呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: '×' }));
    expect(onAnswer).toHaveBeenCalledWith('false');
  });

  it('○×ボタンに押下フィードバック用のクラスが適用されている', () => {
    render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.className).toContain('active:scale-[0.97]');
      expect(button.className).toContain('transition-transform');
    }
  });

  it('○×ボタンにフォーカスリングのクラスが適用されている', () => {
    render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-sky-500');
      expect(button.className).toContain('focus-visible:ring-offset-2');
    }
  });

  describe('回答後のボタンハイライト', () => {
    it('正解時に正解ボタンが緑系ハイライトされる', () => {
      render(
        <TrueFalseQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: 'true', isCorrect: true }}
          correctAnswer="true"
        />,
      );

      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).toContain('bg-emerald-100');
      expect(trueButton.className).toContain('border-emerald-300');
    });

    it('不正解時にユーザーが選んだボタンが赤、正解ボタンが緑にハイライトされる', () => {
      render(
        <TrueFalseQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: 'false', isCorrect: false }}
          correctAnswer="true"
        />,
      );

      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).toContain('bg-emerald-100');

      const falseButton = screen.getByRole('button', { name: '×' });
      expect(falseButton.className).toContain('bg-red-100');
      expect(falseButton.className).toContain('border-red-300');
    });

    it('answerResultが未指定の場合はハイライトなし', () => {
      render(
        <TrueFalseQuestion question={question} onAnswer={vi.fn()} />,
      );

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button.className).not.toContain('bg-emerald-100');
        expect(button.className).not.toContain('bg-red-100');
      }
    });
  });

  it('disabled時はボタンをクリックしてもonAnswerが呼ばれない', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <TrueFalseQuestion question={question} onAnswer={onAnswer} disabled />,
    );

    await user.click(screen.getByRole('button', { name: '○' }));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
