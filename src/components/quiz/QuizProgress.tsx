type Props = {
  current: number;
  total: number;
};

export default function QuizProgress({ current, total }: Props) {
  const percentage = (current / total) * 100;

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        問題 {current} / {total}
      </p>
      <div
        className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-2 rounded-full bg-sky-500 transition-all duration-300 ease-out dark:bg-sky-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
