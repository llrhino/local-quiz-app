import { useCallback, useEffect, useState } from 'react';

import {
  listQuizPacks,
  importQuizPack,
  deleteQuizPack,
  openFileDialog,
} from '../lib/commands';
import type { QuizPackSummary } from '../lib/types';

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
      return e instanceof Error ? e.message : 'インポートに失敗しました';
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  const deletePack = useCallback(async (packId: string): Promise<string | null> => {
    try {
      await deleteQuizPack(packId);
      await refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : '削除に失敗しました';
    }
  }, [refresh]);

  return { packs, loading, error, importing, refresh, importPack, deletePack };
}
