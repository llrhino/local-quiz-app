import { useMemo, useState } from 'react';
import type { QuizPackSummary } from '../lib/types';

export type SortKey = 'updatedAtDesc' | 'importedAtAsc' | 'correctRateAsc';

export function usePackFilter(packs: QuizPackSummary[]) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAtDesc');
  const [excludeAllCorrect, setExcludeAllCorrect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPacks = useMemo(() => {
    let result = [...packs];

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // 全問正解除外フィルター
    if (excludeAllCorrect) {
      result = result.filter((p) => !p.allCorrect);
    }

    // ソート
    result.sort((a, b) => {
      switch (sortKey) {
        case 'updatedAtDesc': {
          const aDate = a.updatedAt ?? a.importedAt;
          const bDate = b.updatedAt ?? b.importedAt;
          return bDate.localeCompare(aDate);
        }
        case 'importedAtAsc':
          return a.importedAt.localeCompare(b.importedAt);
        case 'correctRateAsc': {
          const aRate = a.correctRate ?? 2; // null は末尾
          const bRate = b.correctRate ?? 2;
          return aRate - bRate;
        }
      }
    });

    return result;
  }, [packs, sortKey, excludeAllCorrect, searchQuery]);

  return {
    sortKey,
    setSortKey,
    excludeAllCorrect,
    setExcludeAllCorrect,
    searchQuery,
    setSearchQuery,
    filteredPacks,
  };
}
