import { describe, it, expect } from 'vitest';

import { groupIntoSessions } from './sessions';
import type { AnswerRecord } from './types';

function makeRecord(
  questionId: string,
  isCorrect: boolean,
  answeredAt: string,
): AnswerRecord {
  return {
    packId: 'pack-1',
    questionId,
    isCorrect,
    userAnswer: isCorrect ? 'correct' : 'wrong',
    answeredAt,
  };
}

describe('groupIntoSessions', () => {
  it('空の配列に対して空の配列を返す', () => {
    expect(groupIntoSessions([])).toEqual([]);
  });

  it('単一の回答を1セッションとしてグルーピングする', () => {
    const records = [makeRecord('q1', true, '2026-03-10T10:00:00Z')];
    const sessions = groupIntoSessions(records);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].startedAt).toBe('2026-03-10T10:00:00Z');
    expect(sessions[0].totalAnswers).toBe(1);
    expect(sessions[0].correctAnswers).toBe(1);
    expect(sessions[0].accuracyRate).toBe(1.0);
  });

  it('30分以内の回答を同一セッションにグルーピングする', () => {
    const records = [
      makeRecord('q1', true, '2026-03-10T10:00:00Z'),
      makeRecord('q2', false, '2026-03-10T10:05:00Z'),
      makeRecord('q3', true, '2026-03-10T10:10:00Z'),
    ];
    const sessions = groupIntoSessions(records);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].totalAnswers).toBe(3);
    expect(sessions[0].correctAnswers).toBe(2);
    expect(sessions[0].accuracyRate).toBeCloseTo(2 / 3);
  });

  it('30分以上の間隔がある場合は別セッションに分割する', () => {
    const records = [
      makeRecord('q1', true, '2026-03-10T10:00:00Z'),
      makeRecord('q2', true, '2026-03-10T10:05:00Z'),
      // 31分の間隔
      makeRecord('q3', false, '2026-03-10T10:36:00Z'),
    ];
    const sessions = groupIntoSessions(records);

    expect(sessions).toHaveLength(2);
    // 新しい順で返される
    expect(sessions[0].startedAt).toBe('2026-03-10T10:36:00Z');
    expect(sessions[0].totalAnswers).toBe(1);
    expect(sessions[0].correctAnswers).toBe(0);
    expect(sessions[1].startedAt).toBe('2026-03-10T10:00:00Z');
    expect(sessions[1].totalAnswers).toBe(2);
    expect(sessions[1].correctAnswers).toBe(2);
  });

  it('セッションは新しい順（降順）で返す', () => {
    const records = [
      makeRecord('q1', true, '2026-03-10T10:00:00Z'),
      makeRecord('q2', true, '2026-03-11T14:00:00Z'),
    ];
    const sessions = groupIntoSessions(records);

    expect(sessions).toHaveLength(2);
    expect(sessions[0].startedAt).toBe('2026-03-11T14:00:00Z');
    expect(sessions[1].startedAt).toBe('2026-03-10T10:00:00Z');
  });

  it('正答率を正しく計算する', () => {
    const records = [
      makeRecord('q1', true, '2026-03-10T10:00:00Z'),
      makeRecord('q2', false, '2026-03-10T10:01:00Z'),
      makeRecord('q3', false, '2026-03-10T10:02:00Z'),
      makeRecord('q4', true, '2026-03-10T10:03:00Z'),
    ];
    const sessions = groupIntoSessions(records);

    expect(sessions[0].accuracyRate).toBeCloseTo(0.5);
  });
});
