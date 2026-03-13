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
    { id: 'a', text: 'string' },
    { id: 'b', text: 'number' },
    { id: 'c', text: 'char' },
    { id: 'd', text: 'boolean' },
  ],
  answer: 'c',
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

    it('shuffleChoicesがtrueでもクリックで正しい選択肢IDが返される', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      await user.click(screen.getByText('char'));
      expect(onAnswer).toHaveBeenCalledWith('c');
    });

    it('shuffleChoicesがtrueの場合、キーボード操作はシャッフル後の位置に対応する', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultipleChoiceQuestion question={question} onAnswer={onAnswer} />);

      // 1キーを押すと、表示順の1番目の選択肢IDが返される
      await user.keyboard('1');
      expect(onAnswer).toHaveBeenCalledTimes(1);
      const buttons = screen.getAllByRole('button');
      const firstButtonText = buttons[0].textContent?.replace(/^\d+\.\s*/, '');
      const firstChoice = question.choices.find((c) => c.text === firstButtonText);
      expect(onAnswer).toHaveBeenCalledWith(firstChoice?.id);
    });
  });
});
