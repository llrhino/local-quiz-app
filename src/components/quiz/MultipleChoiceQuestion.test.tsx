import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MultipleChoiceQuestion as MCQType } from '../../lib/types';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';

const question: MCQType = {
  id: 'q1',
  type: 'multiple_choice',
  question: 'JavaScriptの型でないものは？',
  choices: [
    { text: 'string' },
    { text: 'number' },
    { text: 'char' },
    { text: 'boolean' },
  ],
  answer: 2,
};

describe('MultipleChoiceQuestion', () => {
  afterEach(() => {
    useAppSettingsStore.setState({ shuffleChoices: false });
  });

  it('問題文と選択肢を表示する', () => {
    render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByText('JavaScriptの型でないものは？')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
    expect(screen.getByText('char')).toBeInTheDocument();
    expect(screen.getByText('boolean')).toBeInTheDocument();
  });

  it('選択肢をクリックするとonAnswerが選択肢インデックスで呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByText('char'));
    expect(onAnswer).toHaveBeenCalledWith('2');
  });

  it('1〜4キーで対応する選択肢を選択できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('3');
    expect(onAnswer).toHaveBeenCalledWith('2');
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

  it('選択肢ボタンに押下フィードバック用のクラスが適用されている', () => {
    render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.className).toContain('active:scale-[0.97]');
      expect(button.className).toContain('transition-transform');
    }
  });

  it('選択肢ボタンにフォーカスリングのクラスが適用されている', () => {
    render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-sky-500');
      expect(button.className).toContain('focus-visible:ring-offset-2');
    }
  });

  describe('回答後の選択肢ハイライト', () => {
    it('正解の選択肢に緑系ハイライトが適用される', () => {
      render(
        <MultipleChoiceQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: '2', isCorrect: true }}
          correctAnswer="2"
        />,
      );

      const correctButton = screen.getByText('char').closest('button')!;
      expect(correctButton.className).toContain('bg-emerald-100');
      expect(correctButton.className).toContain('border-emerald-300');
    });

    it('ユーザーが選んだ不正解の選択肢に赤系ハイライトが適用される', () => {
      render(
        <MultipleChoiceQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: '0', isCorrect: false }}
          correctAnswer="2"
        />,
      );

      // ユーザーが選んだ不正解
      const wrongButton = screen.getByText('string').closest('button')!;
      expect(wrongButton.className).toContain('bg-red-100');
      expect(wrongButton.className).toContain('border-red-300');

      // 正解の選択肢は緑
      const correctButton = screen.getByText('char').closest('button')!;
      expect(correctButton.className).toContain('bg-emerald-100');
      expect(correctButton.className).toContain('border-emerald-300');
    });

    it('answerResultが未指定の場合はハイライトなし', () => {
      render(
        <MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />,
      );

      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        expect(button.className).not.toContain('bg-emerald-100');
        expect(button.className).not.toContain('bg-red-100');
      }
    });
  });

  describe('選択肢シャッフル', () => {
    it('shuffleChoicesがfalseの場合、選択肢は定義順に表示される', () => {
      useAppSettingsStore.setState({ shuffleChoices: false });
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('string');
      expect(buttons[1]).toHaveTextContent('number');
      expect(buttons[2]).toHaveTextContent('char');
      expect(buttons[3]).toHaveTextContent('boolean');
    });

    it('shuffleChoicesがtrueの場合、選択肢の順序が変わる', () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      // Math.randomをモックして決定的なシャッフル結果を得る
      // Fisher-Yatesアルゴリズム: i=3→j=0, i=2→j=1, i=1→j=0
      // [a,b,c,d] → i=3: j=floor(0.1*4)=0 → swap(3,0) → [d,b,c,a]
      //           → i=2: j=floor(0.5*3)=1 → swap(2,1) → [d,c,b,a]
      //           → i=1: j=floor(0.2*2)=0 → swap(1,0) → [c,d,b,a]
      const mockRandom = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.2);

      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('char');
      expect(buttons[1]).toHaveTextContent('boolean');
      expect(buttons[2]).toHaveTextContent('number');
      expect(buttons[3]).toHaveTextContent('string');

      mockRandom.mockRestore();
    });

    it('shuffleChoicesがtrueでもクリックで正しい選択肢インデックスが返される', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      await user.click(screen.getByText('char'));
      expect(onAnswer).toHaveBeenCalledWith('2');
    });

    it('shuffleChoicesがtrueでも回答後ハイライトは正しい選択肢インデックスで適用される', () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      render(
        <MultipleChoiceQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: '0', isCorrect: false }}
          correctAnswer="2"
        />,
      );

      // 正解の選択肢（char = index:2）は緑ハイライト
      const charButton = screen.getByText('char').closest('button')!;
      expect(charButton.className).toContain('bg-emerald-100');

      // ユーザーが選んだ不正解（string = index:0）は赤ハイライト
      const stringButton = screen.getByText('string').closest('button')!;
      expect(stringButton.className).toContain('bg-red-100');
    });

    it('shuffleChoicesがtrueの場合、キーボード操作はシャッフル後の位置に対応する', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      // 1キーを押すと、表示順の1番目の選択肢の元インデックスが返される
      await user.keyboard('1');
      expect(onAnswer).toHaveBeenCalledTimes(1);
      const buttons = screen.getAllByRole('button');
      const firstButtonText = buttons[0].textContent?.replace(/^\d+\.\s*/, '');
      const originalIndex = question.choices.findIndex((c) => c.text === firstButtonText);
      expect(onAnswer).toHaveBeenCalledWith(String(originalIndex));
    });
  });

  describe('矢印キーナビゲーション', () => {
    it('初期状態で最初の選択肢が選択状態になっている', () => {
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0].className).toContain('ring-sky-500 ring-offset-2');
      expect(buttons[1].className).not.toContain('bg-sky-50');
    });

    it('下矢印キーで次の選択肢に移動できる', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      const buttons = screen.getAllByRole('button');
      expect(buttons[1].className).toContain('ring-sky-500 ring-offset-2');
      expect(buttons[0].className).not.toContain('bg-sky-50');
    });

    it('上矢印キーで前の選択肢に移動できる', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      const buttons = screen.getAllByRole('button');
      expect(buttons[0].className).toContain('ring-sky-500 ring-offset-2');
    });

    it('右矢印キーで次の選択肢に移動できる', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      const buttons = screen.getAllByRole('button');
      expect(buttons[1].className).toContain('ring-sky-500 ring-offset-2');
    });

    it('左矢印キーで前の選択肢に移動できる', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      const buttons = screen.getAllByRole('button');
      expect(buttons[0].className).toContain('ring-sky-500 ring-offset-2');
    });

    it('最初の選択肢で上矢印を押しても最初のまま', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowUp}');
      const buttons = screen.getAllByRole('button');
      expect(buttons[0].className).toContain('ring-sky-500 ring-offset-2');
    });

    it('最後の選択肢で下矢印を押しても最後のまま', async () => {
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}'); // 5回目、すでに最後
      const buttons = screen.getAllByRole('button');
      expect(buttons[3].className).toContain('ring-sky-500 ring-offset-2');
    });

    it('Enterキーで選択中の回答を確定できる', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      await user.keyboard('{Enter}');
      expect(onAnswer).toHaveBeenCalledWith('0');
    });

    it('下矢印2回→Enterで3番目の選択肢を確定できる', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      expect(onAnswer).toHaveBeenCalledWith('2');
    });

    it('disabled時は矢印キーもEnterも無効', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(
        <MultipleChoiceQuestion question={question} onAnswer={onAnswer} disabled />,
      );

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('shuffleChoicesがtrueの場合、矢印+Enterでシャッフル後の位置の元インデックスが返される', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      // 下矢印で2番目の選択肢に移動してEnter
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      expect(onAnswer).toHaveBeenCalledTimes(1);
      // 表示2番目の選択肢の元インデックスが返される
      const buttons = screen.getAllByRole('button');
      const secondButtonText = buttons[1].textContent?.replace(/^\d+\.\s*/, '');
      const originalIndex = question.choices.findIndex((c) => c.text === secondButtonText);
      expect(onAnswer).toHaveBeenCalledWith(String(originalIndex));
    });
  });
});
