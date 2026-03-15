import type { QuestionType } from './types';

type JudgeFunction = (userAnswer: string, correctAnswer: string) => boolean;

const judgeStrategies: Record<QuestionType, JudgeFunction> = {
  multiple_choice: (userAnswer, correctAnswer) => userAnswer === correctAnswer,
  true_false: (userAnswer, correctAnswer) => userAnswer === correctAnswer,
  text_input: (userAnswer, correctAnswer) =>
    userAnswer.trim() === correctAnswer.trim(),
  multi_select: (userAnswer, correctAnswer) => {
    const normalize = (s: string) => s.split(',').map((v) => v.trim()).sort().join(',');
    return normalize(userAnswer) === normalize(correctAnswer);
  },
};

export function judgeAnswer(
  questionType: string,
  userAnswer: string,
  correctAnswer: string,
): boolean {
  const strategy = judgeStrategies[questionType as QuestionType];
  if (!strategy) {
    throw new Error(`Unknown question type: ${questionType}`);
  }
  return strategy(userAnswer, correctAnswer);
}
