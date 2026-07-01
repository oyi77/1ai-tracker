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

// Market data providers
export { default as binanceModule } from './binance'
export { default as bybitModule } from './bybit'
export { default as coingeckoModule } from './coingecko'
export { default as coincapModule } from './coincap'
export { default as coinpaprikaModule } from './coinpaprika'
export { default as eastmoneyModule } from './eastmoney'
export { default as indodaxModule } from './indodax'

// Aggregators / derived / infra
export * from './multi-exchange'
export * from './arbitrage-engine'
export { default as marketFlowModule } from './market-flow'
export * from './orderbook-ws'
export * from './trade-aggregator'
export { default as sectorsAppModule } from './sectors-app'
