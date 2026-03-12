import { useCallback, useState } from 'react';

import { getQuestionsByPack, saveAnswerRecord } from '../lib/commands';
import { judgeAnswer } from '../lib/judge';
import type { Question } from '../lib/types';
import { useAppSettingsStore } from '../stores/appSettingsStore';

import { useQuizSession } from './useQuizSession';

function getCorrectAnswer(question: Question): string {
  return String(question.answer);
}

export function useQuizSessionActions() {
  const [loading, setLoading] = useState(false);

  const startQuiz = useCallback(async (packId: string) => {
    setLoading(true);
    try {
      const questions = await getQuestionsByPack(packId);
      const { questionOrder } = useAppSettingsStore.getState();
      useQuizSession.getState().startSession(questions, questionOrder === 'random');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAndSave = useCallback(
    async (packId: string, userAnswer: string) => {
      const { questions, currentIndex } = useQuizSession.getState();
      const question = questions[currentIndex];

      const correctAnswer = getCorrectAnswer(question);
      const isCorrect = judgeAnswer(question.type, userAnswer, correctAnswer);

      // ストアに回答を記録
      useQuizSession.getState().submitAnswer(userAnswer);

      // バックエンドに履歴保存（失敗しても回答は記録済み）
      try {
        await saveAnswerRecord({
          packId,
          questionId: question.id,
          isCorrect,
          userAnswer,
          answeredAt: new Date().toISOString(),
        });
      } catch {
        // 履歴保存失敗は無視（回答自体はストアに記録済み）
      }

      return { isCorrect };
    },
    [],
  );

  return { loading, startQuiz, submitAndSave };
}
