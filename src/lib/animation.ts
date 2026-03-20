/** ease-out関数: 1 - (1 - t)^2 */
export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** カウントアップの補間値を計算する（小数第1位に丸め） */
export function interpolateCountUp(progress: number, target: number): number {
  const eased = easeOut(progress);
  const value = eased * target;
  return Math.round(value * 10) / 10;
}
