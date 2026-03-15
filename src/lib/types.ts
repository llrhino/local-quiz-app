export type QuestionType = 'multiple_choice' | 'true_false' | 'text_input' | 'multi_select';

export type Choice = {
  text: string;
};

type QuestionBase = {
  id: string;
  question: string;
  explanation?: string;
};

export type MultipleChoiceQuestion = QuestionBase & {
  type: 'multiple_choice';
  choices: Choice[];
  answer: number;
};

export type TrueFalseQuestion = QuestionBase & {
  type: 'true_false';
  answer: boolean;
};

export type TextInputQuestion = QuestionBase & {
  type: 'text_input';
  answer: string;
};

export type MultiSelectQuestion = QuestionBase & {
  type: 'multi_select';
  choices: Choice[];
  answer: number[];
};

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | TextInputQuestion
  | MultiSelectQuestion;

export type SaveQuizPackInput = {
  packId?: string;
  name: string;
  description?: string;
  questions: Question[];
};

export type QuizPack = {
  id: string;
  name: string;
  description?: string;
  source: string;
  importedAt: string;
  updatedAt?: string | null;
  questions: Question[];
};

export type QuizPackSummary = {
  id: string;
  name: string;
  description?: string;
  source: string;
  questionCount: number;
  importedAt: string;
  updatedAt?: string | null;
  lastStudiedAt?: string | null;
  allCorrect: boolean;
};

export type AnswerRecord = {
  packId: string;
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  answeredAt: string;
  sessionId: string;
};

/** セッション単位の集計結果 */
export type Session = {
  sessionId: string;
  startedAt: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
};

export type PackStatistics = {
  packId: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  /** 弱点判定対象の問題数（回答2回以上の問題数） */
  weakEligibleCount: number;
};

export type WeakQuestion = {
  questionId: string;
  questionText: string;
  answerCount: number;
  accuracyRate: number;
  lastUserAnswer: string;
  questionType: QuestionType;
  correctAnswer: string;
  choicesJson: string | null;
  explanation: string | null;
  lastIsCorrect: boolean;
};

export type AppSettings = {
  questionOrder: 'sequential' | 'random';
  theme: 'light' | 'dark';
  shuffleChoices: boolean;
};
