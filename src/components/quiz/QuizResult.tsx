type Props = {
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer: string;
  explanation?: string;
};

export default function QuizResult({
  isCorrect,
  correctAnswer,
  userAnswer,
  explanation,
}: Props) {
  return (
    <div className="space-y-2 rounded-3xl bg-slate-100 p-6">
      <p className="text-lg font-semibold text-slate-950">
        {isCorrect ? 'Correct' : 'Incorrect'}
      </p>
      <p className="text-slate-700">Your answer: {userAnswer}</p>
      <p className="text-slate-700">Correct answer: {correctAnswer}</p>
      <p className="text-slate-600">{explanation ?? '解説はありません'}</p>
    </div>
  );
}
