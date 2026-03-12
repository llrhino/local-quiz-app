import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TrueFalseQuestion as TFQType } from '../../lib/types';
import TrueFalseQuestion from './TrueFalseQuestion';

const question: TFQType = {
  id: 'q1',
  type: 'true_false',
  question: 'TypeScriptはJavaScriptのスーパーセットである',
  answer: true,
};

describe('TrueFalseQuestion', () => {
  it('問題文と○/×ボタンを表示する', () => {
    render(<TrueFalseQuestion question={question} onAnswer={vi.fn()} />);
    expect(
      screen.getByText('TypeScriptはJavaScriptのスーパーセットである'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '○' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
  });

  it('○ボタンをクリックするとonAnswerが"true"で呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: '○' }));
    expect(onAnswer).toHaveBeenCalledWith('true');
  });

  it('×ボタンをクリックするとonAnswerが"false"で呼ばれる', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: '×' }));
    expect(onAnswer).toHaveBeenCalledWith('false');
  });

  it('disabled時はボタンをクリックしてもonAnswerが呼ばれない', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <TrueFalseQuestion question={question} onAnswer={onAnswer} disabled />,
    );

    await user.click(screen.getByRole('button', { name: '○' }));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
