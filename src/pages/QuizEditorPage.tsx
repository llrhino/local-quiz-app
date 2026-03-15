import { Link, useParams } from 'react-router-dom';

import Card from '../components/common/Card';

export default function QuizEditorPage() {
  const { packId } = useParams();
  const isEditMode = Boolean(packId);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm tracking-widest text-sky-700 dark:text-sky-400">
              パックエディタ
            </p>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {isEditMode ? 'クイズパック編集' : 'クイズパック作成'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEditMode
                ? '既存パックの編集画面は次の issue で実装します。'
                : '新規作成画面は次の issue で実装します。'}
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            to="/"
          >
            トップへ戻る
          </Link>
        </div>
      </Card>
    </div>
  );
}
