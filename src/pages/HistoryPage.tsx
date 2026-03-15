import { Link, useParams } from 'react-router-dom';

import Card from '../components/common/Card';
import { useHistoryData } from '../hooks/useHistoryData';

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function HistoryPage() {
  const { packId } = useParams<{ packId: string }>();
  const { sessions, statistics, weakQuestions, loading, error } = useHistoryData(packId!);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm tracking-widest text-sky-700 dark:text-sky-400">
              パック詳細
            </p>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
              学習履歴
            </h2>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            to="/"
          >
            戻る
          </Link>
        </div>
      </Card>

      {loading && (
        <p className="text-center text-slate-500 dark:text-slate-400">読み込み中...</p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && statistics?.totalAnswers === 0 && (
        <Card>
          <p className="text-slate-500 dark:text-slate-400">
            まだ学習履歴がありません。クイズに挑戦してみましょう！
          </p>
        </Card>
      )}

      {!loading && !error && statistics && statistics.totalAnswers > 0 && (
        <>
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              全体統計
            </h3>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                  {formatPercent(statistics.accuracyRate)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">正答率</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {statistics.totalAnswers}回
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">総回答数</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {statistics.correctAnswers}問正解
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">正解数</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              セッション一覧
            </h3>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                  data-testid="session-item"
                >
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(session.startedAt)}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {session.totalAnswers}問中
                    </span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {formatPercent(session.accuracyRate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              弱点問題
            </h3>
            {weakQuestions.length === 0 ? (
              statistics.weakEligibleCount > 0 ? (
                <div
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950"
                  data-testid="weak-zero-achievement"
                >
                  <span className="text-2xl text-emerald-600 dark:text-emerald-400">✓</span>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    すべての弱点を克服しました
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">弱点問題はありません</p>
              )
            ) : (
              <div className="space-y-3">
                {weakQuestions.map((wq) => (
                  <div
                    key={wq.questionId}
                    className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                    data-testid="weak-question-item"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {wq.questionText}
                      </p>
                      {wq.answerCount >= 5 && wq.accuracyRate >= 0.6 && (
                        <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                          あと少しで克服
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>{wq.answerCount}回回答</span>
                      <span>正答率: <span className="text-slate-700 dark:text-slate-300">{formatPercent(wq.accuracyRate)}</span></span>
                      <span>直近の回答: <span className="text-slate-700 dark:text-slate-300">{wq.lastUserAnswer}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
