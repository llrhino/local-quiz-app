import { useCallback, useEffect, useState } from 'react';

import {
  listQuizPacks,
  importQuizPack,
  deleteQuizPack,
  openFileDialog,
  openSaveFileDialog,
  exportQuizPack,
  seedSamplePack,
} from '../lib/commands';
import type { QuizPackSummary } from '../lib/types';

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return fallback;
}

export function useQuizPacks() {
  const [packs, setPacks] = useState<QuizPackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listQuizPacks();
      setPacks(data);
      setError(null);
    } catch {
      setPacks([]);
      setError('パック一覧の取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const importPack = useCallback(async (): Promise<string | null> => {
    setImporting(true);
    try {
      const filePath = await openFileDialog();
      if (!filePath) return null;

      await importQuizPack(filePath);
      await refresh();
      return null;
    } catch (e) {
      return extractErrorMessage(e, 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  const seedSample = useCallback(async (): Promise<string | null> => {
    try {
      await seedSamplePack();
      await refresh();
      return null;
    } catch (e) {
      return extractErrorMessage(e, 'サンプルパックの読み込みに失敗しました');
    }
  }, [refresh]);

  const deletePack = useCallback(async (packId: string): Promise<string | null> => {
    try {
      await deleteQuizPack(packId);
      await refresh();
      return null;
    } catch (e) {
      return extractErrorMessage(e, '削除に失敗しました');
    }
  }, [refresh]);

  const exportPack = useCallback(async (packId: string, packName: string): Promise<string | null> => {
    try {
      const filePath = await openSaveFileDialog(`${packName}.json`);
      if (!filePath) return null;

      await exportQuizPack(packId, filePath);
      return null;
    } catch (e) {
      return extractErrorMessage(e, 'エクスポートに失敗しました');
    }
  }, []);

  return { packs, loading, error, importing, refresh, importPack, seedSample, deletePack, exportPack };
}
