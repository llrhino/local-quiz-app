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
});
