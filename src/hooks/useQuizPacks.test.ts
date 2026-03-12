import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/commands', () => ({
  listQuizPacks: vi.fn(),
  importQuizPack: vi.fn(),
  deleteQuizPack: vi.fn(),
  openFileDialog: vi.fn(),
  seedSamplePack: vi.fn(),
}));

import {
  listQuizPacks,
  importQuizPack,
  deleteQuizPack,
  openFileDialog,
  seedSamplePack,
} from '../lib/commands';
import { useQuizPacks } from './useQuizPacks';
import type { QuizPackSummary } from '../lib/types';

const mockListQuizPacks = vi.mocked(listQuizPacks);
const mockImportQuizPack = vi.mocked(importQuizPack);
const mockDeleteQuizPack = vi.mocked(deleteQuizPack);
const mockOpenFileDialog = vi.mocked(openFileDialog);
const mockSeedSamplePack = vi.mocked(seedSamplePack);

const pack1: QuizPackSummary = {
  id: 'pack-1',
  name: 'テストパック1',
  description: '説明1',
  questionCount: 10,
  importedAt: '2026-03-10T00:00:00Z',
  lastStudiedAt: '2026-03-11T00:00:00Z',
};

const pack2: QuizPackSummary = {
  id: 'pack-2',
  name: 'テストパック2',
  questionCount: 5,
  importedAt: '2026-03-12T00:00:00Z',
  lastStudiedAt: null,
};

