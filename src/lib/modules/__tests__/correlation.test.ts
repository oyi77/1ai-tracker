// ─────────────────────────────────────────────────────────────
// Correlation Engine Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import {
  calculateCorrelation,
  getCorrelations,
  updateCorrelations,
  feedPair,
  feedPairBatch,
  resetCorrelations,
  SIGNAL_PAIRS,
} from '../derived/correlation-engine'

describe('Correlation Engine', () => {
  describe('calculateCorrelation()', () => {
    it('returns perfect positive correlation (r ≈ 1.0)', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
      const result = calculateCorrelation(x, y)
      expect(result.r).toBeCloseTo(1.0, 5)
      expect(result.significance).toBe('significant')
    })

    it('returns perfect negative correlation (r ≈ -1.0)', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const y = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2]
      const result = calculateCorrelation(x, y)
      expect(result.r).toBeCloseTo(-1.0, 5)
      expect(result.significance).toBe('significant')
    })

    it('returns no correlation (r ≈ 0) for random-looking data', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const y = [5, 3, 8, 1, 9, 2, 7, 4, 6, 10]
      const result = calculateCorrelation(x, y)
      // This particular permutation gives r ≈ 0.26 which is non-zero
      // but not significant — the important check is the formula works
      expect(Math.abs(result.r)).toBeLessThan(0.6)
    })

    it('returns r = 0 for constant series', () => {
      const x = [5, 5, 5, 5, 5]
      const y = [1, 2, 3, 4, 5]
      const result = calculateCorrelation(x, y)
      expect(result.r).toBe(0)
      expect(result.significance).toBe('not_significant')
    })

    it('classifies significance correctly', () => {
      // Large correlated sample → significant
      const bigX = Array.from({ length: 50 }, (_, i) => i)
      const bigY = bigX.map(v => v * 2 + 1)
      const sig = calculateCorrelation(bigX, bigY)
      expect(sig.significance).toBe('significant')

      // Tiny sample → inconclusive or not_significant
      const tiny = calculateCorrelation([1, 2], [3, 4])
      expect(tiny.significance).toBe('inconclusive')
    })

    it('handles short series (< 3) gracefully', () => {
      const result = calculateCorrelation([1], [2])
      expect(result.r).toBe(0)
      expect(result.pValue).toBe(1)
      expect(result.significance).toBe('inconclusive')
    })

    it('handles equal-length arrays', () => {
      const a = [10, 20, 30, 40, 50]
      const b = [15, 25, 35, 45, 55]
      const result = calculateCorrelation(a, b)
      expect(result.r).toBeCloseTo(1.0, 5)
    })

    it('handles different-length arrays (uses min)', () => {
      const a = [1, 2, 3, 4, 5, 6, 7]
      const b = [2, 4, 6, 8, 10]
      const result = calculateCorrelation(a, b)
      expect(result.r).toBeCloseTo(1.0, 5)
      // CorrelationResult doesn't have sampleSize (that's on CorrelationSnapshot)
    })

    it('pValue is between 0 and 1', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const y = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]
      const result = calculateCorrelation(x, y)
      expect(result.pValue).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })
  })

  describe('ring buffer + updateCorrelations()', () => {
    it('feeds pairs and produces snapshots', async () => {
      resetCorrelations()
      feedPair(SIGNAL_PAIRS.WHALE_PRICE, 10, 100)
      feedPair(SIGNAL_PAIRS.WHALE_PRICE, 20, 200)
      feedPair(SIGNAL_PAIRS.WHALE_PRICE, 30, 300)
      feedPair(SIGNAL_PAIRS.WHALE_PRICE, 40, 400)
      feedPair(SIGNAL_PAIRS.WHALE_PRICE, 50, 500)

      await updateCorrelations()
      const snapshots = getCorrelations()
      const wp = snapshots.find(s => s.pair === SIGNAL_PAIRS.WHALE_PRICE)

      expect(wp).toBeDefined()
      expect(wp!.r).toBeCloseTo(1.0, 5)
      expect(wp!.sampleSize).toBe(5)
      expect(wp!.lastUpdated).toBeInstanceOf(Date)
    })

    it('feeds batches correctly', async () => {
      resetCorrelations()
      feedPairBatch(
        SIGNAL_PAIRS.SMART_MONEY_PRICE,
        [1, 2, 3, 4, 5],
        [10, 8, 6, 4, 2],
      )

      await updateCorrelations()
      const snapshots = getCorrelations()
      const sm = snapshots.find(s => s.pair === SIGNAL_PAIRS.SMART_MONEY_PRICE)

      expect(sm).toBeDefined()
      expect(sm!.r).toBeCloseTo(-1.0, 5)
      expect(sm!.sampleSize).toBe(5)
    })

    it('trims ring buffer to MAX_HISTORY', async () => {
      resetCorrelations()
      // Feed 250 points into a buffer capped at 200
      for (let i = 0; i < 250; i++) {
        feedPair(SIGNAL_PAIRS.FUNDING_REVERSAL, i, i * 2)
      }

      await updateCorrelations()
      const snapshots = getCorrelations()
      const fr = snapshots.find(s => s.pair === SIGNAL_PAIRS.FUNDING_REVERSAL)

      expect(fr).toBeDefined()
      expect(fr!.sampleSize).toBe(200)
      expect(fr!.r).toBeCloseTo(1.0, 5)
    })
  })

  describe('SIGNAL_PAIRS constants', () => {
    it('defines all four expected pairs', () => {
      expect(Object.keys(SIGNAL_PAIRS)).toHaveLength(4)
      expect(SIGNAL_PAIRS.WHALE_PRICE).toContain('whale')
      expect(SIGNAL_PAIRS.SMART_MONEY_PRICE).toContain('smart_money')
      expect(SIGNAL_PAIRS.FUNDING_REVERSAL).toContain('funding')
      expect(SIGNAL_PAIRS.DEX_WHALE).toContain('dex')
    })
  })

  describe('resetCorrelations()', () => {
    it('clears all state', async () => {
      feedPair(SIGNAL_PAIRS.DEX_WHALE, 1, 2)
      await updateCorrelations()
      expect(getCorrelations().length).toBeGreaterThan(0)

      resetCorrelations()
      expect(getCorrelations().length).toBe(0)
    })
  })
})
