import { afterEach, describe, expect, it } from 'vitest';

import type { Question } from '../lib/types';
import { useQuizSession } from '../hooks/useQuizSession';

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '日本の首都は？',
    choices: [
      { text: '東京' },
      { text: '大阪' },
    ],
    answer: 0,
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

  describe('streak', () => {
    it('初期状態でstreakは0', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      expect(useQuizSession.getState().streak).toBe(0);
    });

    it('正解時にstreakがインクリメントされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      expect(useQuizSession.getState().streak).toBe(1);
      useQuizSession.getState().updateStreak(true);
      expect(useQuizSession.getState().streak).toBe(2);
    });

    it('不正解時にstreakが0にリセットされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(false);
      expect(useQuizSession.getState().streak).toBe(0);
    });

    it('セッション開始時にstreakがリセットされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().startSession(sampleQuestions);
      expect(useQuizSession.getState().streak).toBe(0);
    });

    it('resetSession時にstreakがリセットされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().resetSession();
      expect(useQuizSession.getState().streak).toBe(0);
    });
  });

  describe('maxStreak', () => {
    it('初期状態でmaxStreakは0', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      expect(useQuizSession.getState().maxStreak).toBe(0);
    });

    it('streakが更新されるとmaxStreakも更新される', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      expect(useQuizSession.getState().maxStreak).toBe(2);
    });

    it('不正解でstreakがリセットされてもmaxStreakは保持される', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(false);
      expect(useQuizSession.getState().streak).toBe(0);
      expect(useQuizSession.getState().maxStreak).toBe(3);
    });

    it('新しいstreakがmaxStreakを超えた場合に更新される', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(false); // maxStreak=2
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true); // maxStreak=3
      expect(useQuizSession.getState().maxStreak).toBe(3);
    });

    it('セッション開始時にmaxStreakがリセットされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().startSession(sampleQuestions);
      expect(useQuizSession.getState().maxStreak).toBe(0);
    });

    it('resetSession時にmaxStreakがリセットされる', () => {
      useQuizSession.getState().startSession(sampleQuestions);
      useQuizSession.getState().updateStreak(true);
      useQuizSession.getState().resetSession();
      expect(useQuizSession.getState().maxStreak).toBe(0);
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
