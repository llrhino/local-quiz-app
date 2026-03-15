import { describe, it, expect } from 'vitest';

import type { MultipleChoiceQuestion, TrueFalseQuestion, TextInputQuestion, MultiSelectQuestion } from './types';
import { formatDisplayAnswer } from './formatAnswer';

describe('formatDisplayAnswer', () => {
  describe('〇×問題', () => {
    const question: TrueFalseQuestion = {
      id: 'q1',
      type: 'true_false',
      question: '地球は丸い',
      answer: true,
    };

    it('"true" を "〇" に変換する', () => {
      expect(formatDisplayAnswer(question, 'true')).toBe('〇');
    });

    it('"false" を "×" に変換する', () => {
      expect(formatDisplayAnswer(question, 'false')).toBe('×');
    });
  });

  describe('選択問題', () => {
    const question: MultipleChoiceQuestion = {
      id: 'q2',
      type: 'multiple_choice',
      question: '1+1は？',
      choices: [
        { text: '1' },
        { text: '2' },
        { text: '3' },
      ],
      answer: 1,
    };

    it('選択肢インデックスを選択肢テキストに変換する', () => {
      expect(formatDisplayAnswer(question, '1')).toBe('2');
    });

    it('不正解の選択肢インデックスもテキストに変換する', () => {
      expect(formatDisplayAnswer(question, '0')).toBe('1');
    });

    it('範囲外のインデックスの場合はそのまま返す', () => {
      expect(formatDisplayAnswer(question, '99')).toBe('99');
    });
  });

  describe('テキスト入力問題', () => {
    const question: TextInputQuestion = {
      id: 'q3',
      type: 'text_input',
      question: '日本の首都は？',
      answer: '東京',
    };

    it('テキストをそのまま返す', () => {
      expect(formatDisplayAnswer(question, '東京')).toBe('東京');
    });
  });

  describe('複数選択問題', () => {
    const question: MultiSelectQuestion = {
      id: 'q4',
      type: 'multi_select',
      question: '暗号化プロトコルはどれか？',
      choices: [
        { text: 'TLS' },
        { text: 'HTTP' },
        { text: 'IPsec' },
        { text: 'DNS' },
      ],
      answer: [0, 2],
    };

    it('複数のインデックスを選択肢テキストに変換する', () => {
      expect(formatDisplayAnswer(question, '0,2')).toBe('TLS, IPsec');
    });

    it('単一のインデックスを選択肢テキストに変換する', () => {
      expect(formatDisplayAnswer(question, '1')).toBe('HTTP');
    });

    it('範囲外のインデックスが含まれる場合はそのまま返す', () => {
      expect(formatDisplayAnswer(question, '0,99')).toBe('TLS, 99');
    });
  });
});
