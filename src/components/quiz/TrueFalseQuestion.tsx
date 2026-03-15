import { useCallback, useEffect, useState } from 'react';

import type { TrueFalseQuestion as TrueFalseQuestionType } from '../../lib/types';
import LinkText from '../common/LinkText';

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

const VALUES = ['true', 'false'] as const;

function getButtonClassName(value: string, selectedIndex: number, answerResult?: AnswerResult, correctAnswer?: string): string {
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

  const isSelected = VALUES[selectedIndex] === value;
  const selectedClass = isSelected ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-300 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700';

  return `${base} ${selectedClass} ${darkBase}`;
}

export default function TrueFalseQuestion({
  question,
  onAnswer,
  disabled,
  answerResult,
  correctAnswer,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [question.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === '1') onAnswer('true');
      if (e.key === '2') onAnswer('false');
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => Math.min(1, prev + 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onAnswer(VALUES[selectedIndex]);
      }
    },
    [disabled, onAnswer, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100"><LinkText text={question.question} /></p>
      <div className="flex gap-3">
        <button
          className={getButtonClassName('true', selectedIndex, answerResult, correctAnswer)}
          disabled={disabled}
          onClick={() => onAnswer('true')}
          type="button"
        >
          ○
        </button>
        <button
          className={getButtonClassName('false', selectedIndex, answerResult, correctAnswer)}
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
