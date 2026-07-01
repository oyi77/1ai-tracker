// ─────────────────────────────────────────────────────────────
// Yahoo Finance OHLCV Provider
// sourceType: re
// Endpoint: query1.finance.yahoo.com/v8/finance/chart/
// Coverage: Equities, Forex, Commodities, Indices — global
// UNOFFICIAL: uses Yahoo Finance's internal chart API
// ─────────────────────────────────────────────────────────────

import type { OHLCVProvider, OHLCVRequest, OHLCVResponse, OHLCVCandle, OHLCVInterval } from '../types'
import { cachedFetch } from '../../fetch-with-cache'
import { TTL } from '../../types'

const BASES = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']

// Yahoo interval mapping
const INTERVAL_MAP: Record<OHLCVInterval, string> = {
  '1m': '1m', '3m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '60m', '2h': '60m', '4h': '60m', '6h': '60m', '8h': '60m', '12h': '60m',
  '1d': '1d', '3d': '1d', '1w': '1wk', '1M': '1mo',
}

// Compute range string from interval + limit
function computeRange(interval: OHLCVInterval, limit: number): string {
  const days = interval === '1m' ? 1
    : interval === '5m' ? 5
    : interval === '15m' ? 15
    : interval === '30m' ? 30
    : interval === '1h' ? 60
    : interval === '4h' ? 60
    : interval === '1d' ? Math.max(limit, 30)
    : interval === '1w' ? Math.max(limit * 7, 365)
    : interval === '1M' ? 365 * 5
    : 30
  return days > 365 ? `${Math.ceil(days / 365)}y` : `${days}d`
}

interface YahooChartResult {
  timestamp?: number[]
  indicators?: {
    quote?: Array<{
      open?: number[]
      high?: number[]
      low?: number[]
      close?: number[]
      volume?: number[]
    }>
  }
}

async function fetchYahooOHLCV(req: OHLCVRequest): Promise<OHLCVResponse> {
  const interval = INTERVAL_MAP[req.interval] ?? '1d'
  const limit = req.limit ?? 100
  const range = computeRange(req.interval, limit)

  const data = await cachedFetch<OHLCVCandle[]>(
    'yahoo-ohlcv',
    { symbol: req.symbol, interval, range },
    TTL.PRICE_DATA * TTL.RE_MULTIPLIER,
    async () => {
      let lastError: Error | null = null
      for (const base of BASES) {
        try {
          const url = `${base}/v8/finance/chart/${encodeURIComponent(req.symbol)}?interval=${interval}&range=${range}`
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) { lastError = new Error(`Yahoo OHLCV ${res.status}`); continue }
          const json = await res.json() as { chart?: { result?: YahooChartResult[] } }
          const result = json.chart?.result?.[0]
          if (!result?.timestamp || !result.indicators?.quote?.[0]) {
            lastError = new Error('Yahoo OHLCV: no data'); continue
          }
          const timestamps = result.timestamp
          const quote = result.indicators.quote[0]
          const candles: OHLCVCandle[] = []
          for (let i = 0; i < timestamps.length; i++) {
            const o = quote.open?.[i]
            const h = quote.high?.[i]
            const l = quote.low?.[i]
            const c = quote.close?.[i]
            const v = quote.volume?.[i]
            if (o != null && h != null && l != null && c != null) {
              candles.push({
                time: timestamps[i],
                open: o, high: h, low: l, close: c,
                volume: v ?? 0,
              })
            }
          }
          return candles.slice(-limit)
        } catch (e) { lastError = e as Error; continue }
      }
      throw lastError ?? new Error('Yahoo OHLCV: all endpoints failed')
    },
  )

  return {
    candles: data.data,
    symbol: req.symbol,
    interval: req.interval,
    provider: 'yahoo',
    cached: data.cached,
    timestamp: data.timestamp,
  }
}

export const yahooOHLCVProvider: OHLCVProvider = {
  id: 'yahoo',
  name: 'Yahoo Finance',
  supports: ['equity', 'forex', 'commodity', 'index'],

  async fetchOHLCV(req: OHLCVRequest): Promise<OHLCVResponse> {
    return fetchYahooOHLCV(req)
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASES[0]}/v8/finance/chart/AAPL?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5_000),
      })
      return res.ok
    } catch { return false }
  },
}
