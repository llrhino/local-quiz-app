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
});
