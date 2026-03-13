import { useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { useQuizPacks } from '../hooks/useQuizPacks';
import type { QuizPackSummary } from '../lib/types';

export default function HomePage() {
  const { packs, loading, error, importing, importPack, seedSample, deletePack, exportPack } = useQuizPacks();
  const [notification, setNotification] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizPackSummary | null>(null);

  const handleImport = async () => {
    setNotification(null);
    const err = await importPack();
    if (err) setNotification(err);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const packId = deleteTarget.id;
    setDeleteTarget(null);
    const err = await deletePack(packId);
    if (err) setNotification(err);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm tracking-widest text-sky-700 dark:text-sky-400">
              パック管理
            </p>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
              クイズパック
            </h2>
          </div>
          <Button disabled={importing} onClick={handleImport}>
            {importing ? 'インポート中...' : 'インポート'}
          </Button>
        </div>
      </Card>

      {notification && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {notification}
        </div>
      )}

      {loading && (
        <p className="text-center text-slate-500 dark:text-slate-400">読み込み中...</p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && packs.length === 0 && (
        <Card className="space-y-4 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            クイズパックがまだありません。JSONファイルをインポートしてください。
          </p>
          <Button
            onClick={async () => {
              setNotification(null);
              const err = await seedSample();
              if (err) setNotification(err);
            }}
          >
            サンプルを試す
          </Button>
        </Card>
      )}

      {packs.map((pack) => (
        <Card key={pack.id} className="space-y-3" data-testid="pack-card">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {pack.name}
            </h3>
            {pack.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {pack.description}
              </p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pack.questionCount}問
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              to={`/quiz/${pack.id}`}
            >
              開始
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              to={`/history/${pack.id}`}
            >
              履歴
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              onClick={async () => {
                setNotification(null);
                const err = await exportPack(pack.id, pack.name);
                if (err) setNotification(err);
              }}
              type="button"
            >
              エクスポート
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 font-medium text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => setDeleteTarget(pack)}
              type="button"
            >
              削除
            </button>
          </div>
        </Card>
      ))}

      <Modal
        isOpen={deleteTarget !== null}
        title="パックの削除"
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <button
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
            onClick={handleDelete}
            type="button"
          >
            削除する
          </button>
        </div>
      </Modal>
    </div>
  );
}
