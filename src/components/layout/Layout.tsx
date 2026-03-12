import { Outlet } from 'react-router-dom';

import { useTheme } from '../../hooks/useTheme';
import Header from './Header';

export default function Layout() {
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
