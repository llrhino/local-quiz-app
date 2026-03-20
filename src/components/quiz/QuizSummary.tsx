import { useEffect, useMemo, useRef, useState } from 'react';

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

/** 正答率に応じた色クラスを返す */
function getRateColorClass(percent: number): string {
  if (percent >= 100) {
    return 'bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent';
  }
  if (percent >= 80) return 'text-emerald-600';
  if (percent >= 50) return 'text-amber-500';
  return 'text-sky-600';
}

/** 回答一覧の折りたたみ閾値 */
const COLLAPSE_THRESHOLD = 11;

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
  const accuracyPercent = total > 0 ? (correctCount / total) * 100 : 0;
  const accuracyRate = accuracyPercent.toFixed(1);

  const shouldCollapse = total >= COLLAPSE_THRESHOLD;
  const [isExpanded, setIsExpanded] = useState(!shouldCollapse);

  const rateColorClass = getRateColorClass(accuracyPercent);

  const retryButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  return (
    <Card>
      {/* 第1層: 正答率（視覚的アンカー） */}
      <div className="flex flex-col items-center">
        <span
          className="text-xs text-slate-500 dark:text-slate-400"
          style={{ letterSpacing: '0.2em' }}
        >
          正答率
        </span>
        <p
          className={`text-7xl font-bold tabular-nums ${rateColorClass}`}
          aria-label={`正答率 ${accuracyRate}パーセント`}
        >
          {accuracyRate}%
        </p>
      </div>

      {/* 第2層: 補助情報 */}
      <div className="py-6 text-center">
        <p className="text-base text-slate-500 dark:text-slate-400">
          {total}問中{correctCount}問正解
        </p>
      </div>

      {/* 第3層: 回答一覧 */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">回答一覧</h3>
        {!isExpanded ? (
          <button
            className="mt-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => setIsExpanded(true)}
          >
            回答の詳細を見る
          </button>
        ) : (
          <ol className="mt-2 space-y-1">
            {results.map((r, i) => (
              <li
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                key={r.question.id}
              >
                <span>問題 {i + 1}</span>
                <span
                  className={r.isCorrect ? 'text-green-600' : 'text-slate-500'}
                  aria-label={r.isCorrect ? '正解' : '不正解'}
                >
                  {r.isCorrect ? '○' : '×'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onGoHome}>パック一覧に戻る</Button>
        <Button ref={retryButtonRef} onClick={onRetry}>もう一度挑戦する</Button>
      </div>
    </Card>
  );
}
