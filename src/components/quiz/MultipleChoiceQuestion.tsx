import { useCallback, useEffect, useMemo } from 'react';

import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../lib/types';
import { useAppSettingsStore } from '../../stores/appSettingsStore';

type AnswerResult = {
  userAnswer: string;
  isCorrect: boolean;
};

type Props = {
  question: MultipleChoiceQuestionType;
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

function getChoiceClassName(choiceIndex: string, answerResult?: AnswerResult, correctAnswer?: string): string {
  const base = 'rounded-2xl border px-4 py-3 text-left text-slate-800 transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';
  const darkBase = 'dark:text-slate-200';

  if (answerResult && correctAnswer) {
    if (choiceIndex === correctAnswer) {
      return `${base} border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900 ${darkBase}`;
    }
    if (choiceIndex === answerResult.userAnswer && !answerResult.isCorrect) {
      return `${base} border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900 ${darkBase}`;
    }
  }

  return `${base} border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 ${darkBase}`;
}

export default function MultipleChoiceQuestion({
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      const num = Number(e.key);
      if (num >= 1 && num <= displayChoices.length) {
        onAnswer(String(displayChoices[num - 1].originalIndex));
      }
    },
    [disabled, onAnswer, displayChoices],
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
            className={getChoiceClassName(String(choice.originalIndex), answerResult, correctAnswer)}
            disabled={disabled}
            key={choice.originalIndex}
            onClick={() => onAnswer(String(choice.originalIndex))}
            type="button"
          >
            <span className="mr-2 font-mono text-sm text-slate-400">
              {index + 1}.
            </span>
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
