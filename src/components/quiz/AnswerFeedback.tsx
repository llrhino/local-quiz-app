import { useEffect, useState } from 'react';

import correctImage from '../../assets/correct.svg';
import incorrectImage from '../../assets/incorrect.svg';

const ANIMATION_DURATION_MS = 900;

type Props = {
  isCorrect: boolean;
};

export default function AnswerFeedback({ isCorrect }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, ANIMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-feedback-pop">
      <img
        src={isCorrect ? correctImage : incorrectImage}
        alt={isCorrect ? '正解' : '不正解'}
        className="h-32 w-32"
      />
    </div>
  );
}
