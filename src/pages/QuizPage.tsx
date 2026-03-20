import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AnswerFeedback from '../components/quiz/AnswerFeedback';
import QuestionRenderer from '../components/quiz/QuestionRenderer';
import QuizProgress from '../components/quiz/QuizProgress';
import QuizResult from '../components/quiz/QuizResult';
import QuizSummary from '../components/quiz/QuizSummary';
import { useQuizSession } from '../hooks/useQuizSession';
import { useQuizSessionActions } from '../hooks/useQuizSessionActions';
import { formatDisplayAnswer } from '../lib/formatAnswer';
import { shouldIgnoreGlobalShortcut } from '../lib/keyboard';

type AnswerResult = {
  isCorrect: boolean;
  userAnswer: string;
};

export default function QuizPage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { startQuiz, submitAndSave } = useQuizSessionActions();
  const { questions, currentIndex, answers, isCompleted, streak, resetSession, nextQuestion } =
    useQuizSession();

  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (packId) {
      startQuiz(packId).catch(() => {
        setLoadError(true);
      });
    }
  }, [packId, startQuiz]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!packId || answerResult) return;
      const result = await submitAndSave(packId, answer);
      setAnswerResult({ isCorrect: result.isCorrect, userAnswer: answer });
    },
    [packId, answerResult, submitAndSave],
  );

  const handleNext = useCallback(() => {
    setAnswerResult(null);
    nextQuestion();
  }, [nextQuestion]);

  // Enterキーで次の問題へ遷移
  useEffect(() => {
    if (!answerResult) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreGlobalShortcut(e)) {
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answerResult, handleNext]);

  const handleAbort = useCallback(() => {
    resetSession();
    navigate('/');
  }, [resetSession, navigate]);

  const handleRetry = useCallback(() => {
    if (!packId) return;
    setAnswerResult(null);
    startQuiz(packId);
  }, [packId, startQuiz]);

  const handleGoHome = useCallback(() => {
    resetSession();
    navigate('/');
  }, [resetSession, navigate]);

  // セッション完了画面
  if (isCompleted) {
    return (
      <QuizSummary
        questions={questions}
        answers={answers}
        onGoHome={handleGoHome}
        onRetry={handleRetry}
      />
    );
  }

  // 問題の読み込みに失敗した場合
  if (loadError) {
    return (
      <Card className="space-y-4">
        <p className="text-red-600 dark:text-red-400">問題の読み込みに失敗しました</p>
        <Button onClick={handleGoHome}>パック一覧に戻る</Button>
      </Card>
    );
  }

  // 問題がまだロードされていない場合
  if (!currentQuestion) {
    return (
      <Card>
        <p className="text-slate-600 dark:text-slate-400">読み込み中...</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <QuizProgress current={currentIndex + 1} total={questions.length} streak={streak} />
        <button
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 rounded"
          onClick={() => setShowAbortDialog(true)}
          type="button"
        >
          中断
        </button>
      </div>

      <div className="mt-4">
        <QuestionRenderer
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={answerResult !== null}
          answerResult={answerResult ?? undefined}
          correctAnswer={answerResult ? String(currentQuestion.answer) : undefined}
        />
      </div>

      {answerResult && (
        <div className="mt-4 space-y-4">
          <AnswerFeedback isCorrect={answerResult.isCorrect} />
          <QuizResult
            isCorrect={answerResult.isCorrect}
            correctAnswer={formatDisplayAnswer(currentQuestion, String(currentQuestion.answer))}
            userAnswer={formatDisplayAnswer(currentQuestion, answerResult.userAnswer)}
            explanation={currentQuestion.explanation}
          />
          <Button onClick={handleNext}>次の問題へ</Button>
        </div>
      )}

      <Modal
        isOpen={showAbortDialog}
        title="中断の確認"
        onClose={() => setShowAbortDialog(false)}
      >
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          クイズを中断しますか？回答済みの問題は保存されています。
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-full px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            onClick={() => setShowAbortDialog(false)}
            type="button"
          >
            キャンセル
          </button>
          <Button onClick={handleAbort}>中断する</Button>
        </div>
      </Modal>
    </Card>
  );
}
