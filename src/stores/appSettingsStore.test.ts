import { afterEach, describe, expect, it } from 'vitest';

import { useAppSettingsStore } from './appSettingsStore';

describe('appSettingsStore', () => {
  afterEach(() => {
    // ストアをリセット
    useAppSettingsStore.setState({
      questionOrder: 'sequential',
      theme: 'light',
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
});
