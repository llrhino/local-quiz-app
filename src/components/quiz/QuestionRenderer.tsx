import type { Question } from '../../lib/types';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TextInputQuestion from './TextInputQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';

type Props = {
  question: Question;
};

export default function QuestionRenderer({ question }: Props) {
  switch (question.type) {
    case 'multiple_choice':
      return <MultipleChoiceQuestion question={question} />;
    case 'true_false':
      return <TrueFalseQuestion question={question} />;
    case 'text_input':
      return <TextInputQuestion question={question} />;
    default:
      throw new Error(`Unknown question type: ${String(question satisfies never)}`);
  }
}
