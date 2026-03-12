import { useCallback, useEffect } from 'react';

import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../lib/types';

type Props = {
  question: MultipleChoiceQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

export default function MultipleChoiceQuestion({
  question,
  onAnswer,
  disabled,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      const num = Number(e.key);
      if (num >= 1 && num <= question.choices.length) {
        onAnswer(question.choices[num - 1].id);
      }
    },
    [disabled, onAnswer, question.choices],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900">{question.question}</p>
      <div className="grid gap-3">
        {question.choices.map((choice, index) => (
          <button
            className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
