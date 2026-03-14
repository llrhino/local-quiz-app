import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import App from './App';
import QuizResult from './components/quiz/QuizResult';
import TextInputQuestion from './components/quiz/TextInputQuestion';
import TrueFalseQuestion from './components/quiz/TrueFalseQuestion';
import type { TextInputQuestion as TextInputQuestionType, TrueFalseQuestion as TrueFalseQuestionType } from './lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('App', () => {
  it('ホーム画面の主要なUI文言を日本語で表示する', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'ローカルクイズアプリ' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'クイズパック' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('オフライン学習'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '設定' }),
    ).toHaveAttribute('href', '/settings');
    expect(
      screen.getByRole('button', { name: 'インポート' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'メインコンテンツへスキップ' }),
    ).toHaveAttribute('href', '#main-content');
    expect(document.querySelector('main#main-content')).not.toBeNull();
  });

  it('主要ページの見出しを日本語で表示する', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(screen.getByText('出題順')).toBeInTheDocument();
    expect(screen.getByText('テーマ')).toBeInTheDocument();

    cleanup();

    render(
      <MemoryRouter initialEntries={['/history/sample-pack']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '学習履歴' })).toBeInTheDocument();

  });
});

describe('question components', () => {
  it('入力系コンポーネントの文言を日本語で表示する', () => {
    const textQuestion: TextInputQuestionType = {
      id: 'q1',
      type: 'text_input',
      question: '富士山の高さは？',
      answer: '3776m',
    };
    const trueFalseQuestion: TrueFalseQuestionType = {
      id: 'q2',
      type: 'true_false',
      question: '北海道は日本最大の島である',
      answer: false,
    };

    const noop = vi.fn();
    const { rerender } = render(<TextInputQuestion question={textQuestion} onAnswer={noop} />);

    expect(screen.getByPlaceholderText('解答を入力')).toBeInTheDocument();

    rerender(<TrueFalseQuestion question={trueFalseQuestion} onAnswer={noop} />);

    expect(screen.getByRole('button', { name: '○' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
  });

  it('解答結果を日本語で表示する', () => {
    render(
      <QuizResult
        correctAnswer="東京"
        isCorrect={false}
        userAnswer="大阪"
      />,
    );

    expect(screen.getByText('不正解')).toBeInTheDocument();
    expect(screen.getByText('あなたの解答: 大阪')).toBeInTheDocument();
    expect(screen.getByText('正解: 東京')).toBeInTheDocument();
  });
});

describe('日本語表示設定', () => {
  it('HTML文書を日本語設定にしている', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

    expect(html).toContain('<html lang="ja">');
  });

  it('グローバルフォントに日本語フォントのフォールバックを含める', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'src/index.css'), 'utf-8');

    expect(css).toContain('"Yu Gothic UI"');
    expect(css).toContain('"Meiryo"');
    expect(css).toContain('"Hiragino Sans"');
  });
});
