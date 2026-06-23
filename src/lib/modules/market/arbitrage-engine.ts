// ─────────────────────────────────────────────────────────────
// Arbitrage Engine — Cross-Exchange Price & Funding Spreads
// Sources: Binance, Bybit, OKX (all free public APIs, no key)
// Computes: price spreads, funding rate differentials, basis
// ─────────────────────────────────────────────────────────────

import {
  getBinanceTickers,
  getBybitTickers,
  getOkxTickers,
  getCrossExchangeFundingRates,
  type ExchangeTicker,
  type ExchangeFundingRate,
} from './multi-exchange'

// ─── Types ──────────────────────────────────────────────────

export interface PriceSpreadOpportunity {
  symbol: string
  buyExchange: string
  buyPrice: number
  sellExchange: string
  sellPrice: number
  spread: number         // absolute USD difference
  spreadPercent: number  // bps → percent (e.g. 0.12 = 12 bps)
  volume24h: number      // min volume across both exchanges (liquidity proxy)
  estimatedProfit: number // spread percent minus estimated round-trip fees (~0.20%)
}

export interface FundingArbitrageOpportunity {
  symbol: string
  longExchange: string
  longRate: number
  shortExchange: string
  shortRate: number
  differential: number         // absolute rate difference
  annualizedDifferential: number // × 3 × 365 (3 funding periods/day)
  estimatedDailyYield: number   // differential × 3 (per funding period × 3/day)
}

export interface SpotPerpArbitrageOpportunity {
  symbol: string
  spotPrice: number
  perpPrice: number
  basis: number          // absolute
  basisPercent: number
  bestFundingRate: number
  bestFundingExchange: string
  annualizedYield: number // basis annualized
  signal: 'cash-carry-long' | 'cash-carry-short' | 'none'
}

export interface ArbitrageSnapshot {
  timestamp: number
  priceSpreads: PriceSpreadOpportunity[]
  fundingArbitrage: FundingArbitrageOpportunity[]
  spotPerpArbitrage: SpotPerpArbitrageOpportunity[]
  summary: {
    topSpread: PriceSpreadOpportunity | null
    topFunding: FundingArbitrageOpportunity | null
    topBasis: SpotPerpArbitrageOpportunity | null
    totalOpportunities: number
  }
}

// ─── Constants ──────────────────────────────────────────────

/** Estimated round-trip fees (taker both sides + withdrawal) */
const ROUND_TRIP_FEE_PCT = 0.20

/** Funding periods per day (8h each on most exchanges) */
const FUNDING_PERIODS_PER_DAY = 3

/** Major USDT perpetual pairs to scan */
const SCAN_SYMBOLS: ReadonlySet<string> = new Set([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'MATICUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT', 'APTUSDT',
  'SUIUSDT', 'PEPEUSDT', 'WIFUSDT', 'SEIUSDT', 'INJUSDT',
  'FILUSDT', 'ATOMUSDT', 'LTCUSDT', 'ETCUSDT', 'FTMUSDT',
])

/** Top N tickers to fetch per exchange (by volume) */
const TICKER_FETCH_LIMIT = 100

// ─── Price Spread Detection ─────────────────────────────────

function buildPriceMap(tickers: ExchangeTicker[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>()
  for (const t of tickers) {
    let symbolMap = map.get(t.symbol)
    if (!symbolMap) {
      symbolMap = new Map()
      map.set(t.symbol, symbolMap)
    }
    symbolMap.set(t.exchange, t.price)
  }
  return map
}

function buildVolumeMap(tickers: ExchangeTicker[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>()
  for (const t of tickers) {
    let symbolMap = map.get(t.symbol)
    if (!symbolMap) {
      symbolMap = new Map()
      map.set(t.symbol, symbolMap)
    }
    symbolMap.set(t.exchange, t.volume24h)
  }
  return map
}

function findPriceSpreads(
  priceMap: Map<string, Map<string, number>>,
  volumeMap: Map<string, Map<string, number>>,
  minSpreadBps: number,
): PriceSpreadOpportunity[] {
  const opportunities: PriceSpreadOpportunity[] = []

  for (const [symbol, exchangePrices] of priceMap) {
    if (exchangePrices.size < 2) continue
    if (!SCAN_SYMBOLS.has(symbol)) continue

    const exchanges = Array.from(exchangePrices.entries())
    // Compare every pair
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const [exA, priceA] = exchanges[i]
        const [exB, priceB] = exchanges[j]

        const spread = Math.abs(priceA - priceB)
        const midPrice = (priceA + priceB) / 2
        const spreadPercent = (spread / midPrice) * 100

        // Filter by minimum spread
        if (spreadPercent < minSpreadBps / 100) continue

        const buyExchange = priceA < priceB ? exA : exB
        const buyPrice = Math.min(priceA, priceB)
        const sellExchange = priceA < priceB ? exB : exA
        const sellPrice = Math.max(priceA, priceB)

        // Use minimum volume as liquidity proxy
        const volA = volumeMap.get(symbol)?.get(exA) ?? 0
        const volB = volumeMap.get(symbol)?.get(exB) ?? 0
        const volume24h = Math.min(volA, volB)

        const estimatedProfit = spreadPercent - ROUND_TRIP_FEE_PCT

        // Only include if estimated profitable after fees
        if (estimatedProfit <= 0) continue

        opportunities.push({
          symbol,
          buyExchange,
          buyPrice,
          sellExchange,
          sellPrice,
          spread,
          spreadPercent,
          volume24h,
          estimatedProfit,
        })
      }
    }
  }

  return opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent)
}

