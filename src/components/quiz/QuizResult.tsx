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
    <div className="space-y-2 rounded-3xl bg-slate-100 p-6 dark:bg-slate-800">
      <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
        {isCorrect ? '正解' : '不正解'}
      </p>
      <p className="text-slate-700 dark:text-slate-300">あなたの解答: {userAnswer}</p>
      <p className="text-slate-700 dark:text-slate-300">正解: {correctAnswer}</p>
      <p className="text-slate-600 dark:text-slate-400">{explanation ?? '解説はありません'}</p>
    </div>
  );
}
