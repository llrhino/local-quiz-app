import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import QuizProgress from './QuizProgress';

describe('QuizProgress', () => {
  it('テキストで進捗を表示する', () => {
    render(<QuizProgress current={3} total={10} />);
    expect(screen.getByText('問題 3 / 10')).toBeInTheDocument();
  });

  it('プログレスバーが表示される', () => {
    render(<QuizProgress current={3} total={10} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
  });

  it('プログレスバーのaria属性が正しく設定される', () => {
    render(<QuizProgress current={3} total={10} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '3');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '10');
  });

  it('プログレスバーの幅が進捗に応じて設定される', () => {
    render(<QuizProgress current={3} total={10} />);
    const progressbar = screen.getByRole('progressbar');
    const innerBar = progressbar.firstElementChild as HTMLElement;
    expect(innerBar.style.width).toBe('30%');
  });

  it('プログレスバーにトランジションクラスが適用されている', () => {
    render(<QuizProgress current={3} total={10} />);
    const progressbar = screen.getByRole('progressbar');
    const innerBar = progressbar.firstElementChild as HTMLElement;
    expect(innerBar.className).toContain('transition-all');
    expect(innerBar.className).toContain('duration-300');
    expect(innerBar.className).toContain('ease-out');
  });

  it('streak が3以上の場合に連続正解を表示する', () => {
    render(<QuizProgress current={4} total={10} streak={3} />);
    expect(screen.getByText('3連続正解')).toBeInTheDocument();
  });

  it('streak が3未満の場合は連続正解を表示しない', () => {
    render(<QuizProgress current={3} total={10} streak={2} />);
    expect(screen.queryByText(/連続正解/)).not.toBeInTheDocument();
  });

  it('streak が未指定の場合は連続正解を表示しない', () => {
    render(<QuizProgress current={3} total={10} />);
    expect(screen.queryByText(/連続正解/)).not.toBeInTheDocument();
  });

  describe('ストリークの段階演出', () => {
    it('streak 3-4 で amber 色とバウンスアニメーションが適用される', () => {
      render(<QuizProgress current={4} total={10} streak={3} />);
      const streakElement = screen.getByText('3連続正解');
      expect(streakElement.className).toContain('text-amber-500');
      expect(streakElement.className).toContain('animate-bounce-subtle');
      expect(streakElement.className).toContain('motion-reduce:animate-none');
    });

    it('streak 5-6 で orange 色とバウンスアニメーション、テキスト拡大が適用される', () => {
      render(<QuizProgress current={6} total={10} streak={5} />);
      const streakElement = screen.getByText('5連続正解');
      expect(streakElement.className).toContain('text-orange-500');
      expect(streakElement.className).toContain('animate-bounce-medium');
      expect(streakElement.className).toContain('motion-reduce:animate-none');
      expect(streakElement.className).toContain('text-base');
    });

    it('streak 7以上 で red 色と強いバウンスアニメーション、さらにテキスト拡大が適用される', () => {
      render(<QuizProgress current={8} total={10} streak={7} />);
      const streakElement = screen.getByText('7連続正解');
      expect(streakElement.className).toContain('text-red-500');
      expect(streakElement.className).toContain('animate-bounce-strong');
      expect(streakElement.className).toContain('motion-reduce:animate-none');
      expect(streakElement.className).toContain('text-lg');
    });

    it('streak 更新時にアニメーションが再生されるようkey属性が設定される', () => {
      const { rerender } = render(<QuizProgress current={4} total={10} streak={3} />);
      const el1 = screen.getByText('3連続正解');

      rerender(<QuizProgress current={5} total={10} streak={4} />);
      const el2 = screen.getByText('4連続正解');

      // key が変わることで DOM 要素が再作成される
      expect(el1).not.toBe(el2);
    });
  });
});
