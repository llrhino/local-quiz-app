import type {
  QuestionType,
  Choice,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  TextInputQuestion,
  Question,
  QuizPack,
  QuizPackSummary,
  AnswerRecord,
  PackStatistics,
  WeakQuestion,
  AppSettings,
} from './types';

// 型の存在確認テスト（コンパイルが通ること自体がテスト）
describe('types.ts 型定義', () => {
  describe('QuestionType', () => {
    it('multiple_choice, true_false, text_input を受け付ける', () => {
      const types: QuestionType[] = ['multiple_choice', 'true_false', 'text_input'];
      expect(types).toHaveLength(3);
    });
  });

  describe('Choice', () => {
    it('id と text を持つ', () => {
      const choice: Choice = { id: 'a', text: '選択肢A' };
      expect(choice.id).toBe('a');
      expect(choice.text).toBe('選択肢A');
    });
  });

  describe('Question (union型)', () => {
    it('MultipleChoiceQuestion を作成できる', () => {
      const q: MultipleChoiceQuestion = {
        type: 'multiple_choice',
        id: 'q1',
        question: 'テスト問題',
        choices: [{ id: 'a', text: '選択肢A' }],
        answer: 'a',
      };
      expect(q.type).toBe('multiple_choice');
      expect(q.choices).toHaveLength(1);
    });

    it('TrueFalseQuestion を作成できる', () => {
      const q: TrueFalseQuestion = {
        type: 'true_false',
        id: 'q2',
        question: 'TLS問題',
        answer: true,
      };
      expect(q.type).toBe('true_false');
      expect(q.answer).toBe(true);
    });

    it('TextInputQuestion を作成できる', () => {
      const q: TextInputQuestion = {
        type: 'text_input',
        id: 'q3',
        question: '入力問題',
        answer: 'RSA',
      };
      expect(q.type).toBe('text_input');
      expect(q.answer).toBe('RSA');
    });

    it('Question union型で各タイプを格納できる', () => {
      const questions: Question[] = [
        {
          type: 'multiple_choice',
          id: 'q1',
          question: '問題1',
          choices: [{ id: 'a', text: 'A' }],
          answer: 'a',
        },
        {
          type: 'true_false',
          id: 'q2',
          question: '問題2',
          answer: false,
        },
        {
          type: 'text_input',
          id: 'q3',
          question: '問題3',
          answer: 'テスト',
        },
      ];
      expect(questions).toHaveLength(3);
    });

    it('explanation はオプショナル', () => {
      const withExplanation: Question = {
        type: 'true_false',
        id: 'q1',
        question: '問題',
        answer: true,
        explanation: '解説文',
      };
      const withoutExplanation: Question = {
        type: 'true_false',
        id: 'q2',
        question: '問題',
        answer: false,
      };
      expect(withExplanation.explanation).toBe('解説文');
      expect(withoutExplanation.explanation).toBeUndefined();
    });
  });

  describe('QuizPack', () => {
    it('id, name, importedAt, questions を持つ', () => {
      const pack: QuizPack = {
        id: 'pack-1',
        name: 'テストパック',
        importedAt: '2026-03-12T00:00:00Z',
        questions: [],
      };
      expect(pack.id).toBe('pack-1');
      expect(pack.description).toBeUndefined();
    });

    it('description はオプショナル', () => {
      const pack: QuizPack = {
        id: 'pack-1',
        name: 'テストパック',
        description: '説明文',
        importedAt: '2026-03-12T00:00:00Z',
        questions: [],
      };
      expect(pack.description).toBe('説明文');
    });
  });

  describe('QuizPackSummary', () => {
    it('questionCount と lastStudiedAt を持つ', () => {
      const summary: QuizPackSummary = {
        id: 'pack-1',
        name: 'テストパック',
        questionCount: 10,
        importedAt: '2026-03-12T00:00:00Z',
      };
      expect(summary.questionCount).toBe(10);
      expect(summary.lastStudiedAt).toBeUndefined();
    });

    it('lastStudiedAt は null を受け付ける', () => {
      const summary: QuizPackSummary = {
        id: 'pack-1',
        name: 'テストパック',
        questionCount: 5,
        importedAt: '2026-03-12T00:00:00Z',
        lastStudiedAt: null,
      };
      expect(summary.lastStudiedAt).toBeNull();
    });
  });

  describe('AnswerRecord', () => {
    it('回答記録の全フィールドを持つ', () => {
      const record: AnswerRecord = {
        packId: 'pack-1',
        questionId: 'q1',
        isCorrect: true,
        userAnswer: 'a',
        answeredAt: '2026-03-12T00:00:00Z',
      };
      expect(record.packId).toBe('pack-1');
      expect(record.isCorrect).toBe(true);
    });
  });

  describe('PackStatistics', () => {
    it('統計情報の全フィールドを持つ', () => {
      const stats: PackStatistics = {
        packId: 'pack-1',
        totalAnswers: 100,
        correctAnswers: 80,
        accuracyRate: 0.8,
      };
      expect(stats.accuracyRate).toBe(0.8);
    });
  });

  describe('WeakQuestion', () => {
    it('弱点問題の全フィールドを持つ', () => {
      const weak: WeakQuestion = {
        questionId: 'q1',
        questionText: 'テスト問題',
        answerCount: 5,
        accuracyRate: 0.2,
        lastUserAnswer: 'b',
      };
      expect(weak.accuracyRate).toBe(0.2);
    });
  });

  describe('AppSettings', () => {
    it('questionOrder と theme を持つ', () => {
      const settings: AppSettings = {
        questionOrder: 'sequential',
        theme: 'light',
      };
      expect(settings.questionOrder).toBe('sequential');
    });

    it('questionOrder は random も受け付ける', () => {
      const settings: AppSettings = {
        questionOrder: 'random',
        theme: 'light',
      };
      expect(settings.questionOrder).toBe('random');
    });
  });
});
