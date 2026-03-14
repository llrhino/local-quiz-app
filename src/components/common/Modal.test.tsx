import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Modal from './Modal';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('isOpen が true のとき表示される', () => {
    render(
      <Modal isOpen={true} title="確認" onClose={() => {}}>
        <p>本当に削除しますか？</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: '確認' })).toBeInTheDocument();
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument();
  });

  it('isOpen が false のとき表示されない', () => {
    render(
      <Modal isOpen={false} title="確認" onClose={() => {}}>
        <p>本当に削除しますか？</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('オーバーレイ背景をクリックすると onClose が呼ばれる', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} title="確認" onClose={onClose}>
        <p>内容</p>
      </Modal>,
    );

    // オーバーレイ（背景）をクリック
    const overlay = screen.getByTestId('modal-overlay');
    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('モーダル本体をクリックしても onClose は呼ばれない', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} title="確認" onClose={onClose}>
        <p>内容</p>
      </Modal>,
    );

    await user.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('タイトルが見出しとして表示される', () => {
    render(
      <Modal isOpen={true} title="削除の確認" onClose={() => {}}>
        <p>内容</p>
      </Modal>,
    );

    expect(
      screen.getByRole('heading', { name: '削除の確認' }),
    ).toBeInTheDocument();
  });

  it('Escape キーで onClose が呼ばれる', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} title="確認" onClose={onClose}>
        <p>内容</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('aria-labelledby で見出しを参照している', () => {
    render(
      <Modal isOpen={true} title="削除の確認" onClose={() => {}}>
        <p>内容</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: '削除の確認' });

    // aria-labelledby が見出しの id を参照していること
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    // aria-label は使用しない
    expect(dialog).not.toHaveAttribute('aria-label');
  });

  it('モーダル表示中に背景スクロールが抑制される', () => {
    const { unmount } = render(
      <Modal isOpen={true} title="確認" onClose={() => {}}>
        <p>内容</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('isOpen が false に変わると背景スクロール抑制が解除される', () => {
    const { rerender } = render(
      <Modal isOpen={true} title="確認" onClose={() => {}}>
        <p>内容</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} title="確認" onClose={() => {}}>
        <p>内容</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('モーダル表示時にフォーカスがモーダル内に移動する', () => {
    render(
      <Modal isOpen={true} title="確認" onClose={() => {}}>
        <button>OK</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    // フォーカスがモーダル内にあること
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Tab キーでフォーカスがモーダル内を循環する', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} title="確認" onClose={() => {}}>
        <button>キャンセル</button>
        <button>OK</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    const okButton = screen.getByRole('button', { name: 'OK' });

    // 最後のフォーカス可能要素から Tab で最初に戻る
    okButton.focus();
    await user.tab();

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('モーダルが閉じたときトリガー要素にフォーカスが戻る', async () => {
    const user = userEvent.setup();

    function TestWrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>開く</button>
          <Modal isOpen={isOpen} title="確認" onClose={() => setIsOpen(false)}>
            <button>OK</button>
          </Modal>
        </>
      );
    }

    render(<TestWrapper />);

    const trigger = screen.getByRole('button', { name: '開く' });
    await user.click(trigger);

    // モーダルが開いている
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escapeで閉じる
    await user.keyboard('{Escape}');

    // トリガー要素にフォーカスが戻る
    expect(document.activeElement).toBe(trigger);
  });
});
