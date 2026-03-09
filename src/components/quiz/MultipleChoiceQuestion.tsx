import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../lib/types';

type Props = {
  question: MultipleChoiceQuestionType;
};

export default function MultipleChoiceQuestion({ question }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-slate-900">{question.question}</p>
      <div className="grid gap-3">
        {question.choices.map((choice) => (
          <button
            className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-slate-800"
            key={choice.id}
            type="button"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