// ─── Funding Rate Arbitrage ─────────────────────────────────

function findFundingArbitrage(
  fundingRates: ExchangeFundingRate[],
  minDifferentialBps: number,
): FundingArbitrageOpportunity[] {
  const bySymbol = new Map<string, ExchangeFundingRate[]>()
  for (const fr of fundingRates) {
    const list = bySymbol.get(fr.symbol) ?? []
    list.push(fr)
    bySymbol.set(fr.symbol, list)
  }

  const opportunities: FundingArbitrageOpportunity[] = []

  for (const [symbol, rates] of bySymbol) {
    if (rates.length < 2) continue

    // Find the best long (lowest/most negative funding) and short (highest funding)
    const sorted = [...rates].sort((a, b) => a.rate - b.rate)
    const long = sorted[0]
    const short = sorted[sorted.length - 1]

    const differential = short.rate - long.rate
    // Convert to annualized: differential per period × periods/day × 365
    const annualizedDifferential = differential * FUNDING_PERIODS_PER_DAY * 365 * 100
    const estimatedDailyYield = differential * FUNDING_PERIODS_PER_DAY * 100

    // Filter by minimum differential (in bps)
    if (Math.abs(annualizedDifferential) < minDifferentialBps) continue

    opportunities.push({
      symbol,
      longExchange: long.exchange,
      longRate: long.rate,
      shortExchange: short.exchange,
      shortRate: short.rate,
      differential,
      annualizedDifferential,
      estimatedDailyYield,
    })
  }

  return opportunities.sort((a, b) => b.annualizedDifferential - a.annualizedDifferential)
}

// ─── Spot-Perp Basis Arbitrage ───────────────────────────────

interface SpotPerpRow {
  symbol: string
  spotPrice: number
  perpPrice: number
}

function buildSpotPerpRows(
  spotMap: Map<string, Map<string, number>>,
  perpMap: Map<string, Map<string, number>>,
): SpotPerpRow[] {
  const rows: SpotPerpRow[] = []

  for (const symbol of SCAN_SYMBOLS) {
    const spotPrices = spotMap.get(symbol)
    const perpPrices = perpMap.get(symbol)

    if (!spotPrices || !perpPrices) continue

    // Use Binance spot as reference (most liquid), fallback to first available
    const spotPrice = spotPrices.get('binance') ?? Array.from(spotPrices.values())[0]
    // Use best perp price across exchanges
    const perpValues = Array.from(perpPrices.values())
    const perpPrice = perpValues.length > 0
      ? perpValues.reduce((s, p) => s + p, 0) / perpValues.length
      : 0

    if (spotPrice && perpPrice) {
      rows.push({ symbol, spotPrice, perpPrice })
    }
  }

  return rows
}

function findSpotPerpArbitrage(
  rows: SpotPerpRow[],
  fundingRates: ExchangeFundingRate[],
  minBasisPercent: number,
): SpotPerpArbitrageOpportunity[] {
  const bestFundingBySymbol = new Map<string, { rate: number; exchange: string }>()
  for (const fr of fundingRates) {
    const existing = bestFundingBySymbol.get(fr.symbol)
    // "Best" for cash-and-carry = highest positive funding (you receive it being short perp)
    if (!existing || fr.rate > existing.rate) {
      bestFundingBySymbol.set(fr.symbol, { rate: fr.rate, exchange: fr.exchange })
    }
  }

  const opportunities: SpotPerpArbitrageOpportunity[] = []

  for (const row of rows) {
    const basis = row.perpPrice - row.spotPrice
    const basisPercent = (basis / row.spotPrice) * 100

    if (Math.abs(basisPercent) < minBasisPercent) continue

    const funding = bestFundingBySymbol.get(row.symbol)
    const bestFundingRate = funding?.rate ?? 0
    const bestFundingExchange = funding?.exchange ?? 'unknown'

    // Annualized yield: basis + cumulative funding
    const annualizedFunding = bestFundingRate * FUNDING_PERIODS_PER_DAY * 365 * 100
    const annualizedYield = basisPercent * (365 / 90) + annualizedFunding // basis annualized (~quarterly) + funding

    let signal: SpotPerpArbitrageOpportunity['signal'] = 'none'
    if (basis > 0 && bestFundingRate > 0) signal = 'cash-carry-long'  // Long spot, short perp
    if (basis < 0 && bestFundingRate < 0) signal = 'cash-carry-short' // Short spot (if possible), long perp

    opportunities.push({
      symbol: row.symbol,
      spotPrice: row.spotPrice,
      perpPrice: row.perpPrice,
      basis,
      basisPercent,
      bestFundingRate,
      bestFundingExchange,
      annualizedYield,
      signal,
    })
  }

  return opportunities.sort((a, b) => Math.abs(b.basisPercent) - Math.abs(a.basisPercent))
}

