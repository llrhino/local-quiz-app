import { useEffect, useRef, useState } from 'react';

import type { TextInputQuestion as TextInputQuestionType } from '../../lib/types';
import LinkText from '../common/LinkText';

type AnswerResult = {
  userAnswer: string;
  isCorrect: boolean;
};

type Props = {
  question: TextInputQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  answerResult?: AnswerResult;
  correctAnswer?: string;
};

function getInputClassName(answerResult?: AnswerResult): string {
  const base = 'flex-1 rounded-2xl border px-4 py-3';
  if (!answerResult) {
    return `${base} border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100`;
  }
  if (answerResult.isCorrect) {
    return `${base} border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900 dark:text-slate-100`;
  }
  return `${base} border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900 dark:text-slate-100`;
}

export default function TextInputQuestion({
  question,
  onAnswer,
  disabled,
  answerResult,
}: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 問題が切り替わったら入力欄をクリアしてフォーカスする
  useEffect(() => {
    setValue('');
    inputRef.current?.focus();
  }, [question.id]);

  const handleSubmit = () => {
    if (value.trim() === '') return;
    onAnswer(value);
  };

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100"><LinkText text={question.question} /></p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className={getInputClassName(answerResult)}
            disabled={disabled}
            lang="ja"
            onChange={(e) => setValue(e.target.value)}
            placeholder="解答を入力"
            type="text"
            value={value}
          />
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            disabled={disabled || value.trim() === ''}
            type="submit"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
}
