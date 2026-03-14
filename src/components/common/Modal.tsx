import { useCallback, useEffect, useId, useRef, type PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  title: string;
  onClose: () => void;
}>;

/**
 * フォーカス可能な要素を取得するセレクタ
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, title, children, onClose }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  // モーダル表示時にトリガー要素を記録し、フォーカスをモーダル内に移動
  useEffect(() => {
    if (!isOpen) return;
    previousActiveElementRef.current = document.activeElement;

    // フォーカスをモーダル内に移動
    const dialog = dialogRef.current;
    if (dialog) {
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialog.focus();
      }
    }
  }, [isOpen]);

  // モーダルが閉じたときにトリガー要素にフォーカスを戻す
  useEffect(() => {
    if (isOpen) return;
    const prev = previousActiveElementRef.current;
    if (prev && prev instanceof HTMLElement) {
      prev.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Escape キーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 背景スクロール抑制
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // フォーカストラップ
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: 最初の要素にいる場合、最後の要素に移動
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 最後の要素にいる場合、最初の要素に移動
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 id={titleId} className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
