// ─────────────────────────────────────────────────────────────
// Binance OHLCV Provider
// sourceType: public-api
// Endpoint: api.binance.com/api/v3/klines
// Coverage: 1600+ crypto pairs, all timeframes
// Rate limit: 1200 req/min (IP), no API key needed
// ─────────────────────────────────────────────────────────────

import type { OHLCVProvider, OHLCVRequest, OHLCVResponse, OHLCVCandle, OHLCVInterval } from '../types'
import { cachedFetch } from '../../fetch-with-cache'
import { TTL } from '../../types'

const BASE = 'https://api.binance.com/api/v3'

// Binance interval mapping (same as our OHLCVInterval)
const INTERVAL_MAP: Record<OHLCVInterval, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
}

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
function parseKline(k: unknown[]): OHLCVCandle {
  return {
    time: Math.floor(Number(k[0]) / 1000), // ms → seconds
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }
}

async function fetchBinanceOHLCV(req: OHLCVRequest): Promise<OHLCVResponse> {
  const interval = INTERVAL_MAP[req.interval] ?? '1h'
  const limit = Math.min(req.limit ?? 500, 1000) // Binance max 1000

  let url = `${BASE}/klines?symbol=${req.symbol}&interval=${interval}&limit=${limit}`
  if (req.from) url += `&startTime=${req.from * 1000}`
  if (req.to) url += `&endTime=${req.to * 1000}`

  const data = await cachedFetch<OHLCVCandle[]>(
    'binance-ohlcv',
    { symbol: req.symbol, interval, limit },
    TTL.PRICE_DATA,
    async () => {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Binance OHLCV ${res.status}: ${req.symbol}`)
      const raw = await res.json() as unknown[][]
      return raw.map(parseKline)
    },
  )

  return {
    candles: data.data,
    symbol: req.symbol,
    interval: req.interval,
    provider: 'binance',
    cached: data.cached,
    timestamp: data.timestamp,
  }
}

export const binanceOHLCVProvider: OHLCVProvider = {
  id: 'binance',
  name: 'Binance',
  supports: ['crypto'],

  async fetchOHLCV(req: OHLCVRequest): Promise<OHLCVResponse> {
    return fetchBinanceOHLCV(req)
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/klines?symbol=BTCUSDT&interval=1h&limit=1`, {
        signal: AbortSignal.timeout(5_000),
      })
      return res.ok
    } catch { return false }
  },
}
