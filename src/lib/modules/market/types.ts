// ─────────────────────────────────────────────────────────────
// Shared OHLCV types for all market data providers
// ─────────────────────────────────────────────────────────────

export interface OHLCVCandle {
  time: number       // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OHLCVInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M'

export interface OHLCVRequest {
  symbol: string
  interval: OHLCVInterval
  limit?: number       // max candles to return
  from?: number        // Unix timestamp (seconds) — start
  to?: number          // Unix timestamp (seconds) — end
}

export interface OHLCVResponse {
  candles: OHLCVCandle[]
  symbol: string
  interval: OHLCVInterval
  provider: string
  cached: boolean
  timestamp: number
}

export interface OHLCVProvider {
  id: string
  name: string
  /** What asset classes this provider supports */
  supports: ('crypto' | 'equity' | 'forex' | 'commodity' | 'index')[]
  /** Fetch OHLCV candles */
  fetchOHLCV(req: OHLCVRequest): Promise<OHLCVResponse>
  /** Health check */
  healthCheck(): Promise<boolean>
}
