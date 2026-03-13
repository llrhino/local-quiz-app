import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { PackStatistics, WeakQuestion } from '../lib/types';
import type { Session } from '../lib/sessions';

vi.mock('../hooks/useHistoryData', () => ({
  useHistoryData: vi.fn(),
}));

import { useHistoryData } from '../hooks/useHistoryData';
import HistoryPage from './HistoryPage';

const mockUseHistoryData = vi.mocked(useHistoryData);

const sampleSessions: Session[] = [
  {
    startedAt: '2026-03-11T14:00:00Z',
    totalAnswers: 5,
    correctAnswers: 4,
    accuracyRate: 0.8,
  },
  {
    startedAt: '2026-03-10T10:00:00Z',
    totalAnswers: 5,
    correctAnswers: 3,
    accuracyRate: 0.6,
  },
];

const sampleStatistics: PackStatistics = {
  packId: 'pack-1',
  totalAnswers: 10,
  correctAnswers: 7,
  accuracyRate: 0.7,
};

const sampleWeakQuestions: WeakQuestion[] = [
  {
    questionId: 'q3',
    questionText: 'SQLインジェクションとは？',
    answerCount: 4,
    accuracyRate: 0.25,
    lastUserAnswer: '間違った回答',
  },
  {
    questionId: 'q5',
    questionText: 'XSSの正式名称は？',
    answerCount: 3,
    accuracyRate: 0.333,
    lastUserAnswer: 'クロスサイトスクリプティング',
  },
];

function renderHistoryPage(packId = 'pack-1') {
  return render(
    <MemoryRouter initialEntries={[`/history/${packId}`]}>
      <Routes>
        <Route path="/history/:packId" element={<HistoryPage />} />
        <Route path="/" element={<div>ホーム画面</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseHistoryData.mockReturnValue({
      sessions: sampleSessions,
      statistics: sampleStatistics,
      weakQuestions: sampleWeakQuestions,
      loading: false,
      error: null,
    });
  });

  it('見出しを表示する', () => {
    renderHistoryPage();
    expect(screen.getByRole('heading', { name: '学習履歴' })).toBeInTheDocument();
  });

  it('packId を useHistoryData に渡す', () => {
    renderHistoryPage('my-pack');
    expect(mockUseHistoryData).toHaveBeenCalledWith('my-pack');
  });

  describe('ローディング表示', () => {
    it('ローディング中はスピナーを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: [],
        statistics: null,
        weakQuestions: [],
        loading: true,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('エラー時にエラーメッセージを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: [],
        statistics: null,
        weakQuestions: [],
        loading: false,
        error: '学習履歴の取得に失敗しました',
      });
      renderHistoryPage();
      expect(screen.getByText('学習履歴の取得に失敗しました')).toBeInTheDocument();
    });
  });

  describe('統計情報', () => {
    it('全体の正答率を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('総回答数を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('10回')).toBeInTheDocument();
    });

    it('正答数を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('7問正解')).toBeInTheDocument();
    });
  });

  describe('セッション一覧', () => {
    it('セッション日時を表示する', () => {
      renderHistoryPage();
      // 日時のフォーマットは実装に依存するが、セッション数分表示されること
      const sessionItems = screen.getAllByTestId('session-item');
      expect(sessionItems).toHaveLength(2);
    });

    it('各セッションの正答率を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('各セッションの回答数を表示する', () => {
      renderHistoryPage();
      expect(screen.getAllByText('5問中')).toHaveLength(2);
    });
  });

  describe('弱点問題セクション', () => {
    it('弱点問題の見出しを表示する', () => {
      renderHistoryPage();
      expect(screen.getByRole('heading', { name: '弱点問題' })).toBeInTheDocument();
    });

    it('弱点問題の問題文を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('SQLインジェクションとは？')).toBeInTheDocument();
      expect(screen.getByText('XSSの正式名称は？')).toBeInTheDocument();
    });

    it('弱点問題の回答回数を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('4回回答')).toBeInTheDocument();
      expect(screen.getByText('3回回答')).toBeInTheDocument();
    });

    it('弱点問題の正答率を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('弱点問題の直近回答を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('間違った回答')).toBeInTheDocument();
      expect(screen.getByText('クロスサイトスクリプティング')).toBeInTheDocument();
    });

    it('弱点問題がない場合はメッセージを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('弱点問題はありません')).toBeInTheDocument();
    });
  });

  describe('空状態', () => {
    it('履歴がない場合は案内メッセージを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: [],
        statistics: {
          packId: 'pack-1',
          totalAnswers: 0,
          correctAnswers: 0,
          accuracyRate: 0,
        },
        weakQuestions: [],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(
        screen.getByText('まだ学習履歴がありません。クイズに挑戦してみましょう！'),
      ).toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    it('「戻る」ボタンがホーム画面へのリンクである', () => {
      renderHistoryPage();
      const backLink = screen.getByRole('link', { name: '戻る' });
      expect(backLink).toHaveAttribute('href', '/');
    });
  });
});
