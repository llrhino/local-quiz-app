import { create } from 'zustand';

import type { Question } from '../lib/types';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type QuizSessionState = {
  questions: Question[];
  currentIndex: number;
  answers: string[];
  isCompleted: boolean;
  streak: number;
  sessionId: string;
  startSession: (questions: Question[], shuffle?: boolean) => void;
  submitAnswer: (answer: string) => void;
  nextQuestion: () => void;
  resetSession: () => void;
  updateStreak: (isCorrect: boolean) => void;
};

const initialState = {
  questions: [] as Question[],
  currentIndex: 0,
  answers: [] as string[],
  isCompleted: false,
  streak: 0,
  sessionId: '',
};

export const useQuizSession = create<QuizSessionState>((set, get) => ({
  ...initialState,

  startSession: (questions, shuffle = false) =>
    set({
      questions: shuffle ? shuffleArray(questions) : [...questions],
      currentIndex: 0,
      answers: [],
      isCompleted: false,
      streak: 0,
      sessionId: crypto.randomUUID(),
    }),

  submitAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers, answer],
    })),

  nextQuestion: () => {
    const { currentIndex, questions, isCompleted } = get();
    if (isCompleted) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      set({ currentIndex: nextIndex, isCompleted: true });
    } else {
      set({ currentIndex: nextIndex });
    }
  },

  resetSession: () => set(initialState),

  updateStreak: (isCorrect) =>
    set((state) => ({
      streak: isCorrect ? state.streak + 1 : 0,
    })),
}));
