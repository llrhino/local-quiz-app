import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePackFilter, SortKey } from './usePackFilter';
import type { QuizPackSummary } from '../lib/types';

const basePack = (overrides: Partial<QuizPackSummary>): QuizPackSummary => ({
  id: 'pack-1',
  name: 'テストパック',
  description: '',
  source: 'imported',
  questionCount: 10,
  importedAt: '2026-03-01T00:00:00Z',
  updatedAt: null,
  lastStudiedAt: null,
  allCorrect: false,
  correctRate: null,
  ...overrides,
});

const packs: QuizPackSummary[] = [
  basePack({
    id: 'old',
    name: '古いパック',
    importedAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    correctRate: 0.8,
    allCorrect: false,
  }),
  basePack({
    id: 'new',
    name: '新しいパック',
    importedAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    correctRate: 0.3,
    allCorrect: false,
  }),
  basePack({
    id: 'mid',
    name: '中間パック',
    importedAt: '2026-02-01T00:00:00Z',
    updatedAt: null,
    correctRate: null,
    allCorrect: true,
  }),
];

describe('usePackFilter', () => {
  describe('ソート', () => {
    it('デフォルトは登録・更新が新しい順', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      // new(updatedAt: 03-15) > mid(importedAt: 02-01) > old(importedAt: 01-01)
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual([
        'new',
        'mid',
        'old',
      ]);
    });

    it('登録が古い順でソートできる', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => result.current.setSortKey('importedAtAsc'));
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual([
        'old',
        'mid',
        'new',
      ]);
    });

    it('正答率が低い順でソートできる（未回答は末尾）', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => result.current.setSortKey('correctRateAsc'));
      // new(0.3) < old(0.8) < mid(null)
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual([
        'new',
        'old',
        'mid',
      ]);
    });
  });

  describe('フィルター', () => {
    it('全問正解を除外できる', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => result.current.setExcludeAllCorrect(true));
      const ids = result.current.filteredPacks.map((p) => p.id);
      expect(ids).not.toContain('mid');
      expect(ids).toContain('old');
      expect(ids).toContain('new');
    });
  });

  describe('検索', () => {
    it('パック名で部分一致検索できる', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => result.current.setSearchQuery('古い'));
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual(['old']);
    });

    it('検索は大文字小文字を無視する', () => {
      const packsWithEnglish = [
        basePack({ id: 'abc', name: 'ABC Pack' }),
        basePack({ id: 'def', name: 'DEF Pack' }),
      ];
      const { result } = renderHook(() => usePackFilter(packsWithEnglish));
      act(() => result.current.setSearchQuery('abc'));
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual(['abc']);
    });

    it('空文字の検索は全件返す', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => result.current.setSearchQuery(''));
      expect(result.current.filteredPacks).toHaveLength(3);
    });
  });

  describe('組み合わせ', () => {
    it('フィルターと検索とソートを組み合わせられる', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      act(() => {
        result.current.setExcludeAllCorrect(true);
        result.current.setSortKey('correctRateAsc');
        result.current.setSearchQuery('パック');
      });
      // midは全問正解で除外、残りは new(0.3) < old(0.8)
      expect(result.current.filteredPacks.map((p) => p.id)).toEqual([
        'new',
        'old',
      ]);
    });
  });

  describe('sortKey の初期値', () => {
    it('sortKey のデフォルトは updatedAtDesc', () => {
      const { result } = renderHook(() => usePackFilter(packs));
      expect(result.current.sortKey).toBe('updatedAtDesc');
    });
  });
});
