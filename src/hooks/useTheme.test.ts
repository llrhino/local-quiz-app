import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useTheme } from './useTheme';
import { useAppSettingsStore } from '../stores/appSettingsStore';

describe('useTheme', () => {
  afterEach(() => {
    useAppSettingsStore.setState({ theme: 'light' });
    document.documentElement.classList.remove('dark');
  });

  it('テーマが light のとき html 要素に dark クラスがない', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('テーマを dark に切り替えると html 要素に dark クラスが付く', () => {
    renderHook(() => useTheme());

    act(() => {
      useAppSettingsStore.getState().setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('テーマを light に戻すと dark クラスが外れる', () => {
    useAppSettingsStore.setState({ theme: 'dark' });
    renderHook(() => useTheme());

    act(() => {
      useAppSettingsStore.getState().setTheme('light');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
