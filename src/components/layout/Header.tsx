import { NavLink } from 'react-router-dom';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-4 py-2 text-sm transition',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white/80',
  ].join(' ');

export default function Header() {
  return (
    <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs tracking-widest text-sky-700">
            オフライン学習
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">ローカルクイズアプリ</h1>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClassName} end>
            クイズパック
          </NavLink>
          <NavLink to="/settings" className={navLinkClassName}>
            設定
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
