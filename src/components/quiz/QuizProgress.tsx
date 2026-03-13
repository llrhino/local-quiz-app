type Props = {
  current: number;
  total: number;
};

export default function QuizProgress({ current, total }: Props) {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400">
      問題 {current} / {total}
    </p>
  );
}
