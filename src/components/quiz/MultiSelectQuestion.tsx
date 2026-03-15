import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MultiSelectQuestion as MultiSelectQuestionType } from '../../lib/types';
import { useAppSettingsStore } from '../../stores/appSettingsStore';

type AnswerResult = {
  userAnswer: string;
  isCorrect: boolean;
};

type Props = {
  question: MultiSelectQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  answerResult?: AnswerResult;
  correctAnswer?: string;
};

type DisplayChoice = {
  originalIndex: number;
  text: string;
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getChoiceClassName(
  choiceIndex: string,
  isSelected: boolean,
  answerResult?: AnswerResult,
  correctAnswer?: string,
): string {
  const base = 'rounded-2xl border px-4 py-3 text-left text-slate-800 transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';
  const darkBase = 'dark:text-slate-200';

  if (answerResult && correctAnswer) {
    const correctIndices = new Set(correctAnswer.split(','));
    const userIndices = new Set(answerResult.userAnswer.split(','));

    if (correctIndices.has(choiceIndex)) {
      return `${base} border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900 ${darkBase}`;
    }
    if (userIndices.has(choiceIndex) && !correctIndices.has(choiceIndex)) {
      return `${base} border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900 ${darkBase}`;
    }
  }

  const selectedClass = isSelected
    ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-300 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/30'
    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700';

  return `${base} ${selectedClass} ${darkBase}`;
}

export default function MultiSelectQuestion({
  question,
  onAnswer,
  disabled,
  answerResult,
  correctAnswer,
}: Props) {
  const shuffleChoices = useAppSettingsStore((s) => s.shuffleChoices);

  const displayChoices: DisplayChoice[] = useMemo(
    () => {
      const indexed = question.choices.map((c, i) => ({ originalIndex: i, text: c.text }));
      return shuffleChoices ? shuffleArray(indexed) : indexed;
    },
    [question.id, shuffleChoices],
  );

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelectedIndices(new Set());
  }, [question.id]);

  const toggleChoice = useCallback(
    (originalIndex: number) => {
      if (disabled) return;
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(originalIndex)) {
          next.delete(originalIndex);
        } else {
          next.add(originalIndex);
        }
        return next;
      });
    },
    [disabled],
  );

  const submitAnswer = useCallback(() => {
    if (disabled || selectedIndices.size === 0) return;
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    onAnswer(sorted.join(','));
  }, [disabled, selectedIndices, onAnswer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      const num = Number(e.key);
      if (num >= 1 && num <= displayChoices.length) {
        toggleChoice(displayChoices[num - 1].originalIndex);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    },
    [disabled, displayChoices, toggleChoice, submitAnswer],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{question.question}</p>
      <div className="grid gap-3">
        {displayChoices.map((choice, index) => (
          <button
            className={getChoiceClassName(
              String(choice.originalIndex),
              selectedIndices.has(choice.originalIndex),
              answerResult,
              correctAnswer,
            )}
            disabled={disabled}
            key={choice.originalIndex}
            onClick={() => toggleChoice(choice.originalIndex)}
            type="button"
          >
            <span className="mr-2 font-mono text-sm text-slate-400">
              {index + 1}.
            </span>
            {choice.text}
          </button>
        ))}
      </div>
      <button
        className="w-full rounded-2xl bg-sky-500 px-4 py-3 font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-700"
        disabled={disabled || selectedIndices.size === 0}
        onClick={submitAnswer}
        type="button"
      >
        回答を確定
      </button>
    </div>
  );
}
