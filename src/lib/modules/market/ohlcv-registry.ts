// ─────────────────────────────────────────────────────────────
// OHLCV Registry — unified interface across all providers
// Routes requests to the correct provider based on symbol
// ─────────────────────────────────────────────────────────────

import type { OHLCVProvider, OHLCVRequest, OHLCVResponse } from './types'
import { binanceOHLCVProvider } from './binance'
import { yahooOHLCVProvider } from './yahoo'

// All registered providers
const providers: OHLCVProvider[] = [
  binanceOHLCVProvider,
  yahooOHLCVProvider,
]

// Binance symbol pattern: ends with USDT, BTC, ETH, BNB, etc.
const CRYPTO_SYMBOL_RE = /^[A-Z0-9]+(USDT|BTC|ETH|BNB|BUSD|FDUSD|TUSD|USDC|DAI)$/i

// Known crypto symbols that should go to Binance
const CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP', 'MATIC', 'ADA', 'DOT', 'UNI', 'AAVE'])

/**
 * Detect which provider to use for a given symbol.
 * - Binance-style symbols (BTCUSDT, ETHBTC) → binance
 * - Known crypto tickers with USDT suffix → binance
 * - Everything else (AAPL, EURUSD=X, GC=F) → yahoo
 */
function detectProvider(symbol: string): OHLCVProvider {
  // Explicit Binance symbol
  if (CRYPTO_SYMBOL_RE.test(symbol)) return binanceOHLCVProvider

  // Known crypto base → try Binance with USDT suffix
  const base = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (CRYPTO_BASES.has(base)) return binanceOHLCVProvider

  // Default: Yahoo Finance (equities, forex, commodity, index)
  return yahooOHLCVProvider
}

/**
 * Normalize crypto symbol for Binance.
 * BTC → BTCUSDT, ETH → ETHUSDT, BTCUSDT → BTCUSDT
 */
function normalizeCryptoSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (CRYPTO_SYMBOL_RE.test(upper)) return upper
  if (CRYPTO_BASES.has(upper)) return `${upper}USDT`
  return upper
}

/**
 * Fetch OHLCV candles from the best available provider.
 * Auto-detects provider from symbol, with fallback.
 */
export async function fetchOHLCV(req: OHLCVRequest): Promise<OHLCVResponse> {
  const provider = detectProvider(req.symbol)

  // Normalize crypto symbols for Binance
  const normalizedReq = provider.id === 'binance'
    ? { ...req, symbol: normalizeCryptoSymbol(req.symbol) }
    : req

  try {
    return await provider.fetchOHLCV(normalizedReq)
  } catch {
    // Fallback: if Binance fails, try Yahoo
    if (provider.id === 'binance') {
      return yahooOHLCVProvider.fetchOHLCV(req)
    }
    throw new Error(`OHLCV fetch failed for ${req.symbol}`)
  }
}

/**
 * Fetch OHLCV from a specific provider (no auto-detection).
 */
export async function fetchOHLCVFrom(
  providerId: string,
  req: OHLCVRequest,
): Promise<OHLCVResponse> {
  const provider = providers.find(p => p.id === providerId)
  if (!provider) throw new Error(`Unknown OHLCV provider: ${providerId}`)
  return provider.fetchOHLCV(req)
}

/**
 * List all available OHLCV providers with health status.
 */
export async function listOHLCVProviders(): Promise<Array<{ id: string; name: string; supports: string[]; healthy: boolean }>> {
  const results = await Promise.allSettled(
    providers.map(async p => ({
      id: p.id,
      name: p.name,
      supports: p.supports,
      healthy: await p.healthCheck(),
    })),
  )
  return results.map(r => r.status === 'fulfilled' ? r.value : { id: 'unknown', name: 'Unknown', supports: [], healthy: false })
}
