export type QuestionType = 'multiple_choice' | 'true_false' | 'text_input';

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

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | TextInputQuestion;

export type QuizPack = {
  id: string;
  name: string;
  description?: string;
  importedAt: string;
  questions: Question[];
};

export type QuizPackSummary = {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  importedAt: string;
  lastStudiedAt?: string | null;
};

export type AnswerRecord = {
  packId: string;
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  answeredAt: string;
};

export type PackStatistics = {
  packId: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
};

export type WeakQuestion = {
  questionId: string;
  questionText: string;
  answerCount: number;
  accuracyRate: number;
  lastUserAnswer: string;
};

export type AppSettings = {
  questionOrder: 'sequential' | 'random';
  theme: 'light' | 'dark';
  shuffleChoices: boolean;
};
