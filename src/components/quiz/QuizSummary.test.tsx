import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Question } from '../../lib/types';
import QuizSummary from './QuizSummary';

const questions: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '1+1は？',
    choices: [
      { text: '1' },
      { text: '2' },
    ],
    answer: 1,
  },
  {
    id: 'q2',
    type: 'true_false',
    question: '地球は丸い',
    answer: true,
  },
  {
    id: 'q3',
    type: 'text_input',
    question: '日本の首都は？',
    answer: '東京',
  },
];

describe('QuizSummary', () => {
  const defaultProps = {
    questions,
    answers: ['1', 'true', '大阪'],
    onGoHome: vi.fn(),
    onRetry: vi.fn(),
  };

  it('「クイズ完了」の見出しを表示しない', () => {
    render(<QuizSummary {...defaultProps} />);
    expect(screen.queryByText('クイズ完了')).not.toBeInTheDocument();
  });

  it('総問題数・正解数・正答率を表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    // q1: b === b → 正解, q2: "true" === "true" → 正解, q3: "大阪" !== "東京" → 不正解
    expect(screen.getByText('3問中2問正解')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
  });

  it('全問正解の場合100%と表示する', () => {
    render(
      <QuizSummary
        {...defaultProps}
        answers={['1', 'true', '東京']}
      />,
    );
    expect(screen.getByText('3問中3問正解')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('回答一覧に各問題の正誤を表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    // 問題番号と正誤が表示される
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('問題 1');
    expect(listItems[0]).toHaveTextContent('○');
    expect(listItems[1]).toHaveTextContent('問題 2');
    expect(listItems[1]).toHaveTextContent('○');
    expect(listItems[2]).toHaveTextContent('問題 3');
    expect(listItems[2]).toHaveTextContent('×');
  });

  it('「パック一覧に戻る」ボタンでonGoHomeが呼ばれる', async () => {
    const onGoHome = vi.fn();
    const user = userEvent.setup();
    render(<QuizSummary {...defaultProps} onGoHome={onGoHome} />);

    await user.click(screen.getByRole('button', { name: 'パック一覧に戻る' }));
    expect(onGoHome).toHaveBeenCalledOnce();
  });

  it('「もう一度挑戦する」ボタンでonRetryが呼ばれる', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<QuizSummary {...defaultProps} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'もう一度挑戦する' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  describe('情報階層', () => {
    it('正答率ラベルがtext-xs・letter-spacing: 0.2emで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const label = screen.getByText('正答率');
      expect(label.className).toContain('text-xs');
      expect(label).toHaveStyle({ letterSpacing: '0.2em' });
    });

    it('正答率の数字がtext-7xl・font-bold・tabular-numsで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const rateElement = screen.getByText('66.7%');
      expect(rateElement.className).toContain('text-7xl');
      expect(rateElement.className).toContain('font-bold');
      expect(rateElement.className).toContain('tabular-nums');
    });

    it('補助情報（N問中M問正解）がtext-baseで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const subInfo = screen.getByText('3問中2問正解');
      expect(subInfo.className).toContain('text-base');
    });
  });

  describe('回答一覧の折りたたみ', () => {
    it('10問以下の場合はデフォルト展開される', () => {
      render(<QuizSummary {...defaultProps} />);
      // 回答一覧が直接表示されている
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('11問以上の場合はデフォルト折りたたみで「回答の詳細を見る」ボタンが表示される', () => {
      // 11問を生成
      const manyQuestions: Question[] = Array.from({ length: 11 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      const manyAnswers = Array.from({ length: 11 }, () => 'true');

      render(
        <QuizSummary
          {...defaultProps}
          questions={manyQuestions}
          answers={manyAnswers}
        />,
      );

      // 折りたたみ状態なので回答一覧は非表示
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      // 展開ボタンが表示される
      expect(screen.getByText('回答の詳細を見る')).toBeInTheDocument();
    });

    it('11問以上で「回答の詳細を見る」をクリックすると展開される', async () => {
      const user = userEvent.setup();
      const manyQuestions: Question[] = Array.from({ length: 11 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      const manyAnswers = Array.from({ length: 11 }, () => 'true');

      render(
        <QuizSummary
          {...defaultProps}
          questions={manyQuestions}
          answers={manyAnswers}
        />,
      );

      await user.click(screen.getByText('回答の詳細を見る'));
      expect(screen.getAllByRole('listitem')).toHaveLength(11);
    });
  });

  describe('色分け', () => {
    it('正答率100%でグラデーション色を適用する', () => {
      render(
        <QuizSummary
          {...defaultProps}
          answers={['1', 'true', '東京']}
        />,
      );
      const rateElement = screen.getByText('100.0%');
      // グラデーション用のクラスを確認
      expect(rateElement.className).toContain('bg-gradient-to-r');
      expect(rateElement.className).toContain('from-emerald-500');
      expect(rateElement.className).toContain('to-teal-500');
      expect(rateElement.className).toContain('bg-clip-text');
      expect(rateElement.className).toContain('text-transparent');
    });

    it('正答率80-99%でemerald-600色を適用する', () => {
      // 5問中4問正解 = 80%
      const fiveQuestions: Question[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      render(
        <QuizSummary
          {...defaultProps}
          questions={fiveQuestions}
          answers={['true', 'true', 'true', 'true', 'false']}
        />,
      );
      const rateElement = screen.getByText('80.0%');
      expect(rateElement.className).toContain('text-emerald-600');
    });

    it('正答率50-79%でamber-500色を適用する', () => {
      // 3問中2問正解 = 66.7%
      render(<QuizSummary {...defaultProps} />);
      const rateElement = screen.getByText('66.7%');
      expect(rateElement.className).toContain('text-amber-500');
    });

    it('正答率50%未満でsky-600色を適用する', () => {
      // 3問中0問正解 = 0%
      render(
        <QuizSummary
          {...defaultProps}
          answers={['0', 'false', '大阪']}
        />,
      );
      const rateElement = screen.getByText('0.0%');
      expect(rateElement.className).toContain('text-sky-600');
    });

    it('不正解の○×表示にニュートラルなグレーを適用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const listItems = screen.getAllByRole('listitem');
      // q3は不正解
      const incorrectMark = listItems[2].querySelector('span:last-child');
      expect(incorrectMark?.className).toContain('text-slate-400');
      expect(incorrectMark?.className).not.toContain('text-red-500');
    });

    it('正解の○×表示に緑色を適用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const listItems = screen.getAllByRole('listitem');
      // q1は正解
      const correctMark = listItems[0].querySelector('span:last-child');
      expect(correctMark?.className).toContain('text-green-600');
    });
  });
});
