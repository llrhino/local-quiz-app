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
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
