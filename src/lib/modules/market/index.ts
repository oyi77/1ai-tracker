// ─────────────────────────────────────────────────────────────
// Market Module — unified barrel export
// ─────────────────────────────────────────────────────────────

// OHLCV types
export type { OHLCVCandle, OHLCVInterval, OHLCVRequest, OHLCVResponse, OHLCVProvider } from './types'

// OHLCV providers
export { binanceOHLCVProvider } from './binance'
export { yahooOHLCVProvider } from './yahoo'

// OHLCV registry (unified interface)
export { fetchOHLCV, fetchOHLCVFrom, listOHLCVProviders } from './ohlcv-registry'
