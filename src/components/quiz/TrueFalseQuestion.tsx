import { useCallback, useEffect } from 'react';

import type { TrueFalseQuestion as TrueFalseQuestionType } from '../../lib/types';

type AnswerResult = {
  userAnswer: string;
  isCorrect: boolean;
};

type Props = {
  question: TrueFalseQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  answerResult?: AnswerResult;
  correctAnswer?: string;
};

function getButtonClassName(value: string, answerResult?: AnswerResult, correctAnswer?: string): string {
  const base = 'flex-1 rounded-2xl border px-4 py-3 transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';
  const darkBase = 'dark:text-slate-200';

  if (answerResult && correctAnswer) {
    if (value === correctAnswer) {
      return `${base} border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900 ${darkBase}`;
    }
    if (value === answerResult.userAnswer && !answerResult.isCorrect) {
      return `${base} border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900 ${darkBase}`;
    }
  }

  return `${base} border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 ${darkBase}`;
}

export default function TrueFalseQuestion({
  question,
  onAnswer,
  disabled,
  answerResult,
  correctAnswer,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === '1') onAnswer('true');
      if (e.key === '2') onAnswer('false');
    },
    [disabled, onAnswer],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{question.question}</p>
      <div className="flex gap-3">
        <button
          className={getButtonClassName('true', answerResult, correctAnswer)}
          disabled={disabled}
          onClick={() => onAnswer('true')}
          type="button"
        >
          ○
        </button>
        <button
          className={getButtonClassName('false', answerResult, correctAnswer)}
          disabled={disabled}
          onClick={() => onAnswer('false')}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}
