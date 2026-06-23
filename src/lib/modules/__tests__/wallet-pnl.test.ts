// ─────────────────────────────────────────────────────────────
// Wallet PnL Tracker Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateTrades,
  aggregatePnl,
  getTopWallets,
  resetPnlStore,
} from '../derived/wallet-pnl'

describe('Wallet PnL Tracker', () => {
  beforeEach(() => {
    resetPnlStore()
  })

  describe('calculateTrades()', () => {
    it('returns empty trades for no swaps', () => {
      expect(calculateTrades([])).toEqual([])
    })

    it('calculates single profitable trade', () => {
      const swaps = [
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 2000, amountOut: 1, priceIn: 2000, priceOut: 2000, timestamp: 1000 },
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 2500, priceIn: 2500, priceOut: 2500, timestamp: 2000 },
      ]
      const trades = calculateTrades(swaps)
      expect(trades).toHaveLength(1)
      expect(trades[0].pnl).toBe(500) // sold at 2500, bought at 2000
      expect(trades[0].size).toBe(2500)
    })

    it('calculates single losing trade', () => {
      const swaps = [
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 3000, amountOut: 1, priceIn: 3000, priceOut: 3000, timestamp: 1000 },
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 2000, priceIn: 2000, priceOut: 2000, timestamp: 2000 },
      ]
      const trades = calculateTrades(swaps)
      expect(trades).toHaveLength(1)
      expect(trades[0].pnl).toBe(-1000) // sold at 2000, bought at 3000
    })

    it('uses FIFO cost basis for multiple buys then sells', () => {
      const swaps = [
        // Buy ETH twice at different prices
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 2000, amountOut: 1, priceIn: 2000, priceOut: 2000, timestamp: 1000 },
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 3000, amountOut: 1, priceIn: 3000, priceOut: 3000, timestamp: 2000 },
        // Sell first ETH — matched against first buy (FIFO)
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 2800, priceIn: 2800, priceOut: 2800, timestamp: 3000 },
      ]
      const trades = calculateTrades(swaps)
      expect(trades).toHaveLength(1)
      // First sell matched against first buy: 2800 - 2000 = 800 profit
      expect(trades[0].pnl).toBe(800)
    })

    it('handles partial lot consumption across FIFO lots', () => {
      const swaps = [
        // Buy 10 tokens at $1 each
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 10, amountOut: 10, priceIn: 1, priceOut: 1, timestamp: 1000 },
        // Buy 10 tokens at $2 each
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 20, amountOut: 10, priceIn: 2, priceOut: 2, timestamp: 2000 },
        // Sell 15 tokens at $3 each — should split across both lots
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 15, amountOut: 45, priceIn: 3, priceOut: 3, timestamp: 3000 },
      ]
      const trades = calculateTrades(swaps)
      // First lot: 10 units, bought at $1, sold at $3 → PnL = $20
      // Second lot: 5 units (partial), bought at $2, sold at $3 → PnL = $5
      expect(trades).toHaveLength(2)
      expect(trades[0].pnl).toBe(20)
      expect(trades[1].pnl).toBe(5)
    })

    it('handles multiple independent token pairs', () => {
      const swaps = [
        // Buy SOL
        { tokenIn: 'USDC', tokenOut: 'SOL', amountIn: 100, amountOut: 1, priceIn: 100, priceOut: 100, timestamp: 1000 },
        // Buy ETH
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 2000, amountOut: 1, priceIn: 2000, priceOut: 2000, timestamp: 1500 },
        // Sell SOL for profit
        { tokenIn: 'SOL', tokenOut: 'USDC', amountIn: 1, amountOut: 150, priceIn: 150, priceOut: 150, timestamp: 2000 },
        // Sell ETH at a loss
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 1800, priceIn: 1800, priceOut: 1800, timestamp: 3000 },
      ]
      const trades = calculateTrades(swaps)
      expect(trades).toHaveLength(2)
      // SOL: 150 - 100 = 50
      expect(trades[0].pnl).toBe(50)
      // ETH: 1800 - 2000 = -200
      expect(trades[1].pnl).toBe(-200)
    })

    it('ignores sells with no matching buy', () => {
      const swaps = [
        // Sell token with no prior buy — should be ignored
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 2000, priceIn: 2000, priceOut: 2000, timestamp: 1000 },
      ]
      expect(calculateTrades(swaps)).toHaveLength(0)
    })

    it('sorts swaps chronologically before matching', () => {
      const swaps = [
        // Out of order: sell arrives before buy in input
        { tokenIn: 'ETH', tokenOut: 'USDC', amountIn: 1, amountOut: 2500, priceIn: 2500, priceOut: 2500, timestamp: 3000 },
        { tokenIn: 'USDC', tokenOut: 'ETH', amountIn: 2000, amountOut: 1, priceIn: 2000, priceOut: 2000, timestamp: 1000 },
      ]
      const trades = calculateTrades(swaps)
      // After sorting: buy at t=1000, sell at t=3000 → PnL = 2500 - 2000 = 500
      expect(trades).toHaveLength(1)
      expect(trades[0].pnl).toBe(500)
    })
  })

  describe('aggregatePnl()', () => {
    it('returns zeroed stats for no trades', () => {
      expect(aggregatePnl('0xabc', 'eth', [])).toEqual({
        address: '0xabc',
        chain: 'eth',
        totalPnl: 0,
        winRate: 0,
        totalTrades: 0,
        avgTradeSize: 0,
        bestTrade: 0,
        worstTrade: 0,
      })
    })

    it('calculates stats for winning trades', () => {
      const trades = [
        { pnl: 500, size: 2000 },
        { pnl: 300, size: 1500 },
        { pnl: 100, size: 500 },
      ]
      const result = aggregatePnl('0xabc', 'eth', trades)
      expect(result.address).toBe('0xabc')
      expect(result.chain).toBe('eth')
      expect(result.totalPnl).toBe(900)
      expect(result.winRate).toBe(1.0)
      expect(result.totalTrades).toBe(3)
      expect(result.avgTradeSize).toBeCloseTo(1333.33, 1)
      expect(result.bestTrade).toBe(500)
      expect(result.worstTrade).toBe(100)
    })

    it('calculates mixed win/loss stats', () => {
      const trades = [
        { pnl: 500, size: 2000 },
        { pnl: -200, size: 1000 },
        { pnl: -100, size: 500 },
        { pnl: 300, size: 1500 },
      ]
      const result = aggregatePnl('0xdef', 'sol', trades)
      expect(result.totalPnl).toBe(500)
      expect(result.winRate).toBe(0.5)
      expect(result.totalTrades).toBe(4)
      expect(result.avgTradeSize).toBe(1250)
      expect(result.bestTrade).toBe(500)
      expect(result.worstTrade).toBe(-200)
    })
  })

  describe('getTopWallets()', () => {
    it('returns empty array when no wallets cached', () => {
      expect(getTopWallets()).toEqual([])
    })

    it('respects limit parameter', () => {
      expect(getTopWallets(10)).toEqual([])
    })
  })
})
