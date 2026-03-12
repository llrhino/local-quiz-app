import { create } from 'zustand';

export type Theme = 'light' | 'dark';

type AppSettingsState = {
  questionOrder: 'sequential' | 'random';
  theme: Theme;
  setQuestionOrder: (questionOrder: 'sequential' | 'random') => void;
  setTheme: (theme: Theme) => void;
};

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  questionOrder: 'sequential',
  theme: 'light',
  setQuestionOrder: (questionOrder) => set({ questionOrder }),
  setTheme: (theme) => set({ theme }),
}));
