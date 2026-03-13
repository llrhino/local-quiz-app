import type { AnswerRecord } from './types';

/** セッション情報 */
export type Session = {
  startedAt: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
};

/** セッション間の最大間隔（ミリ秒）。これ以上の間隔がある場合は別セッションとみなす */
const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * 回答記録をセッションごとにグルーピングする。
 * 30分以上の間隔がある場合は別セッションとみなす。
 * 結果は新しい順（降順）で返す。
 */
export function groupIntoSessions(records: AnswerRecord[]): Session[] {
  if (records.length === 0) return [];

  // answeredAt の昇順でソート
  const sorted = [...records].sort(
    (a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime(),
  );

  const sessions: Session[] = [];
  let currentRecords: AnswerRecord[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].answeredAt).getTime();
    const curr = new Date(sorted[i].answeredAt).getTime();

    if (curr - prev > SESSION_GAP_MS) {
      sessions.push(buildSession(currentRecords));
      currentRecords = [sorted[i]];
    } else {
      currentRecords.push(sorted[i]);
    }
  }

  sessions.push(buildSession(currentRecords));

  // 新しい順で返す
  return sessions.reverse();
}

function buildSession(records: AnswerRecord[]): Session {
  const correctAnswers = records.filter((r) => r.isCorrect).length;
  return {
    startedAt: records[0].answeredAt,
    totalAnswers: records.length,
    correctAnswers,
    accuracyRate: correctAnswers / records.length,
  };
}
