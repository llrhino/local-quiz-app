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
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
    ],
    answer: 'b',
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
    answers: ['b', 'true', '大阪'],
    onGoHome: vi.fn(),
    onRetry: vi.fn(),
  };

  it('クイズ完了の見出しを表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    expect(screen.getByText('クイズ完了')).toBeInTheDocument();
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
        answers={['b', 'true', '東京']}
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

  it('正答率を大きく強調表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    const rateElement = screen.getByText('66.7%');
    expect(rateElement.className).toContain('text-5xl');
    expect(rateElement.className).toContain('font-bold');
    expect(rateElement.className).toContain('tabular-nums');
  });

  it('正答率のラベルを表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    expect(screen.getByText('正答率')).toBeInTheDocument();
  });

  it('正答率80%以上でemerald色を適用する', () => {
    // 3問中3問正解 = 100%
    render(
      <QuizSummary
        {...defaultProps}
        answers={['b', 'true', '東京']}
      />,
    );
    const rateElement = screen.getByText('100.0%');
    expect(rateElement.className).toContain('text-emerald-600');
  });

  it('正答率50-79%でamber色を適用する', () => {
    // 3問中2問正解 = 66.7%
    render(<QuizSummary {...defaultProps} />);
    const rateElement = screen.getByText('66.7%');
    expect(rateElement.className).toContain('text-amber-600');
  });

  it('正答率50%未満でslate色を適用する', () => {
    // 3問中0問正解 = 0%
    render(
      <QuizSummary
        {...defaultProps}
        answers={['a', 'false', '大阪']}
      />,
    );
    const rateElement = screen.getByText('0.0%');
    expect(rateElement.className).toContain('text-slate-600');
  });
});
