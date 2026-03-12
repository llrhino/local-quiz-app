import { useState } from 'react';

import type { TextInputQuestion as TextInputQuestionType } from '../../lib/types';

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

  const handleSubmit = () => {
    if (value.trim() === '') return;
    onAnswer(value);
  };

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900">{question.question}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            placeholder="解答を入力"
            type="text"
            value={value}
          />
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
