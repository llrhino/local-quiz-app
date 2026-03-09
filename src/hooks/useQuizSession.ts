import { create } from 'zustand';

import type { Question } from '../lib/types';

type QuizSessionState = {
  currentIndex: number;
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  reset: () => void;
};

export const useQuizSession = create<QuizSessionState>((set) => ({
  currentIndex: 0,
  questions: [],
  setQuestions: (questions) => set({ currentIndex: 0, questions }),
  reset: () => set({ currentIndex: 0, questions: [] }),
}));
