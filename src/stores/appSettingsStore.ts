import { create } from 'zustand';

import { getSettings, updateSetting } from '../lib/commands';

export type Theme = 'light' | 'dark';

type AppSettingsState = {
  questionOrder: 'sequential' | 'random';
  theme: Theme;
  setQuestionOrder: (questionOrder: 'sequential' | 'random') => void;
  setTheme: (theme: Theme) => void;
  loadSettings: () => Promise<void>;
  saveSetting: (key: string, value: string) => Promise<void>;
};

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  questionOrder: 'sequential',
  theme: 'light',
  setQuestionOrder: (questionOrder) => set({ questionOrder }),
  setTheme: (theme) => set({ theme }),

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({
        questionOrder: settings.questionOrder,
        theme: settings.theme,
      });
    } catch {
      // 読み込み失敗時はデフォルト値を維持
    }
  },

  saveSetting: async (key, value) => {
    await updateSetting(key, value);
    set({ [key]: value });
  },
}));
