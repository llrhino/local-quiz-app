import type { TextInputQuestion as TextInputQuestionType } from '../../lib/types';

type Props = {
  question: TextInputQuestionType;
};

export default function TextInputQuestion({ question }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900">{question.question}</p>
      <input
        className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        placeholder="解答を入力"
        type="text"
      />
    </div>
  );
}
