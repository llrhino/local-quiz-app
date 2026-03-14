import { useCallback, useEffect, useMemo } from 'react';

import type { Choice, MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../lib/types';
import { useAppSettingsStore } from '../../stores/appSettingsStore';

type Props = {
  question: MultipleChoiceQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function MultipleChoiceQuestion({
  question,
  onAnswer,
  disabled,
}: Props) {
  const shuffleChoices = useAppSettingsStore((s) => s.shuffleChoices);

  const displayChoices: Choice[] = useMemo(
    () => (shuffleChoices ? shuffleArray(question.choices) : question.choices),
    [question.id, shuffleChoices],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      const num = Number(e.key);
      if (num >= 1 && num <= displayChoices.length) {
        onAnswer(displayChoices[num - 1].id);
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
            className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-slate-800 transition-transform hover:bg-slate-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            disabled={disabled}
            key={choice.id}
            onClick={() => onAnswer(choice.id)}
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
