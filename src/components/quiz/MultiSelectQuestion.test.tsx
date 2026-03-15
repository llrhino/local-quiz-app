import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MultiSelectQuestion as MSQType } from '../../lib/types';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import MultiSelectQuestion from './MultiSelectQuestion';

const question: MSQType = {
  id: 'q1',
  type: 'multi_select',
  question: '共通鍵暗号方式のアルゴリズムをすべて選びなさい。',
  choices: [
    { text: 'AES' },
    { text: 'RSA' },
    { text: 'DES' },
    { text: 'ElGamal' },
  ],
  answer: [0, 2],
};

describe('MultiSelectQuestion', () => {
  afterEach(() => {
    useAppSettingsStore.setState({ shuffleChoices: false });
  });

  it('問題文と選択肢を表示する', () => {
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByText('共通鍵暗号方式のアルゴリズムをすべて選びなさい。')).toBeInTheDocument();
    expect(screen.getByText('AES')).toBeInTheDocument();
    expect(screen.getByText('RSA')).toBeInTheDocument();
    expect(screen.getByText('DES')).toBeInTheDocument();
    expect(screen.getByText('ElGamal')).toBeInTheDocument();
  });

  it('確定ボタンが表示される', () => {
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);
    expect(screen.getByRole('button', { name: '回答を確定' })).toBeInTheDocument();
  });

  it('選択肢をクリックすると選択状態がトグルされる', async () => {
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

    const aesButton = screen.getByText('AES').closest('button')!;
    await user.click(aesButton);
    expect(aesButton.className).toContain('bg-sky-50');

    // もう一度クリックで選択解除
    await user.click(aesButton);
    expect(aesButton.className).not.toContain('bg-sky-50');
  });

  it('複数の選択肢を同時に選択できる', async () => {
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

    await user.click(screen.getByText('AES').closest('button')!);
    await user.click(screen.getByText('DES').closest('button')!);

    const aesButton = screen.getByText('AES').closest('button')!;
    const desButton = screen.getByText('DES').closest('button')!;
    expect(aesButton.className).toContain('bg-sky-50');
    expect(desButton.className).toContain('bg-sky-50');
  });

  it('確定ボタンをクリックすると選択したインデックスがカンマ区切りで送信される', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByText('AES').closest('button')!);
    await user.click(screen.getByText('DES').closest('button')!);
    await user.click(screen.getByRole('button', { name: '回答を確定' }));

    expect(onAnswer).toHaveBeenCalledWith('0,2');
  });

  it('何も選択せずに確定ボタンを押すと空文字列が送信される', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: '回答を確定' }));
    expect(onAnswer).toHaveBeenCalledWith('');
  });

  it('disabled時は選択肢をクリックしても選択状態が変わらない', async () => {
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} disabled />);

    await user.click(screen.getByText('AES').closest('button')!);
    const aesButton = screen.getByText('AES').closest('button')!;
    expect(aesButton.className).not.toContain('bg-sky-50');
  });

  it('数字キーで選択状態をトグルできる', async () => {
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

    await user.keyboard('1'); // AES を選択
    await user.keyboard('3'); // DES を選択

    const aesButton = screen.getByText('AES').closest('button')!;
    const desButton = screen.getByText('DES').closest('button')!;
    expect(aesButton.className).toContain('bg-sky-50');
    expect(desButton.className).toContain('bg-sky-50');
  });

  it('Enterキーで回答を確定できる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('1'); // AES を選択
    await user.keyboard('3'); // DES を選択
    await user.keyboard('{Enter}');

    expect(onAnswer).toHaveBeenCalledWith('0,2');
  });

  it('何も選択せずにEnterキーで空文字列が送信される', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

    await user.keyboard('{Enter}');
    expect(onAnswer).toHaveBeenCalledWith('');
  });

  it('disabled時はキーボード操作も無効', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectQuestion question={question} onAnswer={onAnswer} disabled />);

    await user.keyboard('1');
    await user.keyboard('{Enter}');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  describe('回答後の選択肢ハイライト', () => {
    it('正解の選択肢に緑系ハイライトが適用される', () => {
      render(
        <MultiSelectQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: '0,2', isCorrect: true }}
          correctAnswer="0,2"
        />,
      );

      const aesButton = screen.getByText('AES').closest('button')!;
      const desButton = screen.getByText('DES').closest('button')!;
      expect(aesButton.className).toContain('bg-emerald-100');
      expect(desButton.className).toContain('bg-emerald-100');
    });

    it('ユーザーが選んだ不正解の選択肢に赤系ハイライトが適用される', () => {
      render(
        <MultiSelectQuestion
          question={question}
          onAnswer={vi.fn()}
          disabled
          answerResult={{ userAnswer: '0,1', isCorrect: false }}
          correctAnswer="0,2"
        />,
      );

      // ユーザーが選んだ正解部分は緑
      const aesButton = screen.getByText('AES').closest('button')!;
      expect(aesButton.className).toContain('bg-emerald-100');

      // ユーザーが選んだ不正解部分は赤
      const rsaButton = screen.getByText('RSA').closest('button')!;
      expect(rsaButton.className).toContain('bg-red-100');

      // 選ばなかった正解は緑
      const desButton = screen.getByText('DES').closest('button')!;
      expect(desButton.className).toContain('bg-emerald-100');
    });
  });

  describe('選択肢シャッフル', () => {
    it('shuffleChoicesがtrueでもクリックで正しい選択肢インデックスが返される', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

      await user.click(screen.getByText('AES').closest('button')!);
      await user.click(screen.getByText('DES').closest('button')!);
      await user.click(screen.getByRole('button', { name: '回答を確定' }));

      // ソートされたインデックスが送信される
      expect(onAnswer).toHaveBeenCalledWith('0,2');
    });
  });

  describe('矢印キーナビゲーション', () => {
    it('初期状態で最初の選択肢にフォーカスリングが表示される', () => {
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[0].className).toContain('ring-sky-500');
    });

    it('下矢印キーで次の選択肢にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[1].className).toContain('ring-sky-500');
    });

    it('上矢印キーで前の選択肢にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[0].className).toContain('ring-sky-500');
    });

    it('右矢印キーで次の選択肢にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[1].className).toContain('ring-sky-500');
    });

    it('左矢印キーで前の選択肢にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[0].className).toContain('ring-sky-500');
    });

    it('最初の選択肢で上矢印を押しても最初のまま', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowUp}');
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[0].className).toContain('ring-sky-500');
    });

    it('最後の選択肢で下矢印を押しても最後のまま', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}'); // 5回目、すでに最後
      const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '回答を確定');
      expect(buttons[3].className).toContain('ring-sky-500');
    });

    it('Spaceキーでフォーカス中の選択肢の選択状態をトグルできる', async () => {
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={vi.fn()} />);

      // 最初の選択肢(AES)でSpaceを押す
      await user.keyboard(' ');
      const aesButton = screen.getByText('AES').closest('button')!;
      expect(aesButton.className).toContain('bg-sky-50');

      // もう一度Spaceで解除
      await user.keyboard(' ');
      expect(aesButton.className).not.toContain('bg-sky-50');
    });

    it('矢印キーで移動してSpaceで選択できる', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelectQuestion question={question} onAnswer={onAnswer} />);

      // AES を選択
      await user.keyboard(' ');
      // DES に移動して選択
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard(' ');
      // 確定
      await user.keyboard('{Enter}');

      expect(onAnswer).toHaveBeenCalledWith('0,2');
    });

    it('disabled時は矢印キーもSpaceも無効', async () => {
      const onAnswer = vi.fn();
      const user = userEvent.setup();
      render(
        <MultiSelectQuestion question={question} onAnswer={onAnswer} disabled />,
      );

      await user.keyboard('{ArrowDown}');
      await user.keyboard(' ');
      await user.keyboard('{Enter}');
      expect(onAnswer).not.toHaveBeenCalled();
    });
  });
});
