import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Modal from './Modal';

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
});
