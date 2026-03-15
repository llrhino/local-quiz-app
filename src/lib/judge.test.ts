import { describe, expect, it } from 'vitest';
import { judgeAnswer } from './judge';

describe('judgeAnswer', () => {
  describe('multiple_choice', () => {
    it('選択肢インデックスが一致する場合、正解と判定する', () => {
      expect(judgeAnswer('multiple_choice', '0', '0')).toBe(true);
    });

    it('選択肢インデックスが一致しない場合、不正解と判定する', () => {
      expect(judgeAnswer('multiple_choice', '0', '1')).toBe(false);
    });
  });

  describe('true_false', () => {
    it('回答が一致する場合、正解と判定する', () => {
      expect(judgeAnswer('true_false', 'true', 'true')).toBe(true);
    });

    it('回答が一致しない場合、不正解と判定する', () => {
      expect(judgeAnswer('true_false', 'true', 'false')).toBe(false);
    });
  });

  describe('text_input', () => {
    it('回答が完全一致する場合、正解と判定する', () => {
      expect(judgeAnswer('text_input', '東京', '東京')).toBe(true);
    });

    it('回答が一致しない場合、不正解と判定する', () => {
      expect(judgeAnswer('text_input', '大阪', '東京')).toBe(false);
    });

    it('前後の空白を除去して判定する', () => {
      expect(judgeAnswer('text_input', '  東京  ', '東京')).toBe(true);
    });

    it('正解側の前後の空白も除去して判定する', () => {
      expect(judgeAnswer('text_input', '東京', '  東京  ')).toBe(true);
    });

    it('大文字小文字を区別する', () => {
      expect(judgeAnswer('text_input', 'Tokyo', 'tokyo')).toBe(false);
    });
  });

  describe('multi_select', () => {
    it('選択肢インデックスが完全一致する場合、正解と判定する', () => {
      expect(judgeAnswer('multi_select', '0,2', '0,2')).toBe(true);
    });

    it('選択肢インデックスが一致しない場合、不正解と判定する', () => {
      expect(judgeAnswer('multi_select', '0,1', '0,2')).toBe(false);
    });

    it('部分一致は不正解と判定する', () => {
      expect(judgeAnswer('multi_select', '0', '0,2')).toBe(false);
    });

    it('順序が異なっても正解と判定する', () => {
      expect(judgeAnswer('multi_select', '2,0', '0,2')).toBe(true);
    });

    it('単一選択でも正解と判定する', () => {
      expect(judgeAnswer('multi_select', '1', '1')).toBe(true);
    });
  });

  describe('未知の問題タイプ', () => {
    it('未知の問題タイプの場合、エラーを投げる', () => {
      expect(() =>
        judgeAnswer('unknown_type' as never, 'a', 'a'),
      ).toThrow('Unknown question type: unknown_type');
    });
  });
});
