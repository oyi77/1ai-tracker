import { describe, it, expect } from 'vitest';
import { SMA, EMA, RSI, MACD, BollingerBands } from '../technical-analysis';

function isNaN_(v: number): boolean {
  return Number.isNaN(v);
}

describe('SMA', () => {
  it('returns NaN-filled array when data length < period', () => {
    const result = SMA([1, 2], 3);
    expect(result).toHaveLength(2);
    expect(isNaN_(result[0])).toBe(true);
    expect(isNaN_(result[1])).toBe(true);
  });

  it('computes correct values for SMA([1,2,3,4,5], 3)', () => {
    const result = SMA([1, 2, 3, 4, 5], 3);
    expect(result).toHaveLength(5);
    // First period-1 entries are NaN
    expect(isNaN_(result[0])).toBe(true);
    expect(isNaN_(result[1])).toBe(true);
    // SMA at index 2: (1+2+3)/3 = 2
    expect(result[2]).toBe(2);
    // SMA at index 3: (2+3+4)/3 = 3
    expect(result[3]).toBe(3);
    // SMA at index 4: (3+4+5)/3 = 4
    expect(result[4]).toBe(4);
  });

  it('handles period === data length (single output value)', () => {
    const result = SMA([10, 20, 30], 3);
    expect(isNaN_(result[0])).toBe(true);
    expect(isNaN_(result[1])).toBe(true);
    expect(result[2]).toBe(20);
  });

  it('handles period of 1 (identity)', () => {
    const result = SMA([5, 10, 15], 1);
    expect(result).toEqual([5, 10, 15]);
  });
});

describe('EMA', () => {
  it('returns NaN-filled array when data length < period', () => {
    const result = EMA([1, 2], 3);
    expect(result).toHaveLength(2);
    expect(isNaN_(result[0])).toBe(true);
    expect(isNaN_(result[1])).toBe(true);
  });

  it('seeds with SMA and converges toward recent values', () => {
    const data = [10, 10, 10, 20, 20, 20, 20, 20];
    const result = EMA(data, 3);
    // Seed at index 2: SMA of first 3 = 10
    expect(result[2]).toBe(10);
    // After repeated 20s, EMA should approach 20
    const last = result[result.length - 1];
    expect(last).toBeGreaterThan(15);
    expect(last).toBeLessThanOrEqual(20);
  });

  it('EMA with period 1 equals the raw data', () => {
    const data = [3, 7, 5, 9];
    const result = EMA(data, 1);
    // k = 2/(1+1) = 1, so EMA[i] = data[i] * 1 + EMA[i-1] * 0
    expect(result[0]).toBeCloseTo(3);
    expect(result[1]).toBeCloseTo(7);
    expect(result[2]).toBeCloseTo(5);
    expect(result[3]).toBeCloseTo(9);
  });
});

describe('RSI', () => {
  it('returns NaN-filled array when data length < period + 1', () => {
    const result = RSI([1, 2, 3], 14);
    expect(result).toHaveLength(3);
    expect(result.every(isNaN_)).toBe(true);
  });

  it('returns 100 for monotonically increasing data (no losses)', () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = RSI(data, 14);
    // After warmup, RSI should be 100 (all gains, no losses)
    const last = result[result.length - 1];
    expect(last).toBe(100);
  });

  it('returns 0 for monotonically decreasing data (no gains)', () => {
    const data = Array.from({ length: 20 }, (_, i) => 20 - i);
    const result = RSI(data, 14);
    const last = result[result.length - 1];
    expect(last).toBe(0);
  });

  it('all computed RSI values are between 0 and 100', () => {
    const data = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
      46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];
    const result = RSI(data, 14);
    const computed = result.filter((v) => !isNaN_(v));
    expect(computed.length).toBeGreaterThan(0);
    for (const v of computed) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('MACD', () => {
  it('returns NaN for insufficient data', () => {
    const result = MACD([1, 2, 3], 12, 26, 9);
    // Not enough data for slow EMA (26), so all macdLine entries are NaN
    expect(result.macdLine.every(isNaN_)).toBe(true);
    expect(result.signalLine.every(isNaN_)).toBe(true);
    expect(result.histogram.every(isNaN_)).toBe(true);
  });

  it('output structure has macdLine, signalLine, histogram', () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const result = MACD(data);
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('signalLine');
    expect(result).toHaveProperty('histogram');
    expect(result.macdLine).toHaveLength(50);
    expect(result.signalLine).toHaveLength(50);
    expect(result.histogram).toHaveLength(50);
  });

  it('histogram = macdLine - signalLine where both are valid', () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const result = MACD(data);
    for (let i = 0; i < data.length; i++) {
      if (!isNaN_(result.macdLine[i]) && !isNaN_(result.signalLine[i])) {
        expect(result.histogram[i]).toBeCloseTo(
          result.macdLine[i] - result.signalLine[i],
          10,
        );
      }
    }
  });
});

describe('BollingerBands', () => {
  it('upper > middle > lower for computed values', () => {
    const data = [20, 21, 22, 23, 24, 25, 24, 23, 22, 21, 20, 21, 22, 23, 24,
      25, 26, 27, 28, 29, 30, 29, 28, 27, 26];
    const { upper, middle, lower } = BollingerBands(data, 20, 2);
    // Check a valid index (i=19 is the first fully computed)
    for (let i = 19; i < data.length; i++) {
      expect(upper[i]).toBeGreaterThan(middle[i]);
      expect(middle[i]).toBeGreaterThan(lower[i]);
    }
  });

  it('middle band equals SMA', () => {
    const data = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38,
      40, 42, 44, 46, 48, 50];
    const { middle } = BollingerBands(data, 20);
    const sma = SMA(data, 20);
    for (let i = 0; i < data.length; i++) {
      if (!isNaN_(middle[i])) {
        expect(middle[i]).toBeCloseTo(sma[i], 10);
      }
    }
  });

  it('constant data produces zero-width bands', () => {
    const data = new Array(25).fill(50);
    const { upper, middle, lower } = BollingerBands(data, 20, 2);
    for (let i = 19; i < data.length; i++) {
      expect(upper[i]).toBeCloseTo(50, 10);
      expect(middle[i]).toBeCloseTo(50, 10);
      expect(lower[i]).toBeCloseTo(50, 10);
    }
  });
});
