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

  it('フォーカスリングのクラスが適用されている', () => {
    render(<Button>テスト</Button>);
    const button = screen.getByRole('button', { name: 'テスト' });
    expect(button.className).toContain('focus-visible:outline-none');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-sky-500');
    expect(button.className).toContain('focus-visible:ring-offset-2');
  });

  describe('variant', () => {
    it('デフォルトはprimaryスタイル（塗りつぶし）が適用される', () => {
      render(<Button>プライマリ</Button>);
      const button = screen.getByRole('button', { name: 'プライマリ' });
      expect(button.className).toContain('bg-slate-900');
      expect(button.className).toContain('text-white');
    });

    it('variant="primary"で塗りつぶしスタイルが適用される', () => {
      render(<Button variant="primary">プライマリ</Button>);
      const button = screen.getByRole('button', { name: 'プライマリ' });
      expect(button.className).toContain('bg-slate-900');
      expect(button.className).toContain('text-white');
    });

    it('variant="secondary"でアウトラインスタイルが適用される', () => {
      render(<Button variant="secondary">セカンダリ</Button>);
      const button = screen.getByRole('button', { name: 'セカンダリ' });
      // アウトラインスタイル: ボーダーあり、背景透明
      expect(button.className).toContain('border');
      expect(button.className).not.toContain('bg-slate-900');
    });
  });
});
