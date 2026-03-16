import { vi, afterEach, describe, expect, it, beforeEach } from 'vitest';

vi.mock('../lib/commands', () => ({
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

import { getSettings, updateSetting } from '../lib/commands';
import { useAppSettingsStore } from './appSettingsStore';

const mockGetSettings = vi.mocked(getSettings);
const mockUpdateSetting = vi.mocked(updateSetting);

describe('appSettingsStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    useAppSettingsStore.setState({
      questionOrder: 'sequential',
      theme: 'light',
      shuffleChoices: false,
    });
  });

  it('デフォルトのテーマは light', () => {
    const { theme } = useAppSettingsStore.getState();
    expect(theme).toBe('light');
  });

  it('テーマを dark に変更できる', () => {
    useAppSettingsStore.getState().setTheme('dark');
    expect(useAppSettingsStore.getState().theme).toBe('dark');
  });

  it('テーマを light に戻せる', () => {
    useAppSettingsStore.getState().setTheme('dark');
    useAppSettingsStore.getState().setTheme('light');
    expect(useAppSettingsStore.getState().theme).toBe('light');
  });

  it('出題順を変更できる', () => {
    useAppSettingsStore.getState().setQuestionOrder('random');
    expect(useAppSettingsStore.getState().questionOrder).toBe('random');
  });

  describe('loadSettings', () => {
    it('バックエンドから設定を読み込んでストアに反映する', async () => {
      mockGetSettings.mockResolvedValue({
        questionOrder: 'random',
        theme: 'light',
        shuffleChoices: false,
      });

      await useAppSettingsStore.getState().loadSettings();

      const state = useAppSettingsStore.getState();
      expect(state.questionOrder).toBe('random');
      expect(mockGetSettings).toHaveBeenCalledOnce();
    });

    it('読み込み失敗時はデフォルト値を維持する', async () => {
      mockGetSettings.mockRejectedValue(new Error('DB error'));

      await useAppSettingsStore.getState().loadSettings();

      expect(useAppSettingsStore.getState().questionOrder).toBe('sequential');
    });
  });

  describe('saveSetting', () => {
    it('設定をバックエンドに保存してストアを更新する', async () => {
      mockUpdateSetting.mockResolvedValue(undefined);

      await useAppSettingsStore.getState().saveSetting('questionOrder', 'random');

      expect(mockUpdateSetting).toHaveBeenCalledWith('questionOrder', 'random');
      expect(useAppSettingsStore.getState().questionOrder).toBe('random');
    });

    it('テーマの保存もできる', async () => {
      mockUpdateSetting.mockResolvedValue(undefined);

      await useAppSettingsStore.getState().saveSetting('theme', 'dark');

      expect(mockUpdateSetting).toHaveBeenCalledWith('theme', 'dark');
      expect(useAppSettingsStore.getState().theme).toBe('dark');
    });

    it('保存失敗時はストアを更新しない', async () => {
      mockUpdateSetting.mockRejectedValue(new Error('DB error'));

      await expect(
        useAppSettingsStore.getState().saveSetting('questionOrder', 'random'),
      ).rejects.toThrow();

      expect(useAppSettingsStore.getState().questionOrder).toBe('sequential');
    });
  });
});