// ─── Public API ─────────────────────────────────────────────

export interface ArbitrageScanOptions {
  /** Minimum price spread in bps (default: 3) */
  minSpreadBps?: number
  /** Minimum funding differential in annualized bps (default: 50) */
  minFundingBps?: number
  /** Minimum basis percent (default: 0.05) */
  minBasisPercent?: number
  /** Limit results per category (default: 20) */
  limit?: number
  /** Filter to specific symbols (comma-separated, e.g. "BTCUSDT,ETHUSDT") */
  symbols?: string[]
}

/**
 * Full arbitrage scan across Binance, Bybit, OKX.
 * Returns price spreads, funding differentials, and spot-perp basis.
 */
export async function scanArbitrage(
  options: ArbitrageScanOptions = {},
): Promise<ArbitrageSnapshot> {
  const {
    minSpreadBps = 3,
    minFundingBps = 50,
    minBasisPercent = 0.05,
    limit = 20,
    symbols,
  } = options

  // Fetch all data in parallel with graceful degradation
  const [binanceResult, bybitResult, okxResult] = await Promise.allSettled([
    getBinanceTickers(TICKER_FETCH_LIMIT),
    getBybitTickers(TICKER_FETCH_LIMIT),
    getOkxTickers(TICKER_FETCH_LIMIT),
  ])

  const binanceTickers = binanceResult.status === 'fulfilled' ? binanceResult.value : []
  const bybitTickers = bybitResult.status === 'fulfilled' ? bybitResult.value : []
  const okxTickers = okxResult.status === 'fulfilled' ? okxResult.value : []

  // Build combined maps (spot for cross-exchange, all for spot-perp)
  const allTickers = [...binanceTickers, ...bybitTickers, ...okxTickers]

  // Separate spot and perp maps
  // For cross-exchange price arbitrage, we use the combined tickers
  const priceMap = buildPriceMap(allTickers)
  const volumeMap = buildVolumeMap(allTickers)

  // Fetch funding rates for the major pairs (batched)
  const fundingSymbols = symbols ?? Array.from(SCAN_SYMBOLS).slice(0, 10)
  const fundingResults = await Promise.allSettled(
    fundingSymbols.map(s => getCrossExchangeFundingRates(s)),
  )
  const fundingRates: ExchangeFundingRate[] = fundingResults
    .filter((r): r is PromiseFulfilledResult<ExchangeFundingRate[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Compute opportunities
  const priceSpreads = findPriceSpreads(priceMap, volumeMap, minSpreadBps)
  const fundingArbitrage = findFundingArbitrage(fundingRates, minFundingBps)

  // Spot-perp: use Binance spot vs combined perp average
  // Binance tickers serve as spot reference, all tickers can be perp
  const spotMap = buildPriceMap(binanceTickers)
  const perpMap = buildPriceMap([...bybitTickers, ...okxTickers])
  const spotPerpRows = buildSpotPerpRows(spotMap, perpMap)
  const spotPerpArbitrage = findSpotPerpArbitrage(spotPerpRows, fundingRates, minBasisPercent)

  // Apply symbol filter if provided
  const filterSymbols = symbols ? new Set(symbols) : null
  const filteredSpreads = filterSymbols
    ? priceSpreads.filter(o => filterSymbols.has(o.symbol))
    : priceSpreads
  const filteredFunding = filterSymbols
    ? fundingArbitrage.filter(o => filterSymbols.has(o.symbol))
    : fundingArbitrage
  const filteredBasis = filterSymbols
    ? spotPerpArbitrage.filter(o => filterSymbols.has(o.symbol))
    : spotPerpArbitrage

  return {
    timestamp: Date.now(),
    priceSpreads: filteredSpreads.slice(0, limit),
    fundingArbitrage: filteredFunding.slice(0, limit),
    spotPerpArbitrage: filteredBasis.slice(0, limit),
    summary: {
      topSpread: filteredSpreads[0] ?? null,
      topFunding: filteredFunding[0] ?? null,
      topBasis: filteredBasis[0] ?? null,
      totalOpportunities: filteredSpreads.length + filteredFunding.length + filteredBasis.length,
    },
  }
}
