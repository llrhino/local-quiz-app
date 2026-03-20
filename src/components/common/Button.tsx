import type { ButtonHTMLAttributes, PropsWithChildren, Ref } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary';
  ref?: Ref<HTMLButtonElement>;
};

const baseStyles =
  'inline-flex items-center justify-center rounded-full px-4 py-2 font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';

const variantStyles = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500',
  secondary:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600 dark:disabled:border-slate-700',
};

export default function Button({ children, className = '', variant = 'primary', ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      className={[baseStyles, variantStyles[variant], className].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
