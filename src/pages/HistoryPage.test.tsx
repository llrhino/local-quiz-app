import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { PackStatistics, Session, WeakQuestion } from '../lib/types';

vi.mock('../hooks/useHistoryData', () => ({
  useHistoryData: vi.fn(),
}));

import { useHistoryData } from '../hooks/useHistoryData';
import HistoryPage from './HistoryPage';

const mockUseHistoryData = vi.mocked(useHistoryData);

const sampleSessions: Session[] = [
  {
    sessionId: 'sess-1',
    startedAt: '2026-03-11T14:00:00Z',
    totalAnswers: 5,
    correctAnswers: 4,
    accuracyRate: 0.8,
  },
  {
    sessionId: 'sess-2',
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
  weakEligibleCount: 3,
};

const sampleWeakQuestions: WeakQuestion[] = [
  {
    questionId: 'q3',
    questionText: 'SQLインジェクションとは？',
    answerCount: 4,
    accuracyRate: 0.25,
    lastUserAnswer: '間違った回答',
    questionType: 'text_input',
    correctAnswer: 'SQLを悪用した攻撃手法',
    choicesJson: null,
    explanation: 'SQL文を注入する攻撃',
    lastIsCorrect: false,
  },
  {
    questionId: 'q5',
    questionText: 'XSSの正式名称は？',
    answerCount: 3,
    accuracyRate: 0.333,
    lastUserAnswer: 'クロスサイトスクリプティング',
    questionType: 'text_input',
    correctAnswer: 'クロスサイトスクリプティング',
    choicesJson: null,
    explanation: null,
    lastIsCorrect: true,
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

    it('弱点問題の直近回答をフォーマット済みで表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('間違った回答')).toBeInTheDocument();
      // q5は回答=正解なので複数表示される
      expect(screen.getAllByText('クロスサイトスクリプティング').length).toBeGreaterThanOrEqual(1);
    });

    it('弱点問題の正解を表示する', () => {
      renderHistoryPage();
      expect(screen.getByText('SQLを悪用した攻撃手法')).toBeInTheDocument();
    });

    it('不正解の弱点問題に不正解アイコンを表示する', () => {
      renderHistoryPage();
      const items = screen.getAllByTestId('weak-question-item');
      // q3は不正解
      expect(items[0].querySelector('[data-testid="incorrect-icon"]')).toBeInTheDocument();
    });

    it('正解の弱点問題に正解アイコンを表示する', () => {
      renderHistoryPage();
      const items = screen.getAllByTestId('weak-question-item');
      // q5は正解
      expect(items[1].querySelector('[data-testid="correct-icon"]')).toBeInTheDocument();
    });

    it('選択問題のインデックスを選択肢テキストに変換して表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [
          {
            questionId: 'q1',
            questionText: '鍵長の問題',
            answerCount: 3,
            accuracyRate: 0.33,
            lastUserAnswer: '0',
            questionType: 'multiple_choice' as const,
            correctAnswer: '1',
            choicesJson: JSON.stringify([{ text: '64ビット' }, { text: '256ビット' }]),
            explanation: null,
            lastIsCorrect: false,
          },
        ],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('64ビット')).toBeInTheDocument();
      expect(screen.getByText('256ビット')).toBeInTheDocument();
    });

    it('〇×問題のtrue/falseを日本語に変換して表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [
          {
            questionId: 'q2',
            questionText: 'TLSの問題',
            answerCount: 2,
            accuracyRate: 0.0,
            lastUserAnswer: 'false',
            questionType: 'true_false' as const,
            correctAnswer: 'true',
            choicesJson: null,
            explanation: null,
            lastIsCorrect: false,
          },
        ],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('×')).toBeInTheDocument();
      expect(screen.getByText('〇')).toBeInTheDocument();
    });

    it('回答5回以上かつ正答率60%の弱点問題に「あと少しで克服」ラベルを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [
          {
            questionId: 'q1',
            questionText: '克服に近い問題',
            answerCount: 5,
            accuracyRate: 0.6,
            lastUserAnswer: '回答A',
            questionType: 'text_input' as const,
            correctAnswer: '正解A',
            choicesJson: null,
            explanation: null,
            lastIsCorrect: false,
          },
        ],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('あと少しで克服')).toBeInTheDocument();
    });

    it('回答5回未満の弱点問題には「あと少しで克服」ラベルを表示しない', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [
          {
            questionId: 'q1',
            questionText: '回答不足の問題',
            answerCount: 4,
            accuracyRate: 0.75,
            lastUserAnswer: '回答A',
            questionType: 'text_input' as const,
            correctAnswer: '正解A',
            choicesJson: null,
            explanation: null,
            lastIsCorrect: false,
          },
        ],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.queryByText('あと少しで克服')).not.toBeInTheDocument();
    });

    it('正答率60%未満の弱点問題には「あと少しで克服」ラベルを表示しない', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: sampleStatistics,
        weakQuestions: [
          {
            questionId: 'q1',
            questionText: '正答率低い問題',
            answerCount: 5,
            accuracyRate: 0.4,
            lastUserAnswer: '回答A',
            questionType: 'text_input' as const,
            correctAnswer: '正解A',
            choicesJson: null,
            explanation: null,
            lastIsCorrect: false,
          },
        ],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.queryByText('あと少しで克服')).not.toBeInTheDocument();
    });

    it('弱点問題がない場合はメッセージを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: { ...sampleStatistics, weakEligibleCount: 0 },
        weakQuestions: [],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('弱点問題はありません')).toBeInTheDocument();
    });

    it('弱点ゼロかつ判定対象ありの場合に達成カードを表示する', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: { ...sampleStatistics, weakEligibleCount: 3 },
        weakQuestions: [],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.getByText('すべての弱点を克服しました')).toBeInTheDocument();
      expect(screen.queryByText('弱点問題はありません')).not.toBeInTheDocument();
    });

    it('弱点ゼロでも判定対象がゼロの場合は達成カードを表示しない', () => {
      mockUseHistoryData.mockReturnValue({
        sessions: sampleSessions,
        statistics: { ...sampleStatistics, weakEligibleCount: 0 },
        weakQuestions: [],
        loading: false,
        error: null,
      });
      renderHistoryPage();
      expect(screen.queryByText('すべての弱点を克服しました')).not.toBeInTheDocument();
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
          weakEligibleCount: 0,
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
