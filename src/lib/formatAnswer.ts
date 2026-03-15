import type { Choice, Question, QuestionType } from './types';

/**
 * 内部的な回答値を表示用の文字列に変換する
 */
export function formatDisplayAnswer(question: Question, rawAnswer: string): string {
  switch (question.type) {
    case 'true_false':
      return rawAnswer === 'true' ? '〇' : '×';
    case 'multiple_choice': {
      const index = Number(rawAnswer);
      const choice = question.choices[index];
      return choice ? choice.text : rawAnswer;
    }
    case 'text_input':
      return rawAnswer;
    case 'multi_select':
      return rawAnswer
        .split(',')
        .map((idx) => {
          const i = Number(idx.trim());
          const choice = question.choices[i];
          return choice ? choice.text : idx.trim();
        })
        .join(', ');
  }
}

/**
 * WeakQuestion の生データを表示用文字列に変換する
 */
export function formatWeakQuestionAnswer(
  questionType: QuestionType,
  choicesJson: string | null,
  rawAnswer: string,
): string {
  const choices: Choice[] = choicesJson ? JSON.parse(choicesJson) : [];
  switch (questionType) {
    case 'true_false':
      return rawAnswer === 'true' ? '〇' : '×';
    case 'multiple_choice': {
      const index = Number(rawAnswer);
      const choice = choices[index];
      return choice ? choice.text : rawAnswer;
    }
    case 'text_input':
      return rawAnswer;
    case 'multi_select':
      return rawAnswer
        .split(',')
        .map((idx) => {
          const i = Number(idx.trim());
          const choice = choices[i];
          return choice ? choice.text : idx.trim();
        })
        .join(', ');
  }
}
