import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import Button from './Button';

describe('Button', () => {
  it('押下フィードバック用のクラスが適用されている', () => {
    render(<Button>テスト</Button>);
    const button = screen.getByRole('button', { name: 'テスト' });
    expect(button.className).toContain('active:scale-[0.97]');
    expect(button.className).toContain('transition-transform');
  });

  it('reduced motion 向けのクラスが適用されている', () => {
    render(<Button>テスト</Button>);
    const button = screen.getByRole('button', { name: 'テスト' });
    expect(button.className).toContain('motion-reduce:transition-none');
    expect(button.className).toContain('motion-reduce:transform-none');
    expect(button.className).toContain('motion-reduce:active:scale-100');
  });

  it('フォーカスリングのクラスが適用されている', () => {
    render(<Button>テスト</Button>);
    const button = screen.getByRole('button', { name: 'テスト' });
    expect(button.className).toContain('focus-visible:outline-none');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-sky-500');
    expect(button.className).toContain('focus-visible:ring-offset-2');
  });
});
