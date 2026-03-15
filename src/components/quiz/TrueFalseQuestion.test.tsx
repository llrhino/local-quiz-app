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

  it('1キーで○（true）を選択できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('1');
    expect(onAnswer).toHaveBeenCalledWith('true');
  });

  it('2キーで×（false）を選択できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('2');
    expect(onAnswer).toHaveBeenCalledWith('false');
  });

  it('3以上のキーは無視される', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('3');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('disabled時はキーボード操作も無効', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <TrueFalseQuestion question={question} onAnswer={onAnswer} disabled />,
    );

    await user.keyboard('1');
    expect(onAnswer).not.toHaveBeenCalled();
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

  describe('矢印キーナビゲーション', () => {
    it('初期状態で○（最初の選択肢）が選択状態になっている', () => {
      render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);
      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).toContain('ring-sky-500 ring-offset-2');
    });

    it('右矢印キーで×に移動できる', async () => {
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      const falseButton = screen.getByRole('button', { name: '×' });
      expect(falseButton.className).toContain('ring-sky-500 ring-offset-2');
      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).not.toContain('bg-sky-50');
    });

    it('左矢印キーで○に戻れる', async () => {
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).toContain('ring-sky-500 ring-offset-2');
    });

    it('○の状態で左矢印キーを押しても○のまま', async () => {
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowLeft}');
      const trueButton = screen.getByRole('button', { name: '○' });
      expect(trueButton.className).toContain('ring-sky-500 ring-offset-2');
    });

    it('×の状態で右矢印キーを押しても×のまま', async () => {
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowRight}');
      const falseButton = screen.getByRole('button', { name: '×' });
      expect(falseButton.className).toContain('ring-sky-500 ring-offset-2');
    });

    it('Enterキーで選択中の回答を確定できる', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

      await user.keyboard('{Enter}');
      expect(onAnswer).toHaveBeenCalledWith('true');
    });

    it('右矢印→Enterで×を確定できる', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
      expect(onAnswer).toHaveBeenCalledWith('false');
    });

    it('disabled時は矢印キーもEnterも無効', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(
        <TrueFalseQuestion question={question} onAnswer={onAnswer} disabled />,
      );

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
      expect(onAnswer).not.toHaveBeenCalled();
    });
  });
});