describe('useQuizPacks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockListQuizPacks.mockResolvedValue([pack1, pack2]);
  });

  it('初期状態はローディング中でパックは空', () => {
    const { result } = renderHook(() => useQuizPacks());
    expect(result.current.loading).toBe(true);
    expect(result.current.packs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('マウント時にパック一覧を取得する', async () => {
    const { result } = renderHook(() => useQuizPacks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.packs).toEqual([pack1, pack2]);
    expect(result.current.error).toBeNull();
  });

  it('一覧取得失敗時にエラーを設定する', async () => {
    mockListQuizPacks.mockRejectedValue(new Error('DB接続エラー'));
    const { result } = renderHook(() => useQuizPacks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.packs).toEqual([]);
    expect(result.current.error).toBe('パック一覧の取得に失敗しました');
  });

  it('refresh で一覧を再取得する', async () => {
    const { result } = renderHook(() => useQuizPacks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const pack3: QuizPackSummary = {
      id: 'pack-3',
      name: '新パック',
      questionCount: 3,
      importedAt: '2026-03-12T12:00:00Z',
      lastStudiedAt: null,
    };
    mockListQuizPacks.mockResolvedValue([pack1, pack2, pack3]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.packs).toEqual([pack1, pack2, pack3]);
  });

  describe('importPack', () => {
    it('ファイルダイアログでファイルを選択してインポートする', async () => {
      mockOpenFileDialog.mockResolvedValue('/path/to/quiz.json');
      mockImportQuizPack.mockResolvedValue({
        id: 'pack-3',
        name: '新パック',
        importedAt: '2026-03-12T12:00:00Z',
        questions: [],
      });
      const updatedPacks = [pack1, pack2, { ...pack2, id: 'pack-3', name: '新パック' }];
      // インポート後の再フェッチ
      mockListQuizPacks.mockResolvedValueOnce([pack1, pack2]).mockResolvedValueOnce(updatedPacks);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.importPack();
      });

      expect(mockOpenFileDialog).toHaveBeenCalled();
      expect(mockImportQuizPack).toHaveBeenCalledWith('/path/to/quiz.json');
      expect(mockListQuizPacks).toHaveBeenCalledTimes(2);
    });

    it('ファイルダイアログでキャンセルした場合は何もしない', async () => {
      mockOpenFileDialog.mockResolvedValue(null);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.importPack();
      });

      expect(mockImportQuizPack).not.toHaveBeenCalled();
    });

    it('インポート失敗時にエラーメッセージを返す', async () => {
      mockOpenFileDialog.mockResolvedValue('/path/to/invalid.json');
      mockImportQuizPack.mockRejectedValue(new Error('無効なJSON形式'));

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.importPack();
      });

      expect(errorMsg).toBe('無効なJSON形式');
    });

    it('インポート成功時はnullを返す', async () => {
      mockOpenFileDialog.mockResolvedValue('/path/to/quiz.json');
      mockImportQuizPack.mockResolvedValue({
        id: 'pack-3',
        name: '新パック',
        importedAt: '2026-03-12T12:00:00Z',
        questions: [],
      });

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.importPack();
      });

      expect(errorMsg).toBeNull();
    });

    it('ダイアログ表示中から importing が true になる', async () => {
      let resolveDialog: (v: string | null) => void;
      mockOpenFileDialog.mockImplementation(
        () => new Promise((resolve) => { resolveDialog = resolve; })
      );

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let importPromise: Promise<string | null>;
      act(() => {
        importPromise = result.current.importPack();
      });

      // ダイアログ表示中に importing が true
      await waitFor(() => {
        expect(result.current.importing).toBe(true);
      });

      mockImportQuizPack.mockResolvedValue({
        id: 'pack-3', name: '新パック', importedAt: '', questions: [],
      });

      await act(async () => {
        resolveDialog!('/path/to/quiz.json');
        await importPromise;
      });

      expect(result.current.importing).toBe(false);
    });

    it('ダイアログでキャンセルした場合 importing が false に戻る', async () => {
      mockOpenFileDialog.mockResolvedValue(null);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.importPack();
      });

      expect(result.current.importing).toBe(false);
    });

    it('ファイルダイアログがエラーの場合にエラーメッセージを返す', async () => {
      mockOpenFileDialog.mockRejectedValue(new Error('ダイアログを開けません'));

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.importPack();
      });

      expect(errorMsg).toBe('ダイアログを開けません');
      expect(result.current.importing).toBe(false);
    });
  });

  describe('seedSample', () => {
    it('サンプルパックを読み込んで一覧を更新する', async () => {
      mockSeedSamplePack.mockResolvedValue({
        id: 'sample-pack',
        name: 'サンプル',
        importedAt: '',
        questions: [],
      });
      const samplePack: QuizPackSummary = {
        id: 'sample-pack',
        name: 'サンプル',
        questionCount: 10,
        importedAt: '',
        lastStudiedAt: null,
      };
      mockListQuizPacks
        .mockResolvedValueOnce([pack1, pack2])
        .mockResolvedValueOnce([pack1, pack2, samplePack]);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.seedSample();
      });

      expect(mockSeedSamplePack).toHaveBeenCalledOnce();
      expect(errorMsg).toBeNull();
    });

    it('既にサンプルがある場合はエラーメッセージを返す', async () => {
      mockSeedSamplePack.mockRejectedValue(new Error("パックID 'sample-security-basics' は既にインポートされています"));

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.seedSample();
      });

      expect(errorMsg).toBe("パックID 'sample-security-basics' は既にインポートされています");
    });
  });

  describe('deletePack', () => {
    it('指定したパックを削除して一覧を更新する', async () => {
      mockDeleteQuizPack.mockResolvedValue(undefined);
      mockListQuizPacks.mockResolvedValueOnce([pack1, pack2]).mockResolvedValueOnce([pack2]);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deletePack('pack-1');
      });

      expect(mockDeleteQuizPack).toHaveBeenCalledWith('pack-1');
      expect(mockListQuizPacks).toHaveBeenCalledTimes(2);
    });

    it('削除失敗時にエラーメッセージを返す', async () => {
      mockDeleteQuizPack.mockRejectedValue(new Error('削除権限がありません'));

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.deletePack('pack-1');
      });

      expect(errorMsg).toBe('削除権限がありません');
    });

    it('削除成功時はnullを返す', async () => {
      mockDeleteQuizPack.mockResolvedValue(undefined);

      const { result } = renderHook(() => useQuizPacks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = await result.current.deletePack('pack-1');
      });

      expect(errorMsg).toBeNull();
    });
  });
});
