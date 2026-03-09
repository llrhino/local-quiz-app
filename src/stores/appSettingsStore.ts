import { create } from 'zustand';

type AppSettingsState = {
  questionOrder: 'sequential' | 'random';
  theme: 'light';
  setQuestionOrder: (questionOrder: 'sequential' | 'random') => void;
};

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  questionOrder: 'sequential',
  theme: 'light',
  setQuestionOrder: (questionOrder) => set({ questionOrder }),
}));
