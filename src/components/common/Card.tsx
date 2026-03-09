import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={[
        'rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-200/50',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}
