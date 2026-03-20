import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { Question, TextInputQuestion } from '../lib/types';

// モック
const mockStartQuiz = vi.fn();
const mockSubmitAndSave = vi.fn();
const mockNextQuestion = vi.fn();
const mockResetSession = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../hooks/useQuizSessionActions', () => ({
  useQuizSessionActions: () => ({
    loading: false,
    startQuiz: mockStartQuiz,
    submitAndSave: mockSubmitAndSave,
  }),
}));

vi.mock('../hooks/useQuizSession', () => ({
  useQuizSession: vi.fn(),
}));

import { useQuizSession } from '../hooks/useQuizSession';
import QuizPage from './QuizPage';

const mockUseQuizSession = vi.mocked(useQuizSession);

const questions: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '1+1は？',
    choices: [
      { text: '1' },
      { text: '2' },
      { text: '3' },
    ],
    answer: 1,
  },
  {
    id: 'q2',
    type: 'true_false',
    question: '地球は丸い',
    answer: true,
  },
];

function renderQuizPage(packId = 'pack-1') {
  return render(
    <MemoryRouter initialEntries={[`/quiz/${packId}`]}>
      <Routes>
        <Route path="/quiz/:packId" element={<QuizPage />} />
        <Route path="/" element={<div>ホーム</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function setupSessionState(overrides: Partial<ReturnType<typeof useQuizSession>> = {}) {
  mockUseQuizSession.mockReturnValue({
    questions,
    currentIndex: 0,
    answers: [],
    isCompleted: false,
    startSession: vi.fn(),
    submitAnswer: vi.fn(),
    nextQuestion: mockNextQuestion,
    resetSession: mockResetSession,
    ...overrides,
  } as ReturnType<typeof useQuizSession>);
}

describe('QuizPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockStartQuiz.mockResolvedValue(undefined);
    mockSubmitAndSave.mockResolvedValue({ isCorrect: true });
  });

  describe('セッション開始', () => {
    it('マウント時にstartQuizをpackIdで呼び出す', () => {
      setupSessionState({ questions: [], currentIndex: 0 });
      renderQuizPage('pack-1');
      expect(mockStartQuiz).toHaveBeenCalledWith('pack-1');
    });

    it('startQuizがエラーを投げた場合エラーメッセージを表示する', async () => {
      setupSessionState({ questions: [], currentIndex: 0 });
      mockStartQuiz.mockRejectedValue(new Error('パックが見つかりません'));
      renderQuizPage('pack-1');

      expect(await screen.findByText('問題の読み込みに失敗しました')).toBeInTheDocument();
    });
  });

  describe('問題表示', () => {
    it('問題文と進捗を表示する', () => {
      setupSessionState();
      renderQuizPage();

      expect(screen.getByText('問題 1 / 2')).toBeInTheDocument();
      expect(screen.getByText('1+1は？')).toBeInTheDocument();
    });

    it('選択肢をクリックすると回答結果が表示される', async () => {
      setupSessionState();
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('2'));

      expect(mockSubmitAndSave).toHaveBeenCalledWith('pack-1', '1');
      expect(screen.getByText('正解')).toBeInTheDocument();
    });

    it('回答後に選択肢がハイライトされる（正解:緑、不正解:赤）', async () => {
      setupSessionState();
      mockSubmitAndSave.mockResolvedValue({ isCorrect: false });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('1'));

      // ユーザーが選んだ不正解の選択肢（index:0）は赤ハイライト
      const wrongButton = screen.getByText('1').closest('button')!;
      expect(wrongButton.className).toContain('bg-red-100');

      // 正解の選択肢（index:1 = '2'）は緑ハイライト
      const correctButton = screen.getByText('2').closest('button')!;
      expect(correctButton.className).toContain('bg-emerald-100');
    });

    it('不正解の場合は不正解と表示される', async () => {
      setupSessionState();
      mockSubmitAndSave.mockResolvedValue({ isCorrect: false });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('1'));

      expect(screen.getByText('不正解')).toBeInTheDocument();
    });

    it('正解時に正解フィードバック画像が表示される', async () => {
      setupSessionState();
      mockSubmitAndSave.mockResolvedValue({ isCorrect: true });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('2'));

      expect(screen.getByAltText('正解')).toBeInTheDocument();
    });

    it('不正解時に不正解フィードバック画像が表示される', async () => {
      setupSessionState();
      mockSubmitAndSave.mockResolvedValue({ isCorrect: false });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('1'));

      expect(screen.getByAltText('不正解')).toBeInTheDocument();
    });
  });

  describe('次の問題への遷移', () => {
    it('回答後に「次の問題へ」ボタンが表示され、クリックで次に進む', async () => {
      setupSessionState();
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByText('2'));
      expect(screen.getByText('次の問題へ')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '次の問題へ' }));
      expect(mockNextQuestion).toHaveBeenCalled();
    });
  });

  describe('セッション完了', () => {
    it('全問完了時にサマリーと正答率を表示する', () => {
      setupSessionState({
        isCompleted: true,
        answers: ['1', 'true'],
        currentIndex: 2,
      });
      renderQuizPage();

      expect(screen.getByText('クイズ完了')).toBeInTheDocument();
      expect(screen.getByText('2問中2問正解')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    it('回答一覧を表示する', () => {
      setupSessionState({
        isCompleted: true,
        answers: ['1', 'true'],
        currentIndex: 2,
      });
      renderQuizPage();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('「パック一覧に戻る」ボタンでホームに遷移する', async () => {
      setupSessionState({
        isCompleted: true,
        answers: ['1', 'true'],
        currentIndex: 2,
      });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByRole('button', { name: 'パック一覧に戻る' }));
      expect(mockResetSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('「もう一度挑戦する」ボタンでセッションを再開する', async () => {
      setupSessionState({
        isCompleted: true,
        answers: ['1', 'true'],
        currentIndex: 2,
      });
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByRole('button', { name: 'もう一度挑戦する' }));
      expect(mockStartQuiz).toHaveBeenCalledWith('pack-1');
    });
  });

  describe('テキスト入力問題からの遷移', () => {
    const textQuestions: Question[] = [
      {
        id: 'tq1',
        type: 'text_input',
        question: 'Q1は？',
        answer: 'A1',
      } satisfies TextInputQuestion,
      {
        id: 'tq2',
        type: 'text_input',
        question: 'Q2は？',
        answer: 'A2',
      } satisfies TextInputQuestion,
    ];

    it('回答後のEnterキーでpreventDefaultが呼ばれる', async () => {
      setupSessionState({ questions: textQuestions });
      const user = userEvent.setup();
      renderQuizPage();

      // テキスト入力問題に回答（送信ボタンクリック）
      await user.type(screen.getByPlaceholderText('解答を入力'), 'A1');
      await user.click(screen.getByRole('button', { name: '送信' }));

      // Enterキーのイベントを発火し、preventDefaultが呼ばれることを確認
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        window.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
    });

    it('送信ボタンクリック後にEnterで次の問題に進んでも次のテキスト入力問題が自動送信されない', async () => {
      let idx = 0;
      mockUseQuizSession.mockImplementation(
        () =>
          ({
            questions: textQuestions,
            currentIndex: idx,
            answers: [],
            isCompleted: false,
            startSession: vi.fn(),
            submitAnswer: vi.fn(),
            nextQuestion: () => {
              idx++;
            },
            resetSession: mockResetSession,
          }) as unknown as ReturnType<typeof useQuizSession>,
      );

      const user = userEvent.setup();
      renderQuizPage();

      // テキスト入力問題に回答（送信ボタンクリック）
      await user.type(screen.getByPlaceholderText('解答を入力'), 'A1');
      await user.click(screen.getByRole('button', { name: '送信' }));
      expect(mockSubmitAndSave).toHaveBeenCalledTimes(1);

      // Enterで次の問題に進む
      await user.keyboard('{Enter}');

      // 次のテキスト入力問題が自動送信されていないことを確認
      expect(mockSubmitAndSave).toHaveBeenCalledTimes(1);
    });

    it('入力欄フォーカス中またはIME変換中のEnterでは次の問題に進まない', async () => {
      setupSessionState({
        questions: textQuestions,
        currentIndex: 1,
      });
      renderQuizPage();

      const input = screen.getByPlaceholderText('解答を入力');
      input.focus();

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      expect(mockNextQuestion).not.toHaveBeenCalled();

      act(() => {
        const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        Object.defineProperty(imeEnter, 'isComposing', { value: true });
        window.dispatchEvent(imeEnter);
      });
      expect(mockNextQuestion).not.toHaveBeenCalled();
    });
  });

  describe('中断機能', () => {
    it('中断ボタンをクリックすると確認ダイアログが表示される', async () => {
      setupSessionState();
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByRole('button', { name: '中断' }));
      expect(
        screen.getByText('クイズを中断しますか？回答済みの問題は保存されています。'),
      ).toBeInTheDocument();
    });

    it('確認ダイアログで「中断する」をクリックするとホームに遷移する', async () => {
      setupSessionState();
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByRole('button', { name: '中断' }));
      await user.click(screen.getByRole('button', { name: '中断する' }));

      expect(mockResetSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('確認ダイアログで「キャンセル」をクリックするとクイズを続行する', async () => {
      setupSessionState();
      const user = userEvent.setup();
      renderQuizPage();

      await user.click(screen.getByRole('button', { name: '中断' }));
      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
