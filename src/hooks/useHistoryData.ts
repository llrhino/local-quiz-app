import { useCallback, useEffect, useState } from 'react';

import {
  getLearningHistory,
  getPackStatistics,
  getWeakQuestions,
} from '../lib/commands';
import { groupIntoSessions } from '../lib/sessions';
import type { Session } from '../lib/sessions';
import type { PackStatistics, WeakQuestion } from '../lib/types';

export function useHistoryData(packId: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<PackStatistics | null>(null);
  const [weakQuestions, setWeakQuestions] = useState<WeakQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const [records, stats, weak] = await Promise.all([
        getLearningHistory(packId),
        getPackStatistics(packId),
        getWeakQuestions(packId),
      ]);
      setSessions(groupIntoSessions(records));
      setStatistics(stats);
      setWeakQuestions(weak);
      setError(null);
    } catch {
      setError('学習履歴の取得に失敗しました');
    }
  }, [packId]);

  useEffect(() => {
    void fetch().finally(() => setLoading(false));
  }, [fetch]);

  return { sessions, statistics, weakQuestions, loading, error };
}
