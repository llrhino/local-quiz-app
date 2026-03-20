import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Question } from '../../lib/types';
import QuizSummary from './QuizSummary';

const questions: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '1+1は？',
    choices: [
      { text: '1' },
      { text: '2' },
    ],
    answer: 1,
  },
  {
    id: 'q2',
    type: 'true_false',
    question: '地球は丸い',
    answer: true,
  },
  {
    id: 'q3',
    type: 'text_input',
    question: '日本の首都は？',
    answer: '東京',
  },
];

describe('QuizSummary', () => {
  const defaultProps = {
    questions,
    answers: ['1', 'true', '大阪'],
    onGoHome: vi.fn(),
    onRetry: vi.fn(),
  };

  it('「クイズ完了」の見出しを表示しない', () => {
    render(<QuizSummary {...defaultProps} />);
    expect(screen.queryByText('クイズ完了')).not.toBeInTheDocument();
  });

  it('総問題数・正解数・正答率を表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    // q1: b === b → 正解, q2: "true" === "true" → 正解, q3: "大阪" !== "東京" → 不正解
    expect(screen.getByText('3問中2問正解')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
  });

  it('全問正解の場合100%と表示する', () => {
    render(
      <QuizSummary
        {...defaultProps}
        answers={['1', 'true', '東京']}
      />,
    );
    expect(screen.getByText('3問中3問正解')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('回答一覧に各問題の正誤を表示する', () => {
    render(<QuizSummary {...defaultProps} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('○');
    expect(listItems[1]).toHaveTextContent('○');
    expect(listItems[2]).toHaveTextContent('×');
  });

  describe('回答一覧の情報拡充', () => {
    it('問題テキストを表示する', () => {
      render(<QuizSummary {...defaultProps} />);
      expect(screen.getByText('1+1は？')).toBeInTheDocument();
      expect(screen.getByText('地球は丸い')).toBeInTheDocument();
      expect(screen.getByText('日本の首都は？')).toBeInTheDocument();
    });

    it('30文字を超える問題テキストは先頭30文字+…で切り詰め、title属性に全文を設定する', () => {
      const longQuestion: Question = {
        id: 'long',
        type: 'text_input',
        question: 'これは30文字を超える非常に長い問題テキストです。ここまで表示されるかテストします。',
        answer: 'テスト',
      };
      render(
        <QuizSummary
          questions={[longQuestion]}
          answers={['テスト']}
          onGoHome={vi.fn()}
          onRetry={vi.fn()}
        />,
      );
      const truncated = 'これは30文字を超える非常に長い問題テキストです。ここまで表…';
      expect(screen.getByText(truncated)).toBeInTheDocument();
      expect(screen.getByText(truncated)).toHaveAttribute('title', longQuestion.question);
    });

    it('30文字以下の問題テキストはそのまま表示しtitle属性を設定しない', () => {
      render(<QuizSummary {...defaultProps} />);
      const questionText = screen.getByText('1+1は？');
      expect(questionText).not.toHaveAttribute('title');
    });

    it('ユーザーの回答をformatDisplayAnswerで変換して表示する', () => {
      render(<QuizSummary {...defaultProps} />);
      // q1: multiple_choice, answer='1' → choices[1].text = '2'
      expect(screen.getByText('回答: 2')).toBeInTheDocument();
      // q2: true_false, answer='true' → '〇'
      expect(screen.getByText('回答: 〇')).toBeInTheDocument();
      // q3: text_input, answer='大阪' → '大阪'
      expect(screen.getByText('回答: 大阪')).toBeInTheDocument();
    });

    it('不正解の場合のみ正解を表示する', () => {
      render(<QuizSummary {...defaultProps} />);
      // q3は不正解 → 正解「東京」が表示される
      expect(screen.getByText('正解: 東京')).toBeInTheDocument();
      // q1, q2は正解 → 「正解:」は1つだけ
      const correctAnswerTexts = screen.getAllByText(/^正解:/);
      expect(correctAnswerTexts).toHaveLength(1);
    });

    it('正解行に緑系のアクセントカラーが適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const listItems = screen.getAllByRole('listitem');
      // q1は正解
      expect(listItems[0].className).toContain('bg-green-50');
    });

    it('不正解行にニュートラルなグレーが適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const listItems = screen.getAllByRole('listitem');
      // q3は不正解
      expect(listItems[2].className).toContain('bg-slate-50');
    });
  });

  it('「パック一覧に戻る」ボタンでonGoHomeが呼ばれる', async () => {
    const onGoHome = vi.fn();
    const user = userEvent.setup();
    render(<QuizSummary {...defaultProps} onGoHome={onGoHome} />);

    await user.click(screen.getByRole('button', { name: 'パック一覧に戻る' }));
    expect(onGoHome).toHaveBeenCalledOnce();
  });

  it('「もう一度挑戦する」ボタンでonRetryが呼ばれる', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<QuizSummary {...defaultProps} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'もう一度挑戦する' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  describe('情報階層', () => {
    it('正答率ラベルがtext-xs・letter-spacing: 0.2emで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const label = screen.getByText('正答率');
      expect(label.className).toContain('text-xs');
      expect(label).toHaveStyle({ letterSpacing: '0.2em' });
    });

    it('正答率の数字がtext-7xl・font-bold・tabular-numsで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const rateElement = screen.getByText('66.7%');
      expect(rateElement.className).toContain('text-7xl');
      expect(rateElement.className).toContain('font-bold');
      expect(rateElement.className).toContain('tabular-nums');
    });

    it('補助情報（N問中M問正解）がtext-baseで表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const subInfo = screen.getByText('3問中2問正解');
      expect(subInfo.className).toContain('text-base');
    });
  });

  describe('回答一覧の折りたたみ', () => {
    it('10問以下の場合はデフォルト展開される', () => {
      render(<QuizSummary {...defaultProps} />);
      // 回答一覧が直接表示されている
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('11問以上の場合はデフォルト折りたたみで「回答の詳細を見る」ボタンが表示される', () => {
      // 11問を生成
      const manyQuestions: Question[] = Array.from({ length: 11 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      const manyAnswers = Array.from({ length: 11 }, () => 'true');

      render(
        <QuizSummary
          {...defaultProps}
          questions={manyQuestions}
          answers={manyAnswers}
        />,
      );

      // 折りたたみ状態なので回答一覧は非表示
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      // 展開ボタンが表示される
      expect(screen.getByText('回答の詳細を見る')).toBeInTheDocument();
    });

    it('11問以上で「回答の詳細を見る」をクリックすると展開される', async () => {
      const user = userEvent.setup();
      const manyQuestions: Question[] = Array.from({ length: 11 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      const manyAnswers = Array.from({ length: 11 }, () => 'true');

      render(
        <QuizSummary
          {...defaultProps}
          questions={manyQuestions}
          answers={manyAnswers}
        />,
      );

      await user.click(screen.getByText('回答の詳細を見る'));
      expect(screen.getAllByRole('listitem')).toHaveLength(11);
    });
  });

  describe('色分け', () => {
    it('正答率100%でグラデーション色を適用する', () => {
      render(
        <QuizSummary
          {...defaultProps}
          answers={['1', 'true', '東京']}
        />,
      );
      const rateElement = screen.getByText('100.0%');
      // グラデーション用のクラスを確認
      expect(rateElement.className).toContain('bg-gradient-to-r');
      expect(rateElement.className).toContain('from-emerald-500');
      expect(rateElement.className).toContain('to-teal-500');
      expect(rateElement.className).toContain('bg-clip-text');
      expect(rateElement.className).toContain('text-transparent');
    });

    it('正答率80-99%でemerald-600色を適用する', () => {
      // 5問中4問正解 = 80%
      const fiveQuestions: Question[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        type: 'true_false' as const,
        question: `問題${i + 1}`,
        answer: true,
      }));
      render(
        <QuizSummary
          {...defaultProps}
          questions={fiveQuestions}
          answers={['true', 'true', 'true', 'true', 'false']}
        />,
      );
      const rateElement = screen.getByText('80.0%');
      expect(rateElement.className).toContain('text-emerald-600');
    });

    it('正答率50-79%でamber-500色を適用する', () => {
      // 3問中2問正解 = 66.7%
      render(<QuizSummary {...defaultProps} />);
      const rateElement = screen.getByText('66.7%');
      expect(rateElement.className).toContain('text-amber-500');
    });

    it('正答率50%未満でsky-600色を適用する', () => {
      // 3問中0問正解 = 0%
      render(
        <QuizSummary
          {...defaultProps}
          answers={['0', 'false', '大阪']}
        />,
      );
      const rateElement = screen.getByText('0.0%');
      expect(rateElement.className).toContain('text-sky-600');
    });

    it('不正解の○×表示にニュートラルなグレーを適用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const incorrectMark = screen.getByLabelText('不正解');
      expect(incorrectMark.className).toContain('text-slate-500');
      expect(incorrectMark.className).not.toContain('text-red-500');
    });

    it('正解の○×表示に緑色を適用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const correctMarks = screen.getAllByLabelText('正解');
      expect(correctMarks[0].className).toContain('text-green-600');
    });
  });

  describe('ボタンの視覚的優先度', () => {
    it('「もう一度挑戦する」はプライマリスタイル（塗りつぶし）が適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const retryButton = screen.getByRole('button', { name: 'もう一度挑戦する' });
      expect(retryButton.className).toContain('bg-slate-900');
    });

    it('「パック一覧に戻る」はセカンダリスタイル（アウトライン）が適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const homeButton = screen.getByRole('button', { name: 'パック一覧に戻る' });
      expect(homeButton.className).toContain('border');
      expect(homeButton.className).not.toContain('bg-slate-900');
    });
  });

  describe('最大連続正解数の表示', () => {
    it('maxStreakが3以上の場合に「最大連続正解: N問」を表示する', () => {
      render(<QuizSummary {...defaultProps} maxStreak={3} />);
      expect(screen.getByText('最大連続正解: 3問')).toBeInTheDocument();
    });

    it('maxStreakが2以下の場合は表示しない', () => {
      render(<QuizSummary {...defaultProps} maxStreak={2} />);
      expect(screen.queryByText(/最大連続正解/)).not.toBeInTheDocument();
    });

    it('maxStreakが0の場合は表示しない', () => {
      render(<QuizSummary {...defaultProps} maxStreak={0} />);
      expect(screen.queryByText(/最大連続正解/)).not.toBeInTheDocument();
    });

    it('maxStreakが未指定の場合は表示しない', () => {
      render(<QuizSummary {...defaultProps} />);
      expect(screen.queryByText(/最大連続正解/)).not.toBeInTheDocument();
    });
  });

  describe('前回スコアとの比較表示', () => {
    it('previousBestAccuracyが指定され現在より低い場合「前回より+N%改善!」を表示する', () => {
      // 現在: 2/3 = 66.7%, 過去最高: 50%
      render(<QuizSummary {...defaultProps} previousBestAccuracy={0.5} />);
      expect(screen.getByText('前回より +16.7% 改善!')).toBeInTheDocument();
    });

    it('previousBestAccuracyが指定され現在と同じ場合は比較を表示しない', () => {
      // 現在: 2/3 ≈ 66.7%, 過去最高: 66.7%
      const accuracy = 2 / 3;
      render(<QuizSummary {...defaultProps} previousBestAccuracy={accuracy} />);
      expect(screen.queryByText(/改善/)).not.toBeInTheDocument();
    });

    it('previousBestAccuracyが指定され現在より高い場合は比較を表示しない', () => {
      // 現在: 2/3 ≈ 66.7%, 過去最高: 80%
      render(<QuizSummary {...defaultProps} previousBestAccuracy={0.8} />);
      expect(screen.queryByText(/改善/)).not.toBeInTheDocument();
    });

    it('previousBestAccuracyがnullの場合（初回挑戦）は比較を表示しない', () => {
      render(<QuizSummary {...defaultProps} previousBestAccuracy={null} />);
      expect(screen.queryByText(/改善/)).not.toBeInTheDocument();
    });

    it('previousBestAccuracyが未指定の場合は比較を表示しない', () => {
      render(<QuizSummary {...defaultProps} />);
      expect(screen.queryByText(/改善/)).not.toBeInTheDocument();
    });

    it('改善表示は補助情報セクション内に表示される', () => {
      render(<QuizSummary {...defaultProps} previousBestAccuracy={0.5} />);
      const improvementText = screen.getByText('前回より +16.7% 改善!');
      // 補助情報セクション（N問中M問正解の近く）に含まれる
      const section = screen.getByText('3問中2問正解').closest('div');
      expect(section).toContainElement(improvementText);
    });
  });

  describe('キーボード操作', () => {
    it('結果画面遷移時にプライマリCTA（もう一度挑戦する）にフォーカスが設定される', () => {
      render(<QuizSummary {...defaultProps} />);
      const retryButton = screen.getByRole('button', { name: 'もう一度挑戦する' });
      expect(retryButton).toHaveFocus();
    });
  });

  describe('100%時のPERFECT演出', () => {
    const perfectProps = {
      ...defaultProps,
      answers: ['1', 'true', '東京'],
    };

    it('正答率100%のとき「PERFECT」テキストが表示される', () => {
      render(<QuizSummary {...perfectProps} />);
      expect(screen.getByText('PERFECT')).toBeInTheDocument();
    });

    it('「PERFECT」テキストがtext-smで表示される', () => {
      render(<QuizSummary {...perfectProps} />);
      const perfect = screen.getByText('PERFECT');
      expect(perfect.className).toContain('text-sm');
    });

    it('トロフィーのSVGアイコンが表示される', () => {
      render(<QuizSummary {...perfectProps} />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('100%未満のとき「PERFECT」テキストが表示されない', () => {
      render(<QuizSummary {...defaultProps} />);
      expect(screen.queryByText('PERFECT')).not.toBeInTheDocument();
    });

    it('100%未満のときトロフィーアイコンが表示されない', () => {
      render(<QuizSummary {...defaultProps} />);
      const svg = document.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('スタガード登場アニメーション', () => {
    it('正答率セクションにアニメーションクラス（delay: 0ms）が適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const rateSection = screen.getByText('正答率').closest('div');
      expect(rateSection?.className).toContain('animate-stagger-in');
      expect(rateSection).toHaveStyle({ animationDelay: '0ms' });
    });

    it('補足テキストセクションにアニメーションクラス（delay: 200ms）が適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const subInfo = screen.getByText('3問中2問正解').closest('div');
      expect(subInfo?.className).toContain('animate-stagger-in');
      expect(subInfo).toHaveStyle({ animationDelay: '200ms' });
    });

    it('回答一覧セクションにアニメーションクラス（delay: 400ms）が適用される', () => {
      render(<QuizSummary {...defaultProps} />);
      const answersSection = screen.getByRole('heading', { level: 3, name: '回答一覧' }).closest('div');
      expect(answersSection?.className).toContain('animate-stagger-in');
      expect(answersSection).toHaveStyle({ animationDelay: '400ms' });
    });

    it('ボタンエリアにアニメーションクラスが適用されない', () => {
      render(<QuizSummary {...defaultProps} />);
      const retryButton = screen.getByRole('button', { name: 'もう一度挑戦する' });
      const buttonArea = retryButton.closest('div');
      expect(buttonArea?.className).not.toContain('animate-stagger-in');
    });
  });

  describe('アクセシビリティ', () => {
    it('正答率の数字にaria-labelが付与される', () => {
      render(<QuizSummary {...defaultProps} />);
      const rateElement = screen.getByLabelText('正答率 66.7パーセント');
      expect(rateElement).toBeInTheDocument();
    });

    it('正答率100%のaria-labelが正しい', () => {
      render(
        <QuizSummary
          {...defaultProps}
          answers={['1', 'true', '東京']}
        />,
      );
      const rateElement = screen.getByLabelText('正答率 100.0パーセント');
      expect(rateElement).toBeInTheDocument();
    });

    it('回答一覧の○にaria-label="正解"が付与される', () => {
      render(<QuizSummary {...defaultProps} />);
      const correctLabels = screen.getAllByLabelText('正解');
      expect(correctLabels).toHaveLength(2); // q1, q2が正解
    });

    it('回答一覧の×にaria-label="不正解"が付与される', () => {
      render(<QuizSummary {...defaultProps} />);
      const incorrectLabels = screen.getAllByLabelText('不正解');
      expect(incorrectLabels).toHaveLength(1); // q3が不正解
    });

    it('回答一覧の見出しがh3で表示される', () => {
      render(<QuizSummary {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3, name: '回答一覧' });
      expect(heading).toBeInTheDocument();
    });

    it('補助情報のテキストがコントラスト比4.5:1以上を確保する色を使用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const subInfo = screen.getByText('3問中2問正解');
      // ライトモードでslate-400(#94a3b8)はコントラスト不足、slate-500(#64748b)以上が必要
      // dark:プレフィックス付きはダークモード用なので除外して確認
      const lightClasses = subInfo.className.split(' ').filter(c => !c.startsWith('dark:'));
      expect(lightClasses).not.toContain('text-slate-400');
      expect(lightClasses).toContain('text-slate-500');
    });

    it('不正解マークのテキストがコントラスト比4.5:1以上を確保する色を使用する', () => {
      render(<QuizSummary {...defaultProps} />);
      const incorrectMark = screen.getByLabelText('不正解');
      // slate-400(#94a3b8)はコントラスト不足、slate-500(#64748b)以上が必要
      expect(incorrectMark.className).not.toContain('text-slate-400');
      expect(incorrectMark.className).toContain('text-slate-500');
    });
  });
});
