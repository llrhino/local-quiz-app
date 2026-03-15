import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/commands', () => ({
  getSessions: vi.fn(),
  getPackStatistics: vi.fn(),
  getWeakQuestions: vi.fn(),
}));

import {
  getSessions,
  getPackStatistics,
  getWeakQuestions,
} from '../lib/commands';
import { useHistoryData } from './useHistoryData';
import type { PackStatistics, Session, WeakQuestion } from '../lib/types';

const mockGetSessions = vi.mocked(getSessions);
const mockGetPackStatistics = vi.mocked(getPackStatistics);
const mockGetWeakQuestions = vi.mocked(getWeakQuestions);

const sampleSessions: Session[] = [
  {
    sessionId: 'sess-1',
    startedAt: '2026-03-10T10:00:00Z',
    totalAnswers: 2,
    correctAnswers: 1,
    accuracyRate: 0.5,
  },
];

const sampleStatistics: PackStatistics = {
  packId: 'pack-1',
  totalAnswers: 10,
  correctAnswers: 7,
  accuracyRate: 0.7,
  weakEligibleCount: 2,
};

const sampleWeakQuestions: WeakQuestion[] = [
  {
    questionId: 'q2',
    questionText: 'テスト問題2',
    answerCount: 5,
    accuracyRate: 0.2,
    lastUserAnswer: 'B',
    questionType: 'text_input',
    correctAnswer: '正解B',
    choicesJson: null,
    explanation: null,
    lastIsCorrect: false,
  },
];

describe('useHistoryData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetSessions.mockResolvedValue(sampleSessions);
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

    expect(mockGetSessions).toHaveBeenCalledWith('pack-1');
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

  it('セッション一覧をバックエンドから取得して返す', async () => {
    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].totalAnswers).toBe(2);
    expect(result.current.sessions[0].correctAnswers).toBe(1);
    expect(result.current.sessions[0].sessionId).toBe('sess-1');
  });

  it('データ取得失敗時にエラーを設定する', async () => {
    mockGetSessions.mockRejectedValue(new Error('DB接続エラー'));

    const { result } = renderHook(() => useHistoryData('pack-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('学習履歴の取得に失敗しました');
  });

  it('履歴がない場合は空のセッションと統計を返す', async () => {
    mockGetSessions.mockResolvedValue([]);
    mockGetPackStatistics.mockResolvedValue({
      packId: 'pack-1',
      totalAnswers: 0,
      correctAnswers: 0,
      accuracyRate: 0,
      weakEligibleCount: 0,
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
