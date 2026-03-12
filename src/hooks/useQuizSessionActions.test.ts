import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/commands', () => ({
  getQuestionsByPack: vi.fn(),
  saveAnswerRecord: vi.fn(),
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

import { getQuestionsByPack, saveAnswerRecord } from '../lib/commands';
import type { Question } from '../lib/types';
import { useQuizSession } from './useQuizSession';
import { useQuizSessionActions } from './useQuizSessionActions';
import { useAppSettingsStore } from '../stores/appSettingsStore';

const mockGetQuestionsByPack = vi.mocked(getQuestionsByPack);
const mockSaveAnswerRecord = vi.mocked(saveAnswerRecord);

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '日本の首都は？',
    choices: [
      { id: 'a', text: '東京' },
      { id: 'b', text: '大阪' },
    ],
    answer: 'a',
  },
  {
    id: 'q2',
    type: 'true_false',
    question: '地球は丸い',
    answer: true,
  },
  {
    id: 'q3',
    type: 'text_input',
    question: '富士山の高さは？',
    answer: '3776m',
  },
];

describe('useQuizSessionActions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetQuestionsByPack.mockResolvedValue(sampleQuestions);
    mockSaveAnswerRecord.mockResolvedValue(undefined);
    useAppSettingsStore.setState({ questionOrder: 'sequential' });
  });

  afterEach(() => {
    useQuizSession.getState().resetSession();
  });

  describe('startQuiz', () => {
    it('パックIDから問題を取得してセッションを開始する', async () => {
      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      expect(mockGetQuestionsByPack).toHaveBeenCalledWith('pack-1');

      const session = useQuizSession.getState();
      expect(session.questions).toEqual(sampleQuestions);
      expect(session.currentIndex).toBe(0);
      expect(session.isCompleted).toBe(false);
    });

    it('random設定時はシャッフルしてセッションを開始する', async () => {
      useAppSettingsStore.setState({ questionOrder: 'random' });

      // 20問で確率的にシャッフルを検証
      const manyQuestions: Question[] = Array.from({ length: 20 }, (_, i) => ({
        id: `q${i}`,
        type: 'text_input' as const,
        question: `問題${i}`,
        answer: `答え${i}`,
      }));
      mockGetQuestionsByPack.mockResolvedValue(manyQuestions);

      const { result } = renderHook(() => useQuizSessionActions());

      let shuffled = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        await act(async () => {
          await result.current.startQuiz('pack-1');
        });
        const ids = useQuizSession.getState().questions.map((q) => q.id);
        const originalIds = manyQuestions.map((q) => q.id);
        if (JSON.stringify(ids) !== JSON.stringify(originalIds)) {
          shuffled = true;
          break;
        }
      }

      expect(shuffled).toBe(true);
    });

    it('問題取得失敗時はエラーを投げる', async () => {
      mockGetQuestionsByPack.mockRejectedValue(new Error('パックが見つかりません'));

      const { result } = renderHook(() => useQuizSessionActions());

      await expect(
        act(async () => {
          await result.current.startQuiz('invalid-pack');
        }),
      ).rejects.toThrow('パックが見つかりません');
    });

    it('開始中はloading状態になる', async () => {
      let resolveQuestions: (v: Question[]) => void;
      mockGetQuestionsByPack.mockImplementation(
        () => new Promise((resolve) => { resolveQuestions = resolve; }),
      );

      const { result } = renderHook(() => useQuizSessionActions());

      let startPromise: Promise<void>;
      act(() => {
        startPromise = result.current.startQuiz('pack-1');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolveQuestions!(sampleQuestions);
        await startPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('submitAndSave', () => {
    it('回答を判定し、ストアに記録し、履歴を保存する', async () => {
      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      let judgeResult: { isCorrect: boolean } | undefined;
      await act(async () => {
        judgeResult = await result.current.submitAndSave('pack-1', 'a');
      });

      // 正解判定
      expect(judgeResult!.isCorrect).toBe(true);

      // ストアに回答が記録される
      expect(useQuizSession.getState().answers).toEqual(['a']);

      // バックエンドに保存される
      expect(mockSaveAnswerRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          packId: 'pack-1',
          questionId: 'q1',
          isCorrect: true,
          userAnswer: 'a',
        }),
      );
    });

    it('不正解の場合も正しく判定して保存する', async () => {
      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      let judgeResult: { isCorrect: boolean } | undefined;
      await act(async () => {
        judgeResult = await result.current.submitAndSave('pack-1', 'b');
      });

      expect(judgeResult!.isCorrect).toBe(false);
      expect(mockSaveAnswerRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          userAnswer: 'b',
        }),
      );
    });

    it('true_false 問題の回答を正しく判定する', async () => {
      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      // q2 (true_false) に移動
      act(() => {
        useQuizSession.getState().nextQuestion();
      });

      let judgeResult: { isCorrect: boolean } | undefined;
      await act(async () => {
        judgeResult = await result.current.submitAndSave('pack-1', 'true');
      });

      expect(judgeResult!.isCorrect).toBe(true);
    });

    it('text_input 問題の回答を正しく判定する', async () => {
      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      // q3 (text_input) に移動
      act(() => {
        useQuizSession.getState().nextQuestion();
        useQuizSession.getState().nextQuestion();
      });

      let judgeResult: { isCorrect: boolean } | undefined;
      await act(async () => {
        judgeResult = await result.current.submitAndSave('pack-1', ' 3776m ');
      });

      // trim()後に一致するので正解
      expect(judgeResult!.isCorrect).toBe(true);
    });

    it('履歴保存失敗時もエラーを伝播しない（回答は記録済み）', async () => {
      mockSaveAnswerRecord.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useQuizSessionActions());

      await act(async () => {
        await result.current.startQuiz('pack-1');
      });

      // エラーが投げられない
      let judgeResult: { isCorrect: boolean } | undefined;
      await act(async () => {
        judgeResult = await result.current.submitAndSave('pack-1', 'a');
      });

      // 回答は記録される
      expect(judgeResult!.isCorrect).toBe(true);
      expect(useQuizSession.getState().answers).toEqual(['a']);
    });
  });
});
