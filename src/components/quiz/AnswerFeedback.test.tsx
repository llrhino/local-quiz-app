import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import AnswerFeedback from './AnswerFeedback';

describe('AnswerFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('正解時に正解画像を表示する', () => {
    render(<AnswerFeedback isCorrect={true} />);

    const img = screen.getByAltText('正解');
    expect(img).toBeInTheDocument();
    // SVGはdata URIとしてインライン化される。正解画像のstroke色(赤)を確認
    expect(img).toHaveAttribute('src', expect.stringContaining('rgb(255,0,0)'));
  });

  it('不正解時に不正解画像を表示する', () => {
    render(<AnswerFeedback isCorrect={false} />);

    const img = screen.getByAltText('不正解');
    expect(img).toBeInTheDocument();
    // 不正解画像のstroke色(青)を確認
    expect(img).toHaveAttribute('src', expect.stringContaining('rgb(34,106,216)'));
  });

  it('最前面にオーバーレイ表示される', () => {
    const { container } = render(<AnswerFeedback isCorrect={true} />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('fixed');
    expect(wrapper.className).toContain('z-50');
  });

  it('バウンスの強いアニメーションが適用される', () => {
    const { container } = render(<AnswerFeedback isCorrect={true} />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('animate-feedback-pop');
  });

  it('アニメーション終了後に非表示になる', () => {
    const { container } = render(<AnswerFeedback isCorrect={true} />);

    expect(screen.getByAltText('正解')).toBeInTheDocument();

    // アニメーション時間経過後に非表示
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(container.firstElementChild).toBeNull();
  });
});
