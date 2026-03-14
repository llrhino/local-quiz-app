import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import QuizResult from './QuizResult';

describe('QuizResult', () => {
  it('正解時に緑系の背景色・ボーダーが適用される', () => {
    const { container } = render(
      <QuizResult
        isCorrect={true}
        correctAnswer="b"
        userAnswer="b"
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('bg-emerald-50');
    expect(wrapper.className).toContain('border-emerald-200');
  });

  it('不正解時に赤系の背景色・ボーダーが適用される', () => {
    const { container } = render(
      <QuizResult
        isCorrect={false}
        correctAnswer="b"
        userAnswer="a"
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('bg-red-50');
    expect(wrapper.className).toContain('border-red-200');
  });
});
