type Props = {
  current: number;
  total: number;
};

export default function QuizProgress({ current, total }: Props) {
  return (
    <p className="text-sm text-slate-600">
      Question {current} / {total}
    </p>
  );
}
