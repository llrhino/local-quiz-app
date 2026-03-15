import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../lib/types';
import { shouldIgnoreGlobalShortcut } from '../../lib/keyboard';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import LinkText from '../common/LinkText';

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

function getChoiceClassName(choiceIndex: string, isSelected: boolean, answerResult?: AnswerResult, correctAnswer?: string): string {
  const base = 'rounded-2xl border px-4 py-3 text-left text-slate-800 transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';
  const darkBase = 'dark:text-slate-200';

  if (answerResult && correctAnswer) {
    if (choiceIndex === correctAnswer) {
      return `${base} border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900 ${darkBase}`;
    }
    if (choiceIndex === answerResult.userAnswer && !answerResult.isCorrect) {
      return `${base} border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900 ${darkBase}`;
    }
  }

  const selectedClass = isSelected ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-300 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700';

  return `${base} ${selectedClass} ${darkBase}`;
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

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [question.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled || shouldIgnoreGlobalShortcut(e)) return;
      const num = Number(e.key);
      if (num >= 1 && num <= displayChoices.length) {
        onAnswer(String(displayChoices[num - 1].originalIndex));
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setSelectedIndex((prev) => Math.min(displayChoices.length - 1, prev + 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onAnswer(String(displayChoices[selectedIndex].originalIndex));
      }
    },
    [disabled, onAnswer, displayChoices, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100"><LinkText text={question.question} /></p>
      <div className="grid gap-3">
        {displayChoices.map((choice, index) => (
          <button
            className={getChoiceClassName(String(choice.originalIndex), index === selectedIndex, answerResult, correctAnswer)}
            disabled={disabled}
            key={choice.originalIndex}
            onClick={() => onAnswer(String(choice.originalIndex))}
            type="button"
          >
            <span className="mr-2 font-mono text-sm text-slate-400">
              {index + 1}.
            </span>
            <LinkText text={choice.text} />
          </button>
        ))}
      </div>
    </div>
  );
}
