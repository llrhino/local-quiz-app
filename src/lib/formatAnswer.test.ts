import { describe, it, expect } from 'vitest';

import type { MultipleChoiceQuestion, TrueFalseQuestion, TextInputQuestion } from './types';
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
        { id: 'a', text: '1' },
        { id: 'b', text: '2' },
        { id: 'c', text: '3' },
      ],
      answer: 'b',
    };

    it('選択肢IDを選択肢テキストに変換する', () => {
      expect(formatDisplayAnswer(question, 'b')).toBe('2');
    });

    it('不正解の選択肢IDもテキストに変換する', () => {
      expect(formatDisplayAnswer(question, 'a')).toBe('1');
    });

    it('一致する選択肢がない場合はIDをそのまま返す', () => {
      expect(formatDisplayAnswer(question, 'z')).toBe('z');
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
});
