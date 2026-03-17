import { useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LinkText from '../components/common/LinkText';
import Modal from '../components/common/Modal';
import { usePackFilter } from '../hooks/usePackFilter';
import type { SortKey } from '../hooks/usePackFilter';
import { useQuizPacks } from '../hooks/useQuizPacks';
import type { QuizPackSummary } from '../lib/types';

function QuizPackCard({
  onDelete,
  onExport,
  pack,
}: {
  onDelete: (pack: QuizPackSummary) => void;
  onExport: (pack: QuizPackSummary) => Promise<void>;
  pack: QuizPackSummary;
}) {
  return (
    <Card className="space-y-3" data-testid="pack-card">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            {pack.name}
          </h3>
          {pack.allCorrect && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              data-testid="all-correct-badge"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              全問正解
            </span>
          )}
        </div>
        {pack.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <LinkText text={pack.description} />
          </p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pack.questionCount}問
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          to={`/quiz/${pack.id}`}
        >
          開始
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          to={`/history/${pack.id}`}
        >
          履歴
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          to={`/editor/${pack.id}`}
        >
          編集
        </Link>
        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          onClick={() => onExport(pack)}
          type="button"
        >
          エクスポート
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 font-medium text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          onClick={() => onDelete(pack)}
          type="button"
        >
          削除
        </button>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { packs, loading, error, importing, importPack, forceImportPack, seedSample, deletePack, exportPack } = useQuizPacks();
  const {
    sortKey,
    setSortKey,
    excludeAllCorrect,
    setExcludeAllCorrect,
    searchQuery,
    setSearchQuery,
    filteredPacks,
  } = usePackFilter(packs);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizPackSummary | null>(null);
  const [updateImportFilePath, setUpdateImportFilePath] = useState<string | null>(null);

  const handleImport = async () => {
    setNotification(null);
    const result = await importPack();
    if (!result) return;
    if (result.duplicateFilePath) {
      setUpdateImportFilePath(result.duplicateFilePath);
    } else if (result.error) {
      setNotification({ type: 'error', message: result.error });
    }
  };

  const handleForceImport = async () => {
    if (!updateImportFilePath) return;
    const filePath = updateImportFilePath;
    setUpdateImportFilePath(null);
    const err = await forceImportPack(filePath);
    if (err) {
      setNotification({ type: 'error', message: err });
    } else {
      setNotification({ type: 'success', message: 'パックを更新しました。' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const packId = deleteTarget.id;
    setDeleteTarget(null);
    const err = await deletePack(packId);
    if (err) setNotification({ type: 'error', message: err });
  };

  const handleExport = async (pack: QuizPackSummary) => {
    setNotification(null);
    const err = await exportPack(pack.id, pack.name);
    if (err) {
      setNotification({ type: 'error', message: err });
      return;
    }

    setNotification({
      type: 'success',
      message: `「${pack.name}」をエクスポートしました。`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm tracking-widest text-sky-700 dark:text-sky-400">
              パック一覧
            </p>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
              クイズパック
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              既存レイアウトを保ったまま、学習と編集を同じ一覧から行えます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              to="/editor"
            >
              新規作成
            </Link>
            <Button disabled={importing} onClick={handleImport}>
              {importing ? 'インポート中...' : 'インポート'}
            </Button>
          </div>
        </div>
      </Card>

      {notification && (
        <div
          className={`whitespace-pre-line rounded-2xl border px-4 py-3 text-sm ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
          }`}
          data-testid="notification"
        >
          {notification.message}
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

      {!loading && !error && packs.length > 0 && (
        <Card className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="パック名で検索"
              type="text"
              value={searchQuery}
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <span>並び替え</span>
                <select
                  aria-label="並び替え"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  value={sortKey}
                >
                  <option value="updatedAtDesc">更新が新しい順</option>
                  <option value="importedAtAsc">登録が古い順</option>
                  <option value="correctRateAsc">正答率が低い順</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                <input
                  checked={excludeAllCorrect}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600"
                  onChange={(e) => setExcludeAllCorrect(e.target.checked)}
                  type="checkbox"
                />
                全問正解を除外
              </label>
            </div>
          </div>
        </Card>
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
              if (err) setNotification({ type: 'error', message: err });
            }}
          >
            サンプルを試す
          </Button>
        </Card>
      )}

      {!loading && !error && packs.length > 0 && filteredPacks.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-500 dark:text-slate-400">
            条件に一致するパックがありません。
          </p>
        </Card>
      )}

      {!loading && !error && filteredPacks.length > 0 && (
        <div className="space-y-4">
          {filteredPacks.map((pack) => (
            <QuizPackCard
              key={pack.id}
              onDelete={setDeleteTarget}
              onExport={handleExport}
              pack={pack}
            />
          ))}
        </div>
      )}

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
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            onClick={handleDelete}
            type="button"
          >
            削除する
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={updateImportFilePath !== null}
        title="パックの更新"
        onClose={() => setUpdateImportFilePath(null)}
      >
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          このパックは既にインポートされています。更新しますか？
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          学習履歴は可能な限り保持されます。正答が変更された問題の履歴はリセットされます。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setUpdateImportFilePath(null)}>キャンセル</Button>
          <Button onClick={handleForceImport}>更新する</Button>
        </div>
      </Modal>
    </div>
  );
}
