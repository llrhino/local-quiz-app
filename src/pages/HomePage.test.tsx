import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { QuizPackSummary } from '../lib/types';

// useQuizPacks のモック
const mockImportPack = vi.fn();
const mockDeletePack = vi.fn();
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
  questionCount: 10,
  importedAt: '2026-03-10T09:00:00Z',
  lastStudiedAt: '2026-03-11T14:30:00Z',
};

const pack2: QuizPackSummary = {
  id: 'pack-2',
  name: 'Rust入門',
  questionCount: 5,
  importedAt: '2026-03-12T10:00:00Z',
  lastStudiedAt: null,
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
      deletePack: mockDeletePack,
    });
  });

  describe('ヘッダー部分', () => {
    it('見出しとインポートボタンを表示する', () => {
      renderHomePage();
      expect(screen.getByRole('heading', { name: 'クイズパック' })).toBeInTheDocument();
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
        deletePack: mockDeletePack,
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
        deletePack: mockDeletePack,
      });
      renderHomePage();
      expect(screen.getByText('パック一覧の取得に失敗しました')).toBeInTheDocument();
    });
  });

  describe('空状態', () => {
    it('パックがない場合は案内メッセージを表示する', () => {
      mockUseQuizPacks.mockReturnValue({
        packs: [],
        loading: false,
        error: null,
        importing: false,
        refresh: mockRefresh,
        importPack: mockImportPack,
        deletePack: mockDeletePack,
      });
      renderHomePage();
      expect(
        screen.getByText('クイズパックがまだありません。JSONファイルをインポートしてください。'),
      ).toBeInTheDocument();
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

    it('各パックに開始・履歴・削除ボタンがある', () => {
      renderHomePage();
      const packCards = screen.getAllByTestId('pack-card');
      expect(packCards).toHaveLength(2);

      const firstCard = packCards[0];
      expect(within(firstCard).getByRole('link', { name: '開始' })).toBeInTheDocument();
      expect(within(firstCard).getByRole('link', { name: '履歴' })).toBeInTheDocument();
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
        deletePack: mockDeletePack,
      });
      renderHomePage();
      expect(screen.getByRole('button', { name: 'インポート中...' })).toBeDisabled();
    });

    it('インポート失敗時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      mockImportPack.mockResolvedValue('無効なJSON形式です');
      renderHomePage();

      await user.click(screen.getByRole('button', { name: 'インポート' }));
      expect(screen.getByText('無効なJSON形式です')).toBeInTheDocument();
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
});
