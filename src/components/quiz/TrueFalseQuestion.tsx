import type { TrueFalseQuestion as TrueFalseQuestionType } from '../../lib/types';

type Props = {
  question: TrueFalseQuestionType;
};

export default function TrueFalseQuestion({ question }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900">{question.question}</p>
      <div className="flex gap-3">
        <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button">
          ○
        </button>
        <button className="rounded-2xl border border-slate-200 px-4 py-3" type="button">
          ×
        </button>
      </div>
    </div>
  );
}
