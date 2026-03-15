import { useEffect, useRef, useState } from 'react';

import type { TextInputQuestion as TextInputQuestionType } from '../../lib/types';
import LinkText from '../common/LinkText';

type Props = {
  question: TextInputQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

export default function TextInputQuestion({
  question,
  onAnswer,
  disabled,
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
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
