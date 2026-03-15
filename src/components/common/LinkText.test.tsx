import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LinkText from './LinkText';

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

describe('LinkText', () => {
  it('URLを含まないテキストはそのまま表示される', () => {
    render(<LinkText text="これはテストです" />);
    expect(screen.getByText('これはテストです')).toBeInTheDocument();
  });

  it('URLを含まないテキストにはリンクが生成されない', () => {
    const { container } = render(<LinkText text="リンクなしテキスト" />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('URLがリンクとして表示される', () => {
    render(<LinkText text="詳細は https://example.com を参照" />);
    expect(screen.getByText('詳細は')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'https://example.com' })).toBeInTheDocument();
    expect(screen.getByText('を参照')).toBeInTheDocument();
  });

  it('リンクをクリックするとopenUrlが呼ばれる', async () => {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    const user = userEvent.setup();

    render(<LinkText text="https://example.com を開く" />);
    const link = screen.getByRole('button', { name: 'https://example.com' });
    await user.click(link);

    expect(openUrl).toHaveBeenCalledWith('https://example.com');
  });

  it('複数のURLが含まれる場合すべてリンク化される', () => {
    render(<LinkText text="http://foo.com と https://bar.com の2つ" />);
    expect(screen.getByRole('button', { name: 'http://foo.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'https://bar.com' })).toBeInTheDocument();
  });

  it('テキストがURLだけの場合もリンク化される', () => {
    render(<LinkText text="https://example.com" />);
    expect(screen.getByRole('button', { name: 'https://example.com' })).toBeInTheDocument();
  });

  it('textがundefinedの場合はfallbackが表示される', () => {
    render(<LinkText text={undefined} fallback="解説はありません" />);
    expect(screen.getByText('解説はありません')).toBeInTheDocument();
  });

  it('リンクにはアンダーラインのスタイルが適用される', () => {
    render(<LinkText text="https://example.com" />);
    const link = screen.getByRole('button', { name: 'https://example.com' });
    expect(link.className).toContain('underline');
  });
});
