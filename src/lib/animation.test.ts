import { describe, it, expect } from 'vitest';

import { easeOut, interpolateCountUp } from './animation';

describe('easeOut', () => {
  it('t=0のとき0を返す', () => {
    expect(easeOut(0)).toBe(0);
  });

  it('t=1のとき1を返す', () => {
    expect(easeOut(1)).toBe(1);
  });

  it('t=0.5のとき0.5より大きい値を返す（ease-outの特性: 最初に速い）', () => {
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });

  it('前半の変化量が後半より大きい（ease-outの特性: 減速）', () => {
    const firstHalf = easeOut(0.5) - easeOut(0);
    const secondHalf = easeOut(1) - easeOut(0.5);
    expect(firstHalf).toBeGreaterThan(secondHalf);
  });
});

describe('interpolateCountUp', () => {
  it('progress=0のとき0を返す', () => {
    expect(interpolateCountUp(0, 85.0)).toBe(0);
  });

  it('progress=1のとき目標値を返す', () => {
    expect(interpolateCountUp(1, 85.0)).toBe(85.0);
  });

  it('progress=1のとき100.0を返す', () => {
    expect(interpolateCountUp(1, 100.0)).toBe(100.0);
  });

  it('中間のprogressで0と目標値の間の値を返す', () => {
    const result = interpolateCountUp(0.5, 80.0);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(80.0);
  });

  it('結果が小数第1位に丸められる', () => {
    const result = interpolateCountUp(0.3, 66.7);
    const decimalPart = result.toString().split('.')[1];
    expect(decimalPart === undefined || decimalPart.length <= 1).toBe(true);
  });
});
