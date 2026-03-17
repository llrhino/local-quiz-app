import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { QuizPackSummary } from '../lib/types';

// useQuizPacks のモック
const mockImportPack = vi.fn();
const mockForceImportPack = vi.fn();
const mockSeedSample = vi.fn();
const mockDeletePack = vi.fn();
const mockExportPack = vi.fn();
const mockRefresh = vi.fn();

vi.mock('../hooks/useQuizPacks', () => ({
  useQuizPacks: vi.fn(),
}));

import { useQuizPacks } from '../hooks/useQuizPacks';
import HomePage from './HomePage';

const mockUseQuizPacks = vi.mocked(useQuizPacks);

const pack1: QuizPackSummary = {
  id: 'pack-1',
  name: 'JavaScript基礎',
  description: 'JSの基本を学ぶ',
  source: 'import',
  questionCount: 10,
  importedAt: '2026-03-12T10:00:00Z',
  lastStudiedAt: '2026-03-11T14:30:00Z',
  allCorrect: false,
};

const pack2: QuizPackSummary = {
  id: 'pack-2',
  name: 'Rust入門',
  source: 'import',
  questionCount: 5,
  importedAt: '2026-03-10T09:00:00Z',
  lastStudiedAt: null,
  allCorrect: false,
};

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockImportPack.mockResolvedValue(null);
    mockDeletePack.mockResolvedValue(null);
    mockRefresh.mockResolvedValue(undefined);
    mockUseQuizPacks.mockReturnValue({
      packs: [pack1, pack2],
      loading: false,
      error: null,
      importing: false,
      refresh: mockRefresh,
      importPack: mockImportPack,
      forceImportPack: mockForceImportPack,
      seedSample: mockSeedSample,
      deletePack: mockDeletePack,
      exportPack: mockExportPack,
    });
  });

  describe('ヘッダー部分', () => {
    it('クイズパック見出しとヘッダー操作を表示する', () => {
      renderHomePage();
      expect(screen.getByRole('heading', { name: 'クイズパック' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '新規作成' })).toHaveAttribute('href', '/editor');
      expect(screen.getByRole('button', { name: 'インポート' })).toBeInTheDocument();
    });
  });

  describe('ローディング表示', () => {
    it('ローディング中はスピナーを表示する', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [],
        loading: true,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      renderHomePage();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('エラー時にエラーメッセージを表示する', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [],
        loading: false,
        error: 'パック一覧の取得に失敗しました',
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      renderHomePage();
      expect(screen.getByText('パック一覧の取得に失敗しました')).toBeInTheDocument();
    });
  });

  describe('空状態', () => {
    beforeEach(() => {
      mockUseQuizPacks.mockReturnValue({
        packs: [],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
    });

    it('パックがない場合は案内メッセージを表示する', () => {
      renderHomePage();
      expect(
        screen.getByText('クイズパックがまだありません。JSONファイルをインポートしてください。'),
      ).toBeInTheDocument();
    });

    it('サンプルを試すボタンが表示される', () => {
      renderHomePage();
      expect(screen.getByRole('button', { name: 'サンプルを試す' })).toBeInTheDocument();
    });

    it('サンプルを試すボタンをクリックすると seedSample が呼ばれる', async () => {
      mockSeedSample.mockResolvedValue(null);
      const user = userEvent.setup();
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'サンプルを試す' }));
      expect(mockSeedSample).toHaveBeenCalledOnce();
    });
  });

  describe('パック一覧表示', () => {
    it('パック名、説明、問題数を表示する', () => {
      renderHomePage();

      expect(screen.getByText('JavaScript基礎')).toBeInTheDocument();
      expect(screen.getByText('JSの基本を学ぶ')).toBeInTheDocument();
      expect(screen.getByText('10問')).toBeInTheDocument();
      expect(screen.getByText('Rust入門')).toBeInTheDocument();
      expect(screen.getByText('5問')).toBeInTheDocument();
    });

    it('説明文の改行が保持される', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [{ ...pack1, description: '1行目\n2行目' }],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      renderHomePage();
      const card = screen.getByTestId('pack-card');
      const brs = card.querySelectorAll('br');
      expect(brs).toHaveLength(1);
    });

    it('各カードに開始・履歴・編集・エクスポート・削除が表示される', () => {
      renderHomePage();
      const packCards = screen.getAllByTestId('pack-card');
      expect(packCards).toHaveLength(2);

      const firstCard = packCards[0];
      expect(within(firstCard).getByRole('link', { name: '開始' })).toBeInTheDocument();
      expect(within(firstCard).getByRole('link', { name: '履歴' })).toBeInTheDocument();
      expect(within(firstCard).getByRole('link', { name: '編集' })).toHaveAttribute('href', '/editor/pack-1');
      expect(within(firstCard).getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
      expect(within(firstCard).getByRole('button', { name: '削除' })).toBeInTheDocument();
    });

    it('開始ボタンは /quiz/:packId へのリンクである', () => {
      renderHomePage();
      const packCards = screen.getAllByTestId('pack-card');
      const startLink = within(packCards[0]).getByRole('link', { name: '開始' });
      expect(startLink).toHaveAttribute('href', '/quiz/pack-1');
    });

    it('履歴ボタンは /history/:packId へのリンクである', () => {
      renderHomePage();
      const packCards = screen.getAllByTestId('pack-card');
      const historyLink = within(packCards[0]).getByRole('link', { name: '履歴' });
      expect(historyLink).toHaveAttribute('href', '/history/pack-1');
    });
  });

  describe('全問正解バッジ', () => {
    it('全問正解したパックにバッジを表示する', () => {
      const allCorrectPack: QuizPackSummary = {
        ...pack1,
        allCorrect: true,
      };
      mockUseQuizPacks.mockReturnValue({
        packs: [allCorrectPack, pack2],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: vi.fn(),
      });
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      expect(within(packCards[0]).getByTestId('all-correct-badge')).toBeInTheDocument();
      expect(within(packCards[1]).queryByTestId('all-correct-badge')).not.toBeInTheDocument();
    });

    it('全問正解していないパックにはバッジを表示しない', () => {
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      expect(within(packCards[0]).queryByTestId('all-correct-badge')).not.toBeInTheDocument();
      expect(within(packCards[1]).queryByTestId('all-correct-badge')).not.toBeInTheDocument();
    });
  });

  describe('インポート機能', () => {
    it('インポートボタンをクリックすると importPack が呼ばれる', async () => {
      const user = userEvent.setup();
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));
      expect(mockImportPack).toHaveBeenCalledOnce();
    });

    it('インポート中はボタンが無効化される', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [pack1],
        loading: false,
        error: null,
        importing: true,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      renderHomePage();
      expect(screen.getByRole('button', { name: 'インポート中...' })).toBeDisabled();
    });

    it('インポート失敗時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      mockImportPack.mockResolvedValue({ error: '無効なJSON形式です' });
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));
      expect(screen.getByText('無効なJSON形式です')).toBeInTheDocument();
    });

    it('複数行のエラーメッセージが改行付きで表示される', async () => {
      const user = userEvent.setup();
      const multilineError =
        'Question ID: q1 / Field: type / Error: 不正な問題タイプです\nQuestion ID: q2 / Field: answer / Error: 必須フィールドがありません';
      mockImportPack.mockResolvedValue({ error: multilineError });
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));

      const notification = screen.getByTestId('notification');
      expect(notification).toHaveClass('whitespace-pre-line');
      expect(notification).toHaveTextContent('Question ID: q1');
      expect(notification).toHaveTextContent('Question ID: q2');
    });

    it('重複パック検出時に更新確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      mockImportPack.mockResolvedValue({ duplicateFilePath: '/path/to/quiz.json' });
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));

      expect(screen.getByText('このパックは既にインポートされています。更新しますか？')).toBeInTheDocument();
    });

    it('更新確認ダイアログで「更新する」をクリックすると forceImportPack が呼ばれる', async () => {
      const user = userEvent.setup();
      mockImportPack.mockResolvedValue({ duplicateFilePath: '/path/to/quiz.json' });
      mockForceImportPack.mockResolvedValue(null);
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));
      await user.click(screen.getByRole('button', { name: '更新する' }));

      expect(mockForceImportPack).toHaveBeenCalledWith('/path/to/quiz.json');
    });

    it('更新確認ダイアログでキャンセルすると何もしない', async () => {
      const user = userEvent.setup();
      mockImportPack.mockResolvedValue({ duplicateFilePath: '/path/to/quiz.json' });
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));
      // ダイアログ内の「キャンセル」ボタンをクリック
      const dialogs = screen.getAllByRole('dialog');
      const updateDialog = dialogs.find(d => d.textContent?.includes('更新しますか'));
      const cancelBtn = within(updateDialog!).getByRole('button', { name: 'キャンセル' });
      await user.click(cancelBtn);

      expect(mockForceImportPack).not.toHaveBeenCalled();
    });
  });

  describe('削除機能', () => {
    it('削除ボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: '削除' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText('「JavaScript基礎」を削除しますか？この操作は取り消せません。'),
      ).toBeInTheDocument();
    });

    it('確認ダイアログで「削除する」をクリックすると deletePack が呼ばれる', async () => {
      const user = userEvent.setup();
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: '削除' }));
      await user.click(screen.getByRole('button', { name: '削除する' }));

      expect(mockDeletePack).toHaveBeenCalledWith('pack-1');
    });

    it('確認ダイアログで「キャンセル」をクリックすると削除しない', async () => {
      const user = userEvent.setup();
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: '削除' }));
      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(mockDeletePack).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('削除失敗時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      mockDeletePack.mockResolvedValue('削除に失敗しました');
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: '削除' }));
      await user.click(screen.getByRole('button', { name: '削除する' }));

      expect(screen.getByText('削除に失敗しました')).toBeInTheDocument();
    });
  });

  describe('検索・ソート・フィルター', () => {
    it('検索ボックスが表示される', () => {
      renderHomePage();
      expect(screen.getByPlaceholderText('パック名で検索')).toBeInTheDocument();
    });

    it('ソートのセレクトボックスが表示される', () => {
      renderHomePage();
      expect(screen.getByLabelText('並び替え')).toBeInTheDocument();
    });

    it('全問正解を除外チェックボックスが表示される', () => {
      renderHomePage();
      expect(screen.getByLabelText('全問正解を除外')).toBeInTheDocument();
    });

    it('検索でパック名をフィルターできる', async () => {
      const user = userEvent.setup();
      renderHomePage();

      await user.type(screen.getByPlaceholderText('パック名で検索'), 'JavaScript');

      const packCards = screen.getAllByTestId('pack-card');
      expect(packCards).toHaveLength(1);
      expect(within(packCards[0]).getByText('JavaScript基礎')).toBeInTheDocument();
    });

    it('検索結果が0件の場合メッセージを表示する', async () => {
      const user = userEvent.setup();
      renderHomePage();

      await user.type(screen.getByPlaceholderText('パック名で検索'), '存在しないパック');

      expect(screen.getByText('条件に一致するパックがありません。')).toBeInTheDocument();
    });

    it('ソートを変更できる', async () => {
      const user = userEvent.setup();
      renderHomePage();

      await user.selectOptions(screen.getByLabelText('並び替え'), 'importedAtAsc');
      // ソート順の変更自体が動作すればOK（表示順はusePackFilterのテストで検証済み）
      expect(screen.getByLabelText('並び替え')).toHaveValue('importedAtAsc');
    });

    it('全問正解を除外チェックボックスが動作する', async () => {
      const allCorrectPack: QuizPackSummary = { ...pack1, allCorrect: true };
      mockUseQuizPacks.mockReturnValue({
        packs: [allCorrectPack, pack2],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      const user = userEvent.setup();
      renderHomePage();

      expect(screen.getAllByTestId('pack-card')).toHaveLength(2);

      await user.click(screen.getByLabelText('全問正解を除外'));

      expect(screen.getAllByTestId('pack-card')).toHaveLength(1);
      expect(screen.getByText('Rust入門')).toBeInTheDocument();
    });

    it('パックが0件のときは検索・ソート・フィルターを表示しない', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        forceImportPack: mockForceImportPack,
        seedSample: mockSeedSample,
        deletePack: mockDeletePack,
        exportPack: mockExportPack,
      });
      renderHomePage();
      expect(screen.queryByPlaceholderText('パック名で検索')).not.toBeInTheDocument();
    });
  });

  describe('エクスポート機能', () => {
    it('エクスポートボタンをクリックすると exportPack が呼ばれる', async () => {
      const user = userEvent.setup();
      mockExportPack.mockResolvedValue(null);
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: 'エクスポート' }));

      expect(mockExportPack).toHaveBeenCalledWith('pack-1', 'JavaScript基礎');
    });

    it('エクスポート成功時に成功メッセージを表示する', async () => {
      const user = userEvent.setup();
      mockExportPack.mockResolvedValue(null);
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: 'エクスポート' }));

      expect(screen.getByText('「JavaScript基礎」をエクスポートしました。')).toBeInTheDocument();
    });

    it('エクスポート失敗時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      mockExportPack.mockResolvedValue('エクスポートに失敗しました');
      renderHomePage();

      const packCards = screen.getAllByTestId('pack-card');
      await user.click(within(packCards[0]).getByRole('button', { name: 'エクスポート' }));

      expect(screen.getByText('エクスポートに失敗しました')).toBeInTheDocument();
    });
  });
});
