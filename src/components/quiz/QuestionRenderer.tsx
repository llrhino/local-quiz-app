import type { Question } from '../../lib/types';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TextInputQuestion from './TextInputQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';

type Props = {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

export default function QuestionRenderer({
  question,
  onAnswer,
  disabled,
}: Props) {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceQuestion
          question={question}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case 'true_false':
      return (
        <TrueFalseQuestion
          question={question}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case 'text_input':
      return (
        <TextInputQuestion
          question={question}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    default:
      throw new Error(`不明な問題タイプです: ${String(question satisfies never)}`);
  }
}
