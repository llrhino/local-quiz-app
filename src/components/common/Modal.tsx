import type { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  title: string;
}>;

export default function Modal({ title, children }: ModalProps) {
  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
      role="dialog"
    >
      {children}
    </div>
  );
}
