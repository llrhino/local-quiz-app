import { useMemo } from 'react';

import { judgeAnswer } from '../../lib/judge';
import type { Question } from '../../lib/types';
import Button from '../common/Button';
import Card from '../common/Card';

type Props = {
  questions: Question[];
  answers: string[];
  onGoHome: () => void;
  onRetry: () => void;
};

export default function QuizSummary({
  questions,
  answers,
  onGoHome,
  onRetry,
}: Props) {
  const results = useMemo(
    () =>
      questions.map((q, i) => ({
        question: q,
        userAnswer: answers[i] ?? '',
        isCorrect: judgeAnswer(q.type, answers[i] ?? '', String(q.answer)),
      })),
    [questions, answers],
  );

  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = questions.length;
  const accuracyRate = total > 0 ? ((correctCount / total) * 100).toFixed(1) : '0.0';

  return (
    <Card>
      <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">クイズ完了</h2>

      <div className="mt-4 space-y-1">
        <p className="text-lg text-slate-700 dark:text-slate-300">
          {total}問中{correctCount}問正解
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{accuracyRate}%</p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">回答一覧</h3>
        <ol className="mt-2 space-y-1">
          {results.map((r, i) => (
            <li
              className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              key={r.question.id}
            >
              <span>問題 {i + 1}</span>
              <span className={r.isCorrect ? 'text-green-600' : 'text-red-500'}>
                {r.isCorrect ? '○' : '×'}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={onGoHome}>パック一覧に戻る</Button>
        <Button onClick={onRetry}>もう一度挑戦する</Button>
      </div>
    </Card>
  );
}
