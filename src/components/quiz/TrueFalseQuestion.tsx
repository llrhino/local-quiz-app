import type { TrueFalseQuestion as TrueFalseQuestionType } from '../../lib/types';

type Props = {
  question: TrueFalseQuestionType;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

export default function TrueFalseQuestion({
  question,
  onAnswer,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{question.question}</p>
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          disabled={disabled}
          onClick={() => onAnswer('true')}
          type="button"
        >
          ○
        </button>
        <button
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
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
