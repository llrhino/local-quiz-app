import { useEffect, useRef } from 'react';

import { interpolateCountUp } from '../lib/animation';

const DURATION_MS = 400;
const BOUNCE_DURATION_MS = 200;

/**
 * カウントアップアニメーション用フック
 * useRef + DOM直接更新でReactのレンダリングサイクルから切り離す
 * prefers-reduced-motion: reduce 時は即座に最終値を表示
 */
export function useCountUp(
  ref: React.RefObject<HTMLElement | null>,
  target: number,
) {
  const rafId = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      el.textContent = `${target.toFixed(1)}%`;
      return;
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const value = interpolateCountUp(progress, target);

      el!.textContent = `${value.toFixed(1)}%`;

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        // スケールバウンス: 1.0→1.03→1.0
        el!.style.transition = `transform ${BOUNCE_DURATION_MS}ms ease-out`;
        el!.style.transform = 'scale(1.03)';
        setTimeout(() => {
          el!.style.transform = 'scale(1)';
        }, BOUNCE_DURATION_MS / 2);
      }
    }

    rafId.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [ref, target]);
}
