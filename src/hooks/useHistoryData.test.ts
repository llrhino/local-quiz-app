import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/commands', () => ({
  getLearningHistory: vi.fn(),
  getPackStatistics: vi.fn(),
  getWeakQuestions: vi.fn(),
}));

import {
  getLearningHistory,
  getPackStatistics,
  getWeakQuestions,
} from '../lib/commands';
import { useHistoryData } from './useHistoryData';
import type { AnswerRecord, PackStatistics, WeakQuestion } from '../lib/types';

const mockGetLearningHistory = vi.mocked(getLearningHistory);
const mockGetPackStatistics = vi.mocked(getPackStatistics);
const mockGetWeakQuestions = vi.mocked(getWeakQuestions);

const sampleRecords: AnswerRecord[] = [
  {
    packId: 'pack-1',
    questionId: 'q1',
    isCorrect: true,
    userAnswer: 'A',
    answeredAt: '2026-03-10T10:00:00Z',
  },
  {
    packId: 'pack-1',
    questionId: 'q2',
    isCorrect: false,
    userAnswer: 'B',
    answeredAt: '2026-03-10T10:05:00Z',
  },
];

const sampleStatistics: PackStatistics = {
  packId: 'pack-1',
  totalAnswers: 10,
  correctAnswers: 7,
  accuracyRate: 0.7,
};

const sampleWeakQuestions: WeakQuestion[] = [
  {
    questionId: 'q2',
    questionText: 'テスト問題2',
    answerCount: 5,
    accuracyRate: 0.2,
    lastUserAnswer: 'B',
  },
];

describe('useHistoryData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetLearningHistory.mockResolvedValue(sampleRecords);
    mockGetPackStatistics.mockResolvedValue(sampleStatistics);
    mockGetWeakQuestions.mockResolvedValue(sampleWeakQuestions);
  });

  it('初期状態はローディング中', () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.sessions).toEqual([]);
    expect(result.current.statistics).toBeNull();
    expect(result.current.weakQuestions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('マウント時にデータを取得する', async () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetLearningHistory).toHaveBeenCalledWith('pack-1');
    expect(mockGetPackStatistics).toHaveBeenCalledWith('pack-1');
    expect(mockGetWeakQuestions).toHaveBeenCalledWith('pack-1');
  });

  it('統計情報を返す', async () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.statistics).toEqual(sampleStatistics);
  });

  it('弱点問題を返す', async () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.weakQuestions).toEqual(sampleWeakQuestions);
  });

  it('回答記録をセッションにグルーピングして返す', async () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 2つの回答は5分間隔なので1セッション
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].totalAnswers).toBe(2);
    expect(result.current.sessions[0].correctAnswers).toBe(1);
  });

  it('データ取得失敗時にエラーを設定する', async () => {
    mockGetLearningHistory.mockRejectedValue(new Error('DB接続エラー'));

    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('学習履歴の取得に失敗しました');
  });

  it('履歴がない場合は空のセッションと統計を返す', async () => {
    mockGetLearningHistory.mockResolvedValue([]);
    mockGetPackStatistics.mockResolvedValue({
      packId: 'pack-1',
      totalAnswers: 0,
      correctAnswers: 0,
      accuracyRate: 0,
    });
    mockGetWeakQuestions.mockResolvedValue([]);

    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.weakQuestions).toEqual([]);
  });
});
