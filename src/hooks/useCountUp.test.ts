import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  it('reduced-motion環境では即座に最終値を表示する', () => {
    const el = document.createElement('p');
    const ref = { current: el };

    renderHook(() => useCountUp(ref, 85.0));

    expect(el.textContent).toBe('85.0%');
  });

  it('reduced-motion環境で100%を正しく表示する', () => {
    const el = document.createElement('p');
    const ref = { current: el };

    renderHook(() => useCountUp(ref, 100.0));

    expect(el.textContent).toBe('100.0%');
  });

  it('reduced-motion環境で0%を正しく表示する', () => {
    const el = document.createElement('p');
    const ref = { current: el };

    renderHook(() => useCountUp(ref, 0.0));

    expect(el.textContent).toBe('0.0%');
  });

  it('refがnullの場合エラーにならない', () => {
    const ref = { current: null };

    expect(() => {
      renderHook(() => useCountUp(ref, 85.0));
    }).not.toThrow();
  });

  it('アンマウント時にcancelAnimationFrameが呼ばれる', () => {
    // reduced-motionが無効な環境をシミュレート
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const el = document.createElement('p');
    const ref = { current: el };

    const { unmount } = renderHook(() => useCountUp(ref, 85.0));
    unmount();

    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockRestore();
    window.matchMedia = originalMatchMedia;
  });
});
