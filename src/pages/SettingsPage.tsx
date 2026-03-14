import { Link } from 'react-router-dom';

import Card from '../components/common/Card';
import { updateSetting } from '../lib/commands';
import { useAppSettingsStore } from '../stores/appSettingsStore';

export default function SettingsPage() {
  const questionOrder = useAppSettingsStore((s) => s.questionOrder);
  const theme = useAppSettingsStore((s) => s.theme);
  const shuffleChoices = useAppSettingsStore((s) => s.shuffleChoices);
  const setQuestionOrder = useAppSettingsStore((s) => s.setQuestionOrder);
  const setTheme = useAppSettingsStore((s) => s.setTheme);
  const setShuffleChoices = useAppSettingsStore((s) => s.setShuffleChoices);

  const handleQuestionOrderChange = async (value: 'sequential' | 'random') => {
    await updateSetting('question_order', value);
    setQuestionOrder(value);
  };

  const handleThemeChange = async (value: 'light' | 'dark') => {
    await updateSetting('theme', value);
    setTheme(value);
  };

  const handleShuffleChoicesChange = async (checked: boolean) => {
    await updateSetting('shuffle_choices', String(checked));
    setShuffleChoices(checked);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm tracking-widest text-sky-700 dark:text-sky-400">
              アプリ設定
            </p>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
              設定
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

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          出題順
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="questionOrder"
              value="sequential"
              checked={questionOrder === 'sequential'}
              onChange={() => handleQuestionOrderChange('sequential')}
            />
            定義順
          </label>
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="questionOrder"
              value="random"
              checked={questionOrder === 'random'}
              onChange={() => handleQuestionOrderChange('random')}
            />
            ランダム
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          選択肢の表示
        </h3>
        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={shuffleChoices}
            onChange={(e) => handleShuffleChoicesChange(e.target.checked)}
          />
          選択肢をランダムに並べ替える
        </label>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          テーマ
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={() => handleThemeChange('light')}
            />
            ライト
          </label>
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => handleThemeChange('dark')}
            />
            ダーク
          </label>
        </div>
      </Card>
    </div>
  );
}
