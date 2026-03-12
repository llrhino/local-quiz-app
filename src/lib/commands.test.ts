import { vi, describe, it, expect, beforeEach } from 'vitest';

// @tauri-apps/api/core のモック
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  importQuizPack,
  listQuizPacks,
  getQuizPack,
  deleteQuizPack,
  getQuestionsByPack,
  saveAnswerRecord,
  getLearningHistory,
  getPackStatistics,
  getWeakQuestions,
  getSettings,
  updateSetting,
  openFileDialog,
} from './commands';
import type { AnswerRecord } from './types';

const mockInvoke = vi.mocked(invoke);

describe('commands.ts Tauriコマンドラッパー', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe('クイズパック管理', () => {
    it('importQuizPack は import_quiz_pack を filePath 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue({ id: 'pack-1', name: 'テスト' });
      await importQuizPack('/path/to/pack.json');
      expect(mockInvoke).toHaveBeenCalledWith('import_quiz_pack', {
        filePath: '/path/to/pack.json',
      });
    });

    it('listQuizPacks は list_quiz_packs を引数なしで呼ぶ', async () => {
      mockInvoke.mockResolvedValue([]);
      await listQuizPacks();
      expect(mockInvoke).toHaveBeenCalledWith('list_quiz_packs');
    });

    it('getQuizPack は get_quiz_pack を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue({ id: 'pack-1' });
      await getQuizPack('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('get_quiz_pack', {
        packId: 'pack-1',
      });
    });

    it('deleteQuizPack は delete_quiz_pack を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await deleteQuizPack('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('delete_quiz_pack', {
        packId: 'pack-1',
      });
    });
  });

  describe('クイズ問題取得', () => {
    it('getQuestionsByPack は get_questions_by_pack を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue([]);
      await getQuestionsByPack('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('get_questions_by_pack', {
        packId: 'pack-1',
      });
    });
  });

  describe('学習履歴', () => {
    it('saveAnswerRecord は save_answer_record を record 引数で呼ぶ', async () => {
      const record: AnswerRecord = {
        packId: 'pack-1',
        questionId: 'q1',
        isCorrect: true,
        userAnswer: 'a',
        answeredAt: '2026-03-12T00:00:00Z',
      };
      mockInvoke.mockResolvedValue(undefined);
      await saveAnswerRecord(record);
      expect(mockInvoke).toHaveBeenCalledWith('save_answer_record', {
        record,
      });
    });

    it('getLearningHistory は get_learning_history を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue([]);
      await getLearningHistory('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('get_learning_history', {
        packId: 'pack-1',
      });
    });

    it('getPackStatistics は get_pack_statistics を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue({});
      await getPackStatistics('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('get_pack_statistics', {
        packId: 'pack-1',
      });
    });

    it('getWeakQuestions は get_weak_questions を packId 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue([]);
      await getWeakQuestions('pack-1');
      expect(mockInvoke).toHaveBeenCalledWith('get_weak_questions', {
        packId: 'pack-1',
      });
    });
  });

  describe('アプリ設定', () => {
    it('getSettings は get_settings を引数なしで呼ぶ', async () => {
      mockInvoke.mockResolvedValue({ questionOrder: 'sequential', theme: 'light' });
      await getSettings();
      expect(mockInvoke).toHaveBeenCalledWith('get_settings');
    });

    it('updateSetting は update_setting を key, value 引数で呼ぶ', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await updateSetting('theme', 'light');
      expect(mockInvoke).toHaveBeenCalledWith('update_setting', {
        key: 'theme',
        value: 'light',
      });
    });
  });

  describe('ファイルダイアログ', () => {
    it('openFileDialog は open_file_dialog を引数なしで呼ぶ', async () => {
      mockInvoke.mockResolvedValue('/path/to/file.json');
      await openFileDialog();
      expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog');
    });
  });
});
