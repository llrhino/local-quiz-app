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
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700">
            Offline Training
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Local Quiz App</h1>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClassName} end>
            Quiz Packs
          </NavLink>
          <NavLink to="/settings" className={navLinkClassName}>
            Settings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
