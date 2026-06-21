/**
 * Module: Binance Futures Derivatives
 * sourceType: public-api
 * upstreamProduct: Binance
 * endpoint: fapi.binance.com/fapi/v1
 * discoveredVia: docs
 * lastVerified: 2026-06-20
 *
 * Fetches funding rates, open interest, and 24h ticker stats
 * from Binance Futures public API. No auth required.
 */

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'

const BASE = 'https://fapi.binance.com/fapi/v1'

// ── Response shapes from Binance Futures API ────────────────

interface BinanceFundingRate {
  symbol: string
  fundingRate: string
  fundingTime: number
  markPrice?: string
}

interface BinanceOpenInterest {
  symbol: string
  openInterest: string
  time: number
}

interface BinanceTicker24h {
  symbol: string
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  volume: string
  quoteVolume: string
  openInterest?: string
  highPrice: string
  lowPrice: string
}

// ── Transformed output types ────────────────────────────────

export interface PerpData {
  symbol: string
  baseAsset: string
  price: number
  priceChange24h: number
  volume24h: number
  quoteVolume24h: number
  openInterest: number
  fundingRate: number
  nextFundingTime: number
  high24h: number
  low24h: number
}

export interface BinanceFuturesData {
  pairs: PerpData[]
  timestamp: number
}

// ── Internal helpers ────────────────────────────────────────

function toNum(s: string | undefined): number {
  if (s === undefined || s === '') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function extractBaseAsset(symbol: string): string {
  // BTCUSDT → BTC, 1000PEPEUSDT → 1000PEPE
  const q = ['USDT', 'BUSD', 'USDC', 'TUSD']
  for (const quote of q) {
    if (symbol.endsWith(quote)) return symbol.slice(0, -quote.length)
  }
  return symbol
}

// ── Fetch logic ─────────────────────────────────────────────

async function fetchBinanceFutures(params: FetchParams): Promise<BinanceFuturesData> {
  const limit = Math.min(100, Math.max(5, Number(params.limit ?? 20)))

  // Parallel fetch: tickers, funding rates, OI
  const [tickerRes, fundingRes] = await Promise.allSettled([
    fetchJSON<BinanceTicker24h[]>(`${BASE}/ticker/24hr`),
    fetchJSON<BinanceFundingRate[]>(`${BASE}/fundingRate?limit=1000`),
  ])

  const tickers = tickerRes.status === 'fulfilled' ? tickerRes.value : []
  const fundingRates = fundingRes.status === 'fulfilled' ? fundingRes.value : []

  // Filter to USDT perpetual pairs only (exclude delivery contracts)
  const perpTickers = tickers.filter(t =>
    t.symbol.endsWith('USDT') && !t.symbol.match(/\d{6}$/),
  )

  // Build funding rate map (latest per symbol)
  const fundingMap = new Map<string, BinanceFundingRate>()
  for (const fr of fundingRates) {
    const existing = fundingMap.get(fr.symbol)
    if (!existing || fr.fundingTime > existing.fundingTime) {
      fundingMap.set(fr.symbol, fr)
    }
  }

  // Transform and sort by quote volume (proxy for OI activity)
  const pairs: PerpData[] = perpTickers
    .map(t => {
      const funding = fundingMap.get(t.symbol)
      const oi = toNum(t.openInterest)
      return {
        symbol: t.symbol,
        baseAsset: extractBaseAsset(t.symbol),
        price: toNum(t.lastPrice),
        priceChange24h: toNum(t.priceChangePercent),
        volume24h: toNum(t.volume),
        quoteVolume24h: toNum(t.quoteVolume),
        openInterest: oi,
        fundingRate: toNum(funding?.fundingRate),
        nextFundingTime: funding?.fundingTime ?? 0,
        high24h: toNum(t.highPrice),
        low24h: toNum(t.lowPrice),
      }
    })
    .sort((a, b) => b.quoteVolume24h - a.quoteVolume24h)
    .slice(0, limit)

  // Fetch OI for top pairs (Binance OI endpoint is per-symbol)
  const topSymbols = pairs.slice(0, 20).map(p => p.symbol)
  const oiResults = await Promise.allSettled(
    topSymbols.map(sym => fetchJSON<BinanceOpenInterest>(`${BASE}/openInterest?symbol=${sym}`)),
  )

  const oiMap = new Map<string, number>()
  for (const r of oiResults) {
    if (r.status === 'fulfilled' && r.value?.symbol) {
      oiMap.set(r.value.symbol, toNum(r.value.openInterest))
    }
  }

  // Merge OI data into pairs
  for (const pair of pairs) {
    const oi = oiMap.get(pair.symbol)
    if (oi !== undefined) pair.openInterest = oi
  }

  return { pairs, timestamp: Date.now() }
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Binance Futures ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

// ── Module definition ───────────────────────────────────────

const binanceFuturesModule: DataModule = {
  id: 'binance-futures',
  name: 'Binance Futures Derivatives',
  category: 'derivatives',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Binance Futures USDT-M — funding rates, open interest, 24h tickers for top perpetual pairs',
    upstreamProduct: 'Binance',
    discoveredVia: 'docs',
    fragility: 'stable',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await fetch(`${BASE}/ping`, {
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>(
      'binance-futures',
      params,
      TTL.DERIVATIVES,
      () => fetchBinanceFutures(params) as Promise<T>,
    )
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { pairs: [], timestamp: Date.now() } as unknown as T,
      source: 'binance-futures (empty fallback)',
      cached: false,
      timestamp: Date.now(),
      ttl: TTL.DERIVATIVES,
    }
  },
}

export default binanceFuturesModule
