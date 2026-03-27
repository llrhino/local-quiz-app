import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from './ErrorBoundary';

function ThrowingComponent({ error }: { error: Error }) {
  throw error;
}

describe('ErrorBoundary', () => {
  it('子コンポーネントを正常に描画する', () => {
    render(
      <ErrorBoundary>
        <p>正常なコンテンツ</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
  });

  it('子コンポーネントがエラーを投げた場合にフォールバックUIを表示する', () => {
    // console.error の出力を抑制（React がエラーをログに出すため）
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('テストエラー')} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ホームに戻る' })).toBeInTheDocument();

    spy.mockRestore();
  });
});
