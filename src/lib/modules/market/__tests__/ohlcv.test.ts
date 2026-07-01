// ─────────────────────────────────────────────────────────────
// OHLCV Module Tests
// Tests provider routing, normalization, and data shape
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { fetchOHLCV, fetchOHLCVFrom, listOHLCVProviders } from '../ohlcv-registry'

describe('OHLCV Registry', () => {
  describe('Provider routing', () => {
    it('routes BTCUSDT to Binance', async () => {
      const result = await fetchOHLCV({ symbol: 'BTCUSDT', interval: '1h', limit: 5 })
      expect(result.provider).toBe('binance')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.candles.length).toBeGreaterThan(0)
    })

    it('routes BTC to Binance (auto-normalizes to BTCUSDT)', async () => {
      const result = await fetchOHLCV({ symbol: 'BTC', interval: '1h', limit: 5 })
      expect(result.provider).toBe('binance')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.candles.length).toBeGreaterThan(0)
    })

    it('routes AAPL to Yahoo Finance', async () => {
      const result = await fetchOHLCV({ symbol: 'AAPL', interval: '1d', limit: 5 })
      expect(result.provider).toBe('yahoo')
      expect(result.symbol).toBe('AAPL')
      expect(result.candles.length).toBeGreaterThan(0)
    })

    it('routes EURUSD=X to Yahoo Finance', async () => {
      const result = await fetchOHLCV({ symbol: 'EURUSD=X', interval: '1d', limit: 5 })
      expect(result.provider).toBe('yahoo')
      expect(result.candles.length).toBeGreaterThan(0)
    })
  })

  describe('OHLCV data shape', () => {
    it('returns valid candle structure from Binance', async () => {
      const result = await fetchOHLCV({ symbol: 'ETHUSDT', interval: '1h', limit: 3 })
      expect(result.candles.length).toBeGreaterThan(0)
      const candle = result.candles[0]
      expect(typeof candle.time).toBe('number')
      expect(typeof candle.open).toBe('number')
      expect(typeof candle.high).toBe('number')
      expect(typeof candle.low).toBe('number')
      expect(typeof candle.close).toBe('number')
      expect(typeof candle.volume).toBe('number')
      expect(candle.high).toBeGreaterThanOrEqual(candle.low)
      expect(candle.time).toBeGreaterThan(0)
    })

    it('returns valid candle structure from Yahoo', async () => {
      const result = await fetchOHLCV({ symbol: 'GC=F', interval: '1d', limit: 3 })
      expect(result.candles.length).toBeGreaterThan(0)
      const candle = result.candles[0]
      expect(typeof candle.time).toBe('number')
      expect(typeof candle.open).toBe('number')
      expect(candle.high).toBeGreaterThanOrEqual(candle.low)
    })
  })

  describe('Explicit provider', () => {
    it('fetchOHLCVFrom binance works', async () => {
      const result = await fetchOHLCVFrom('binance', { symbol: 'SOLUSDT', interval: '1h', limit: 5 })
      expect(result.provider).toBe('binance')
      expect(result.candles.length).toBeGreaterThan(0)
    })

    it('fetchOHLCVFrom throws for unknown provider', async () => {
      await expect(fetchOHLCVFrom('unknown', { symbol: 'BTC', interval: '1h' }))
        .rejects.toThrow('Unknown OHLCV provider')
    })
  })

  describe('Provider listing', () => {
    it('lists all providers with health status', async () => {
      const providers = await listOHLCVProviders()
      expect(providers.length).toBeGreaterThanOrEqual(2)
      const ids = providers.map(p => p.id)
      expect(ids).toContain('binance')
      expect(ids).toContain('yahoo')
    })
  })
})
