import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/commands', () => ({
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

import { updateSetting } from '../lib/commands';
import { useAppSettingsStore } from '../stores/appSettingsStore';
import SettingsPage from './SettingsPage';

const mockUpdateSetting = vi.mocked(updateSetting);

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateSetting.mockResolvedValue(undefined);
  });

  afterEach(() => {
    useAppSettingsStore.setState({
      questionOrder: 'sequential',
      theme: 'light',
      shuffleChoices: false,
    });
  });

  it('設定画面のタイトルが表示される', () => {
    renderSettingsPage();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('戻るボタンが表示され、ホームへのリンクになっている', () => {
    renderSettingsPage();
    const backLink = screen.getByRole('link', { name: '戻る' });
    expect(backLink).toHaveAttribute('href', '/');
  });

  describe('出題順の設定', () => {
    it('デフォルトで「定義順」が選択されている', () => {
      renderSettingsPage();
      const sequentialRadio = screen.getByRole('radio', { name: '定義順' });
      expect(sequentialRadio).toBeChecked();
    });

    it('「ランダム」を選択するとバックエンドに保存される', async () => {
      const user = userEvent.setup();
      renderSettingsPage();

      const randomRadio = screen.getByRole('radio', { name: 'ランダム' });
      await user.click(randomRadio);

      expect(mockUpdateSetting).toHaveBeenCalledWith('question_order', 'random');
    });

    it('「定義順」に戻すとバックエンドに保存される', async () => {
      useAppSettingsStore.setState({ questionOrder: 'random' });
      const user = userEvent.setup();
      renderSettingsPage();

      const sequentialRadio = screen.getByRole('radio', { name: '定義順' });
      await user.click(sequentialRadio);

      expect(mockUpdateSetting).toHaveBeenCalledWith('question_order', 'sequential');
    });
  });

  describe('テーマの設定', () => {
    it('デフォルトで「ライト」が選択されている', () => {
      renderSettingsPage();
      const lightRadio = screen.getByRole('radio', { name: 'ライト' });
      expect(lightRadio).toBeChecked();
    });

    it('「ダーク」を選択するとバックエンドに保存される', async () => {
      const user = userEvent.setup();
      renderSettingsPage();

      const darkRadio = screen.getByRole('radio', { name: 'ダーク' });
      await user.click(darkRadio);

      expect(mockUpdateSetting).toHaveBeenCalledWith('theme', 'dark');
    });

    it('「ライト」に戻すとバックエンドに保存される', async () => {
      useAppSettingsStore.setState({ theme: 'dark' });
      const user = userEvent.setup();
      renderSettingsPage();

      const lightRadio = screen.getByRole('radio', { name: 'ライト' });
      await user.click(lightRadio);

      expect(mockUpdateSetting).toHaveBeenCalledWith('theme', 'light');
    });

    it('テーマ変更後にストアの値が更新される', async () => {
      const user = userEvent.setup();
      renderSettingsPage();

      const darkRadio = screen.getByRole('radio', { name: 'ダーク' });
      await user.click(darkRadio);

      expect(useAppSettingsStore.getState().theme).toBe('dark');
    });
  });

  describe('選択肢シャッフルの設定', () => {
    it('デフォルトでチェックボックスがオフになっている', () => {
      renderSettingsPage();
      const checkbox = screen.getByRole('checkbox', { name: '選択肢をランダムに並べ替える' });
      expect(checkbox).not.toBeChecked();
    });

    it('チェックボックスをオンにするとバックエンドに保存される', async () => {
      const user = userEvent.setup();
      renderSettingsPage();

      const checkbox = screen.getByRole('checkbox', { name: '選択肢をランダムに並べ替える' });
      await user.click(checkbox);

      expect(mockUpdateSetting).toHaveBeenCalledWith('shuffle_choices', 'true');
    });

    it('チェックボックスをオフに戻すとバックエンドに保存される', async () => {
      useAppSettingsStore.setState({ shuffleChoices: true });
      const user = userEvent.setup();
      renderSettingsPage();

      const checkbox = screen.getByRole('checkbox', { name: '選択肢をランダムに並べ替える' });
      await user.click(checkbox);

      expect(mockUpdateSetting).toHaveBeenCalledWith('shuffle_choices', 'false');
    });

    it('変更後にストアの値が更新される', async () => {
      const user = userEvent.setup();
      renderSettingsPage();

      const checkbox = screen.getByRole('checkbox', { name: '選択肢をランダムに並べ替える' });
      await user.click(checkbox);

      expect(useAppSettingsStore.getState().shuffleChoices).toBe(true);
    });
  });
});
