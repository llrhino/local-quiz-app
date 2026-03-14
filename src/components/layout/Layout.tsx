import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useTheme } from '../../hooks/useTheme';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import Header from './Header';

export default function Layout() {
  const loadSettings = useAppSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useTheme();
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 rounded-full bg-sky-600 px-4 py-2 font-medium text-white focus:not-sr-only focus:z-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
      >
        メインコンテンツへスキップ
      </a>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
