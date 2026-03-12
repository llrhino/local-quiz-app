import { afterEach, describe, expect, it } from 'vitest';

import type { Question } from '../lib/types';
import { useQuizSession } from '../hooks/useQuizSession';

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

describe('quizSessionStore', () => {
  afterEach(() => {
    useQuizSession.getState().resetSession();
  });

  describe('startSession', () => {
    it('問題を設定して初期状態にする', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      const state = useQuizSession.getState();

      expect(state.questions).toEqual(sampleQuestions);
      expect(state.currentIndex).toBe(0);
      expect(state.answers).toEqual([]);
      expect(state.isCompleted).toBe(false);
    });

    it('既存のセッションをリセットして新しいセッションを開始する', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().submitAnswer('a');
      useQuizSession.getState().nextQuestion();

      useQuizSession.getState().startSession(sampleQuestions);
      const state = useQuizSession.getState();

      expect(state.currentIndex).toBe(0);
      expect(state.answers).toEqual([]);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('submitAnswer', () => {
    it('回答を記録する', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().submitAnswer('a');

      const { answers } = useQuizSession.getState();
      expect(answers).toHaveLength(1);
      expect(answers[0]).toBe('a');
    });

    it('複数回答を順番に記録する', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().submitAnswer('a');
      useQuizSession.getState().nextQuestion();
      useQuizSession.getState().submitAnswer('true');

      expect(useQuizSession.getState().answers).toEqual(['a', 'true']);
    });
  });

  describe('nextQuestion', () => {
    it('次の問題に進む', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().submitAnswer('a');
      useQuizSession.getState().nextQuestion();

      expect(useQuizSession.getState().currentIndex).toBe(1);
    });

    it('最後の問題の後はセッション完了になる', () => {
      useQuizSession.getState().startSession(sampleQuestions);

      // 全問回答
      useQuizSession.getState().submitAnswer('a');
      useQuizSession.getState().nextQuestion();
      useQuizSession.getState().submitAnswer('true');
      useQuizSession.getState().nextQuestion();
      useQuizSession.getState().submitAnswer('3776m');
      useQuizSession.getState().nextQuestion();

      expect(useQuizSession.getState().isCompleted).toBe(true);
    });

    it('完了後はインデックスが問題数を超えない', () => {
      useQuizSession.getState().startSession(sampleQuestions);

      for (let i = 0; i < sampleQuestions.length; i++) {
        useQuizSession.getState().submitAnswer('dummy');
        useQuizSession.getState().nextQuestion();
      }

      // もう一度 nextQuestion を呼んでも変わらない
      useQuizSession.getState().nextQuestion();
      expect(useQuizSession.getState().currentIndex).toBe(sampleQuestions.length);
    });
  });

  describe('resetSession', () => {
    it('セッションを初期状態に戻す', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().submitAnswer('a');
      useQuizSession.getState().nextQuestion();

      useQuizSession.getState().resetSession();
      const state = useQuizSession.getState();

      expect(state.questions).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.answers).toEqual([]);
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('シャッフル', () => {
    it('startSession にシャッフルオプションを渡すと問題順が変わりうる', () => {
      // 十分な回数試行して、少なくとも1回は順序が変わることを確認
      const manyQuestions: Question[] = Array.from({ length: 20 }, (_, i) => ({
        id: `q${i}`,
        type: 'text_input' as const,
        question: `問題${i}`,
        answer: `答え${i}`,
      }));

      let shuffled = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        useQuizSession.getState().startSession(manyQuestions, true);
        const state = useQuizSession.getState();
        const isOriginalOrder = state.questions.every(
          (q, i) => q.id === manyQuestions[i].id,
        );
        if (!isOriginalOrder) {
          shuffled = true;
          break;
        }
      }

      expect(shuffled).toBe(true);
    });

    it('シャッフルしない場合は元の順序を維持する', () => {
      useQuizSession.getState().startSession(sampleQuestions, false);
      const state = useQuizSession.getState();
      expect(state.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    });
  });
});
