import type { QuestionType } from './types';

type JudgeFunction = (userAnswer: string, correctAnswer: string) => boolean;

const judgeStrategies: Record<QuestionType, JudgeFunction> = {
  multiple_choice: (userAnswer, correctAnswer) => userAnswer === correctAnswer,
  true_false: (userAnswer, correctAnswer) => userAnswer === correctAnswer,
  text_input: (userAnswer, correctAnswer) =>
    userAnswer.trim() === correctAnswer.trim(),
};

export function judgeAnswer(
  questionType: QuestionType,
  userAnswer: string,
  correctAnswer: string,
): boolean {
  return judgeStrategies[questionType](userAnswer, correctAnswer);
}
