import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement>>;

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <section
      className={[
        'rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800/85 dark:shadow-slate-900/50',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}
