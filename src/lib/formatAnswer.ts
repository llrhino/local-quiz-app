import type { Question } from './types';

/**
 * 内部的な回答値を表示用の文字列に変換する
 */
export function formatDisplayAnswer(question: Question, rawAnswer: string): string {
  switch (question.type) {
    case 'true_false':
      return rawAnswer === 'true' ? '〇' : '×';
    case 'multiple_choice': {
      const choice = question.choices.find((c) => c.id === rawAnswer);
      return choice ? choice.text : rawAnswer;
    }
    case 'text_input':
      return rawAnswer;
  }
}
