import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { exportQuizPack, openSaveFileDialog, saveQuizPack } from '../lib/commands';
import type { Question, QuestionType } from '../lib/types';

const FIRST_HINT_STORAGE_KEY = 'quiz-editor-first-hint-dismissed';

type BaseEditorQuestion = {
  id: string;
  question: string;
  explanation: string;
};

type MultipleChoiceEditorQuestion = BaseEditorQuestion & {
  type: 'multiple_choice';
  choices: string[];
  answer?: number;
};

type MultiSelectEditorQuestion = BaseEditorQuestion & {
  type: 'multi_select';
  choices: string[];
  answer: number[];
};

type TrueFalseEditorQuestion = BaseEditorQuestion & {
  type: 'true_false';
  answer?: boolean;
};

type TextInputEditorQuestion = BaseEditorQuestion & {
  type: 'text_input';
  answer: string;
};

type EditorQuestion =
  | MultipleChoiceEditorQuestion
  | MultiSelectEditorQuestion
  | TrueFalseEditorQuestion
  | TextInputEditorQuestion;

type EditorQuestionErrors = {
  question?: string;
  choices?: string;
  answer?: string;
};

function createDefaultQuestion(id: string): EditorQuestion {
  return {
    id,
    type: 'multiple_choice',
    question: '',
    explanation: '',
    choices: ['', ''],
  };
}

function changeQuestionType(question: EditorQuestion, nextType: QuestionType): EditorQuestion {
  if (question.type === nextType) {
    return question;
  }

  const base = {
    id: question.id,
    question: question.question,
    explanation: question.explanation,
  };

  if (nextType === 'multiple_choice') {
    const choices = 'choices' in question ? [...question.choices] : ['', ''];
    return {
      ...base,
      type: 'multiple_choice',
      choices: choices.length >= 2 ? choices : ['', ''],
    };
  }

  if (nextType === 'multi_select') {
    const choices = 'choices' in question ? [...question.choices] : ['', ''];
    return {
      ...base,
      type: 'multi_select',
      choices: choices.length >= 2 ? choices : ['', ''],
      answer: question.type === 'multi_select' ? [...question.answer] : [],
    };
  }

  if (nextType === 'true_false') {
    return {
      ...base,
      type: 'true_false',
      answer: question.type === 'true_false' ? question.answer : undefined,
    };
  }

  return {
    ...base,
    type: 'text_input',
    answer: question.type === 'text_input' ? question.answer : '',
  };
}

function validateQuestion(question: EditorQuestion): EditorQuestionErrors {
  const errors: EditorQuestionErrors = {};

  if (!question.question.trim()) {
    errors.question = '設問文を入力してください';
  }

  if (question.type === 'multiple_choice' || question.type === 'multi_select') {
    const filledChoices = question.choices.filter((choice) => choice.trim().length > 0);

    if (filledChoices.length < 2) {
      errors.choices = '少なくとも2つの選択肢を入力してください';
    }

    if (
      question.type === 'multiple_choice' &&
      (question.answer === undefined || !question.choices[question.answer]?.trim())
    ) {
      errors.answer = '正解を指定してください';
    }

    if (
      question.type === 'multi_select' &&
      (question.answer.length === 0 ||
        question.answer.some((index) => !question.choices[index]?.trim()))
    ) {
      errors.answer = '正解を1つ以上指定してください';
    }
  }

  if (question.type === 'true_false' && question.answer === undefined) {
    errors.answer = '正解を指定してください';
  }

  if (question.type === 'text_input' && !question.answer.trim()) {
    errors.answer = '正解テキストを入力してください';
  }

  return errors;
}

