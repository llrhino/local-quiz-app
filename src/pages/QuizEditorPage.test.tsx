import { act, render, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuizPack } from '../lib/types';

const mockSaveQuizPack = vi.fn();
const mockOpenSaveFileDialog = vi.fn();
const mockExportQuizPack = vi.fn();

vi.mock('../lib/commands', () => ({
  saveQuizPack: (...args: unknown[]) => mockSaveQuizPack(...args),
  openSaveFileDialog: (...args: unknown[]) => mockOpenSaveFileDialog(...args),
  exportQuizPack: (...args: unknown[]) => mockExportQuizPack(...args),
}));

import QuizEditorPage from './QuizEditorPage';

function renderQuizEditorPage(initialEntries = ['/editor']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QuizEditorPage />
    </MemoryRouter>,
  );
}

const savedPack: QuizPack = {
  id: 'pack-saved',
  name: '保存済みパック',
  description: '説明文',
  source: 'created',
  importedAt: '2026-03-15T09:00:00Z',
  updatedAt: null,
  questions: [
    {
      id: 'q1',
      type: 'true_false',
      question: '保存済みの設問',
      answer: true,
    },
  ],
};

describe('QuizEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockSaveQuizPack.mockResolvedValue(savedPack);
    mockOpenSaveFileDialog.mockResolvedValue('/tmp/pack.json');
    mockExportQuizPack.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('初回表示時に手動保存のヒントと基本操作を表示する', () => {
    renderQuizEditorPage();

    expect(screen.getByRole('heading', { name: 'クイズパック作成' })).toBeInTheDocument();
    expect(screen.getByText('このエディタは手動保存です。編集後は [保存] ボタンを押してください')).toBeInTheDocument();
    expect(screen.getByLabelText('パック名')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設問を追加' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeDisabled();
  });

  it('設問を追加すると択一選択カードが作成される', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.click(screen.getByRole('button', { name: '設問を追加' }));

    const card = screen.getByTestId('question-card-q1');
    const typeSelect = within(card).getByLabelText('問題タイプ');
    expect(typeSelect).toHaveValue('multiple_choice');
    expect(within(typeSelect).getByRole('option', { name: '択一選択' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: '複数選択' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: '○×問題' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: 'テキスト入力' })).toBeInTheDocument();
    expect(typeSelect.className).toContain('dark:bg-slate-900');
    expect(typeSelect.className).toContain('dark:text-slate-50');
    expect(within(card).getByLabelText('設問文')).toBeInTheDocument();
    expect(within(card).getAllByLabelText(/選択肢 \d+/)).toHaveLength(2);
    expect(within(card).getByRole('button', { name: '選択肢を追加' })).toBeInTheDocument();
    expect(screen.getByText('● 未保存の変更あり')).toBeInTheDocument();
  });

  it('問題タイプ切替時に設問文と解説を引き継ぐ', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    const card = screen.getByTestId('question-card-q1');
    await user.type(within(card).getByLabelText('設問文'), 'S3の説明として正しいものはどれか');
    await user.type(within(card).getByLabelText('解説'), '解説文');
    await user.selectOptions(within(card).getByLabelText('問題タイプ'), 'text_input');

    expect(within(card).getByLabelText('問題タイプ')).toHaveValue('text_input');
    expect(within(card).getByLabelText('設問文')).toHaveValue('S3の説明として正しいものはどれか');
    expect(within(card).getByLabelText('解説')).toHaveValue('解説文');
    expect(within(card).getByLabelText('正解テキスト')).toBeInTheDocument();
  });

  it('エディタ内の入力中キー操作はグローバルへ伝播しない', async () => {
    const user = userEvent.setup();
    const windowKeydownListener = vi.fn();
    window.addEventListener('keydown', windowKeydownListener);

    renderQuizEditorPage();
    await user.click(screen.getByRole('button', { name: '設問を追加' }));

    const nameInput = screen.getByRole('textbox', { name: 'パック名' });
    const card = screen.getByTestId('question-card-q1');
    const questionTextarea = within(card).getByLabelText('設問文');

    fireEvent.keyDown(nameInput, { key: 'Enter' });
    fireEvent.keyDown(questionTextarea, { key: 'Enter' });

    expect(windowKeydownListener).not.toHaveBeenCalled();

    window.removeEventListener('keydown', windowKeydownListener);
  });

  it('設問の削除と並び替えができる', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    await user.click(screen.getByRole('button', { name: '設問を追加' }));

    const firstCard = screen.getByTestId('question-card-q1');
    const secondCard = screen.getByTestId('question-card-q2');

    await user.type(within(firstCard).getByLabelText('設問文'), '最初の設問');
    await user.type(within(secondCard).getByLabelText('設問文'), '次の設問');
    await user.click(within(secondCard).getByRole('button', { name: '上へ移動' }));

    const cardsAfterMove = screen.getAllByTestId(/question-card-/);
    expect(within(cardsAfterMove[0]).getByDisplayValue('次の設問')).toBeInTheDocument();
    expect(within(cardsAfterMove[1]).getByDisplayValue('最初の設問')).toBeInTheDocument();

    await user.click(within(cardsAfterMove[0]).getByRole('button', { name: '削除' }));
    expect(screen.getAllByTestId(/question-card-/)).toHaveLength(1);
    expect(screen.queryByDisplayValue('次の設問')).not.toBeInTheDocument();
  });

  it('バリデーションエラー時はカードを強調表示して保存しない', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    await user.type(screen.getByLabelText('パック名'), '検証用パック');
    await user.click(screen.getByRole('button', { name: '保存' }));

    const card = screen.getByTestId('question-card-q1');
    expect(screen.getByText('設問文を入力してください')).toBeInTheDocument();
    expect(screen.getByText('少なくとも2つの選択肢を入力してください')).toBeInTheDocument();
    expect(screen.getByText('正解を指定してください')).toBeInTheDocument();
    expect(card.className).toContain('border-red-300');
    expect(mockSaveQuizPack).not.toHaveBeenCalled();
  });

  it('パック名が未入力または空白のみの場合は保存しない', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    const card = screen.getByTestId('question-card-q1');
    await user.selectOptions(within(card).getByLabelText('問題タイプ'), 'true_false');
    await user.type(within(card).getByLabelText('設問文'), 'Goは静的型付け言語である');
    await user.click(within(card).getByLabelText('正しい'));

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('パック名を入力してください')).toBeInTheDocument();
    expect(mockSaveQuizPack).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('textbox', { name: /^パック名/ }));
    await user.type(screen.getByRole('textbox', { name: /^パック名/ }), '   ');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('パック名を入力してください')).toBeInTheDocument();
    expect(mockSaveQuizPack).not.toHaveBeenCalled();
  });

  it('保存成功後に未保存状態を解除し、エクスポートできる', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.type(screen.getByLabelText('パック名'), '新規パック');
    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    const card = screen.getByTestId('question-card-q1');
    await user.selectOptions(within(card).getByLabelText('問題タイプ'), 'true_false');
    await user.type(within(card).getByLabelText('設問文'), 'Rustは静的型付け言語である');
    await user.click(within(card).getByLabelText('正しい'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockSaveQuizPack).toHaveBeenCalledWith({
      packId: undefined,
      name: '新規パック',
      description: undefined,
      questions: [
        {
          id: 'q1',
          type: 'true_false',
          question: 'Rustは静的型付け言語である',
          explanation: '',
          answer: true,
        },
      ],
    });
    expect(screen.getByText('保存しました')).toBeInTheDocument();
    expect(screen.queryByText('● 未保存の変更あり')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'エクスポート' }));

    expect(mockOpenSaveFileDialog).toHaveBeenCalledWith('保存済みパック.json');
    expect(mockExportQuizPack).toHaveBeenCalledWith('pack-saved', '/tmp/pack.json');
  });

  it('保存失敗時はエラーメッセージを表示して未保存状態を維持する', async () => {
    mockSaveQuizPack.mockRejectedValueOnce(new Error('保存に失敗しました'));
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.type(screen.getByLabelText('パック名'), '失敗パック');
    await user.click(screen.getByRole('button', { name: '設問を追加' }));
    const card = screen.getByTestId('question-card-q1');
    await user.selectOptions(within(card).getByLabelText('問題タイプ'), 'text_input');
    await user.type(within(card).getByLabelText('設問文'), '正式名称を入力');
    await user.type(within(card).getByLabelText('正解テキスト'), 'Local Quiz App');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('保存に失敗しました')).toBeInTheDocument();
    expect(screen.getByText('● 未保存の変更あり')).toBeInTheDocument();
  });

  it('未保存変更がある状態で戻るリンクを押すと確認する', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.type(screen.getByLabelText('パック名'), '未保存パック');
    await user.click(screen.getByRole('link', { name: '戻る' }));

    expect(window.confirm).toHaveBeenCalledWith('未保存の変更があります。ページを離れますか？');
  });

  it('未保存変更がある状態で beforeunload を発火すると離脱警告を設定する', async () => {
    const user = userEvent.setup();
    renderQuizEditorPage();

    await user.type(screen.getByLabelText('パック名'), '未保存パック');

    const event = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(event, 'returnValue', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    window.dispatchEvent(event);

    expect(event.returnValue).toBe('');
  });

  describe('クラッシュリカバリ', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('10秒間隔でフォーム状態をsessionStorageに保存する', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderQuizEditorPage();

      await user.type(screen.getByLabelText('パック名'), 'テストパック');
      await user.click(screen.getByRole('button', { name: '設問を追加' }));

      expect(sessionStorage.getItem('quiz-editor-recovery-new')).toBeNull();

      await act(async () => { vi.advanceTimersByTime(10_000); });

      const stored = sessionStorage.getItem('quiz-editor-recovery-new');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.name).toBe('テストパック');
      expect(parsed.questions).toHaveLength(1);
    });

    it('リカバリデータが存在する場合に復元バナーを表示する', () => {
      const recoveryData = {
        name: '復元パック',
        description: '復元説明',
        questions: [
          { id: 'q1', type: 'true_false', question: '復元設問', explanation: '', answer: true },
        ],
      };
      sessionStorage.setItem('quiz-editor-recovery-new', JSON.stringify(recoveryData));

      renderQuizEditorPage();

      expect(screen.getByText('前回の未保存データがあります。')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '復元する' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '破棄する' })).toBeInTheDocument();
    });

    it('「復元する」を選択するとリカバリデータでフォームを復元する', async () => {
      const user = userEvent.setup();
      const recoveryData = {
        name: '復元パック',
        description: '復元説明',
        questions: [
          { id: 'q1', type: 'true_false', question: '復元設問', explanation: '', answer: true },
        ],
      };
      sessionStorage.setItem('quiz-editor-recovery-new', JSON.stringify(recoveryData));

      renderQuizEditorPage();
      await user.click(screen.getByRole('button', { name: '復元する' }));

      expect(screen.getByLabelText('パック名')).toHaveValue('復元パック');
      expect(screen.getByLabelText('説明')).toHaveValue('復元説明');
      expect(screen.getByTestId('question-card-q1')).toBeInTheDocument();
      expect(screen.queryByText('前回の未保存データがあります。')).not.toBeInTheDocument();
    });

    it('「破棄する」を選択するとリカバリデータを削除して通常起動する', async () => {
      const user = userEvent.setup();
      const recoveryData = {
        name: '破棄パック',
        description: '',
        questions: [],
      };
      sessionStorage.setItem('quiz-editor-recovery-new', JSON.stringify(recoveryData));

      renderQuizEditorPage();
      await user.click(screen.getByRole('button', { name: '破棄する' }));

      expect(sessionStorage.getItem('quiz-editor-recovery-new')).toBeNull();
      expect(screen.getByLabelText('パック名')).toHaveValue('');
      expect(screen.queryByText('前回の未保存データがあります。')).not.toBeInTheDocument();
    });

    it('保存成功時にリカバリデータを削除する', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderQuizEditorPage();

      await user.type(screen.getByLabelText('パック名'), '保存テスト');
      await user.click(screen.getByRole('button', { name: '設問を追加' }));
      const card = screen.getByTestId('question-card-q1');
      await user.selectOptions(within(card).getByLabelText('問題タイプ'), 'true_false');
      await user.type(within(card).getByLabelText('設問文'), 'テスト設問');
      await user.click(within(card).getByLabelText('正しい'));

      // リカバリデータが保存されるまで待つ
      await act(async () => { vi.advanceTimersByTime(10_000); });
      expect(sessionStorage.getItem('quiz-editor-recovery-new')).not.toBeNull();

      await user.click(screen.getByRole('button', { name: '保存' }));

      expect(sessionStorage.getItem('quiz-editor-recovery-new')).toBeNull();
    });

    it('破損データの場合にクラッシュしない', () => {
      sessionStorage.setItem('quiz-editor-recovery-new', '{invalid json!!!');

      renderQuizEditorPage();

      // クラッシュせず正常に表示される
      expect(screen.getByRole('heading', { name: 'クイズパック作成' })).toBeInTheDocument();
      expect(screen.queryByText('前回の未保存データがあります。')).not.toBeInTheDocument();
    });

    it('未保存変更がない状態で戻る場合にリカバリデータを削除する', async () => {
      const recoveryData = {
        name: '復元パック',
        description: '',
        questions: [],
      };
      sessionStorage.setItem('quiz-editor-recovery-new', JSON.stringify(recoveryData));

      const user = userEvent.setup();
      renderQuizEditorPage();

      // 復元を破棄して通常起動（dirty=false）
      await user.click(screen.getByRole('button', { name: '破棄する' }));
      expect(sessionStorage.getItem('quiz-editor-recovery-new')).toBeNull();
    });
  });
});
