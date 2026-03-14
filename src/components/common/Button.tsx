import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export default function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-full px-4 py-2 font-medium',
        'bg-slate-900 text-white transition-transform hover:bg-slate-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