function hasQuestionErrors(errors: EditorQuestionErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function buildSaveQuestion(question: EditorQuestion): Question {
  if (question.type === 'multiple_choice') {
    return {
      id: question.id,
      type: 'multiple_choice',
      question: question.question.trim(),
      explanation: question.explanation,
      choices: question.choices
        .filter((choice) => choice.trim().length > 0)
        .map((choice) => ({ text: choice.trim() })),
      answer: question.answer as number,
    };
  }

  if (question.type === 'multi_select') {
    return {
      id: question.id,
      type: 'multi_select',
      question: question.question.trim(),
      explanation: question.explanation,
      choices: question.choices
        .filter((choice) => choice.trim().length > 0)
        .map((choice) => ({ text: choice.trim() })),
      answer: question.answer,
    };
  }

  if (question.type === 'true_false') {
    return {
      id: question.id,
      type: 'true_false',
      question: question.question.trim(),
      explanation: question.explanation,
      answer: question.answer as boolean,
    };
  }

  return {
    id: question.id,
    type: 'text_input',
    question: question.question.trim(),
    explanation: question.explanation,
    answer: question.answer.trim(),
  };
}

export default function QuizEditorPage() {
  const { packId } = useParams();
  const isEditMode = Boolean(packId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<EditorQuestion[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedPackId, setSavedPackId] = useState<string | undefined>();
  const [savedPackName, setSavedPackName] = useState('');
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const questionSequence = useRef(0);
  const questionRefs = useRef<Record<string, HTMLElement | null>>({});

  const packNameError = submitted && !name.trim() ? 'パック名を入力してください' : undefined;
  const questionErrors = questions.map((question) => validateQuestion(question));

  useEffect(() => {
    if (!isEditMode && !localStorage.getItem(FIRST_HINT_STORAGE_KEY)) {
      setShowHint(true);
      localStorage.setItem(FIRST_HINT_STORAGE_KEY, 'true');
    }
  }, [isEditMode]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const markDirty = () => {
    setDirty(true);
    setNotification(null);
  };

  const addQuestion = () => {
    questionSequence.current += 1;
    setQuestions((current) => [...current, createDefaultQuestion(`q${questionSequence.current}`)]);
    markDirty();
  };

  const updateQuestion = (questionId: string, updater: (question: EditorQuestion) => EditorQuestion) => {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? updater(question) : question)),
    );
    markDirty();
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    markDirty();
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === questionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextQuestions = [...current];
      const [question] = nextQuestions.splice(index, 1);
      nextQuestions.splice(nextIndex, 0, question);
      return nextQuestions;
    });
    markDirty();
  };

  const handleLeave = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!dirty) {
      return;
    }

    const shouldLeave = window.confirm('未保存の変更があります。ページを離れますか？');
    if (!shouldLeave) {
      event.preventDefault();
    }
  };

  const handleSave = async () => {
    setSubmitted(true);
    setNotification(null);

    const firstErrorIndex = packNameError
      ? -1
      : questionErrors.findIndex((errors) => hasQuestionErrors(errors));

    if (packNameError || firstErrorIndex !== -1) {
      if (firstErrorIndex >= 0) {
        questionRefs.current[questions[firstErrorIndex]?.id]?.scrollIntoView?.({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    setSaving(true);
    try {
      const saved = await saveQuizPack({
        packId: undefined,
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        questions: questions.map((question) => buildSaveQuestion(question)),
      });
      setSavedPackId(saved.id);
      setSavedPackName(saved.name);
      setDirty(false);
      setNotification({ type: 'success', message: '保存しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      setNotification({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!savedPackId || dirty) {
      return;
    }

    setNotification(null);
    setExporting(true);
    try {
      const filePath = await openSaveFileDialog(`${savedPackName}.json`);
      if (!filePath) {
        return;
      }

      await exportQuizPack(savedPackId, filePath);
      setNotification({ type: 'success', message: 'エクスポートしました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'エクスポートに失敗しました';
      setNotification({ type: 'error', message });
    } finally {
      setExporting(false);
    }
  };

  const saveDisabled = isEditMode || saving || !dirty;
  const exportDisabled = isEditMode || exporting || !savedPackId || dirty;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-6 py-6 dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.3em] text-sky-700 dark:text-sky-300">
                PACK EDITOR
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
                  {isEditMode ? 'クイズパック編集' : 'クイズパック作成'}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {isEditMode
                    ? '編集モードは次の issue で実装します。新規作成モードのUIと保存フローのみ利用できます。'
                    : 'カードごとに問題タイプを切り替えながら、手動保存でクイズパックを組み立てます。'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {dirty && (
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white shadow-sm shadow-amber-500/30">
                    ● 未保存の変更あり
                  </span>
                )}
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  パックIDは保存時に自動生成されます
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                onClick={handleLeave}
                to="/"
              >
                戻る
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:border-slate-700 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                disabled={exportDisabled}
                onClick={() => void handleExport()}
                type="button"
              >
                {exporting ? 'エクスポート中...' : 'エクスポート'}
              </button>
              <Button disabled={saveDisabled} onClick={() => void handleSave()}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          {showHint && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              このエディタは手動保存です。編集後は [保存] ボタンを押してください
            </div>
          )}

          {notification && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                notification.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {notification.message}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>パック名</span>
              <input
                className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-slate-50 ${
                  packNameError
                    ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40'
                    : 'border-slate-200 bg-white dark:border-slate-700'
                }`}
                onChange={(event) => {
                  setName(event.target.value);
                  markDirty();
                }}
                value={name}
              />
              {packNameError && <span className="text-sm text-red-600 dark:text-red-400">{packNameError}</span>}
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>説明</span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                onChange={(event) => {
                  setDescription(event.target.value);
                  markDirty();
                }}
                value={description}
              />
            </label>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const errors = questionErrors[index];
          const cardHasErrors = submitted && hasQuestionErrors(errors);

          return (
            <div
              key={question.id}
              ref={(element: HTMLDivElement | null) => {
                questionRefs.current[question.id] = element;
              }}
            >
              <Card
                className={`space-y-5 border-2 ${
                  cardHasErrors
                    ? 'border-red-300 bg-red-50/40 dark:border-red-700 dark:bg-red-950/20'
                    : 'border-white/70'
                }`}
                data-testid={`question-card-${question.id}`}
              >
              <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    QUESTION {index + 1}
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">設問カード</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    aria-label="上へ移動"
                    className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    disabled={index === 0}
                    onClick={() => moveQuestion(question.id, -1)}
                    type="button"
                  >
                    ▲
                  </button>
                  <button
                    aria-label="下へ移動"
                    className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    disabled={index === questions.length - 1}
                    onClick={() => moveQuestion(question.id, 1)}
                    type="button"
                  >
                    ▼
                  </button>
                  <button
                    aria-label="削除"
                    className="rounded-full border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
                    onClick={() => removeQuestion(question.id)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>問題タイプ</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    onChange={(event) =>
                      updateQuestion(question.id, (current) =>
                        changeQuestionType(current, event.target.value as QuestionType),
                      )}
                    value={question.type}
                  >
                    <option value="multiple_choice">multiple_choice</option>
                    <option value="multi_select">multi_select</option>
                    <option value="true_false">true_false</option>
                    <option value="text_input">text_input</option>
                  </select>
                </label>

                <div className="grid gap-4">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>設問文</span>
                    <textarea
                      className={`min-h-24 w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-slate-50 ${
                        cardHasErrors && errors.question
                          ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40'
                          : 'border-slate-200 bg-white dark:border-slate-700'
                      }`}
                      onChange={(event) =>
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          question: event.target.value,
                        }))
                      }
                      value={question.question}
                    />
                    {cardHasErrors && errors.question && (
                      <span className="text-sm text-red-600 dark:text-red-400">{errors.question}</span>
                    )}
                  </label>

                  {(question.type === 'multiple_choice' || question.type === 'multi_select') && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">選択肢</p>
                      {question.choices.map((choice, choiceIndex) => (
                        <div className="flex items-center gap-3" key={`${question.id}-${choiceIndex}`}>
                          <input
                            aria-label={
                              question.type === 'multiple_choice'
                                ? `正解 ${choiceIndex + 1}`
                                : `複数正解 ${choiceIndex + 1}`
                            }
                            checked={
                              question.type === 'multiple_choice'
                                ? question.answer === choiceIndex
                                : question.answer.includes(choiceIndex)
                            }
                            className="h-4 w-4 accent-sky-500"
                            name={`${question.id}-answer`}
                            onChange={() =>
                              updateQuestion(question.id, (current) => {
                                if (current.type === 'multiple_choice') {
                                  return { ...current, answer: choiceIndex };
                                }

                                if (current.type === 'multi_select') {
                                  const selected = current.answer.includes(choiceIndex)
                                    ? current.answer.filter((index) => index !== choiceIndex)
                                    : [...current.answer, choiceIndex].sort((a, b) => a - b);
                                  return { ...current, answer: selected };
                                }

                                return current;
                              })
                            }
                            type={question.type === 'multiple_choice' ? 'radio' : 'checkbox'}
                          />
                          <label className="w-full space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span className="sr-only">{`選択肢 ${choiceIndex + 1}`}</span>
                            <input
                              aria-label={`選択肢 ${choiceIndex + 1}`}
                              className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-slate-50 ${
                                cardHasErrors && errors.choices
                                  ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40'
                                  : 'border-slate-200 bg-white dark:border-slate-700'
                              }`}
                              onChange={(event) =>
                                updateQuestion(question.id, (current) => {
                                  if (current.type !== 'multiple_choice' && current.type !== 'multi_select') {
                                    return current;
                                  }

                                  const nextChoices = [...current.choices];
                                  nextChoices[choiceIndex] = event.target.value;
                                  return { ...current, choices: nextChoices };
                                })
                              }
                              value={choice}
                            />
                          </label>
                          <button
                            aria-label={`この選択肢を削除 ${choiceIndex + 1}`}
                            className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            disabled={question.choices.length <= 2}
                            onClick={() =>
                              updateQuestion(question.id, (current) => {
                                if (current.type !== 'multiple_choice' && current.type !== 'multi_select') {
                                  return current;
                                }

                                const nextChoices = current.choices.filter((_, index) => index !== choiceIndex);
                                if (current.type === 'multiple_choice') {
                                  const nextAnswer =
                                    current.answer === choiceIndex
                                      ? undefined
                                      : current.answer !== undefined && current.answer > choiceIndex
                                        ? current.answer - 1
                                        : current.answer;
                                  return { ...current, choices: nextChoices, answer: nextAnswer };
                                }

                                return {
                                  ...current,
                                  choices: nextChoices,
                                  answer: current.answer
                                    .filter((index) => index !== choiceIndex)
                                    .map((index) => (index > choiceIndex ? index - 1 : index)),
                                };
                              })
                            }
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {cardHasErrors && errors.choices && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.choices}</p>
                      )}
                      {cardHasErrors && errors.answer && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.answer}</p>
                      )}

                      <button
                        className="inline-flex items-center rounded-full border border-dashed border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-950/30"
                        onClick={() =>
                          updateQuestion(question.id, (current) => {
                            if (current.type !== 'multiple_choice' && current.type !== 'multi_select') {
                              return current;
                            }

                            return { ...current, choices: [...current.choices, ''] };
                          })
                        }
                        type="button"
                      >
                        選択肢を追加
                      </button>
                    </div>
                  )}

                  {question.type === 'true_false' && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">正解</p>
                      <div className="flex flex-wrap gap-4">
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          <input
                            checked={question.answer === true}
                            className="accent-sky-500"
                            onChange={() =>
                              updateQuestion(question.id, (current) =>
                                current.type === 'true_false' ? { ...current, answer: true } : current,
                              )
                            }
                            type="radio"
                          />
                          正しい
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          <input
                            checked={question.answer === false}
                            className="accent-sky-500"
                            onChange={() =>
                              updateQuestion(question.id, (current) =>
                                current.type === 'true_false' ? { ...current, answer: false } : current,
                              )
                            }
                            type="radio"
                          />
                          誤り
                        </label>
                      </div>
                      {cardHasErrors && errors.answer && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.answer}</p>
                      )}
                    </div>
                  )}

                  {question.type === 'text_input' && (
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>正解テキスト</span>
                      <input
                        className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-slate-50 ${
                          cardHasErrors && errors.answer
                            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40'
                            : 'border-slate-200 bg-white dark:border-slate-700'
                        }`}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) =>
                            current.type === 'text_input'
                              ? { ...current, answer: event.target.value }
                              : current,
                          )
                        }
                        value={question.answer}
                      />
                      {cardHasErrors && errors.answer && (
                        <span className="text-sm text-red-600 dark:text-red-400">{errors.answer}</span>
                      )}
                    </label>
                  )}

                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>解説</span>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      onChange={(event) =>
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          explanation: event.target.value,
                        }))
                      }
                      value={question.explanation}
                    />
                  </label>
                </div>
              </div>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          className="inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/75 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/75 dark:text-slate-200 dark:hover:bg-slate-700"
          disabled={isEditMode}
          onClick={addQuestion}
          type="button"
        >
          設問を追加
        </button>
      </div>
    </div>
  );
}
