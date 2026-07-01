/**
 * Module: Polymarket Prediction Markets
 * sourceType: public-api
 * upstreamProduct: Polymarket
 * endpoint: clob.polymarket.com
 * discoveredVia: docs
 * lastVerified: 2026-06-20
 * UNOFFICIAL: uses Polymarket's public CLOB API for market data
 * fallbackFn: empty prediction markets
 *
 * Alpha signals: real-money probabilities for Fed decisions,
 * elections, crypto regulation, economic events. Prediction
 * markets consistently beat polls and expert surveys.
 */

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../../types'
import { TTL } from '../../types'
import { cachedFetch } from '../../fetch-with-cache'

const CLOB = 'https://clob.polymarket.com'

interface CLOBToken {
  outcome?: string
  price?: string | number
}

interface CLOBMarket {
  closed?: boolean
  question?: string
  name?: string
  volume24hr?: string | number
  volume?: string | number
  liquidity?: string | number
  tokens?: CLOBToken[]
}

interface CLOBResponse {
  data?: CLOBMarket[]
  markets?: CLOBMarket[]
}

interface PolymarketData {
  topMarkets: Array<{
    question: string
    probability: number
    volume: number
    liquidity: number
  }>
  count: number
  timestamp: number
}

async function fetchPolymarket(_params: FetchParams): Promise<PolymarketData> {
  const result: PolymarketData = { topMarkets: [], count: 0, timestamp: Date.now() }

  try {
    const res = await fetch(`${CLOB}/markets?limit=50&closed=false`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      const data = (await res.json()) as CLOBResponse
      const markets = data?.data ?? data?.markets ?? []

      result.count = markets.length

      // Filter for non-closed markets with tokens that have non-trivial prices
      const active = markets.filter((m) => {
        if (m.closed === true) return false
        const tokens = m.tokens ?? []
        // Need at least one token with a non-binary price
        return tokens.some((t) => {
          const price = typeof t.price === 'string' ? parseFloat(t.price) : t.price
          return typeof price === 'number' && price > 0 && price < 1
        })
      })

      result.topMarkets = active
        .sort((a, b) => {
          const volA = typeof a.volume24hr === 'string' ? parseFloat(a.volume24hr) : (a.volume24hr ?? a.volume ?? 0)
          const volB = typeof b.volume24hr === 'string' ? parseFloat(b.volume24hr) : (b.volume24hr ?? b.volume ?? 0)
          const parseVolA = typeof volA === 'number' ? volA : 0
          const parseVolB = typeof volB === 'number' ? volB : 0
          return parseVolB - parseVolA
        })
        .slice(0, 15)
        .map((m) => {
          const tokens = m.tokens ?? []
          const yesToken = tokens.find((t) => t.outcome?.toLowerCase() === 'yes')
          let probability = 0.5
          if (yesToken?.price != null) {
            const parsedPrice = typeof yesToken.price === 'string' ? parseFloat(yesToken.price) : yesToken.price
            if (typeof parsedPrice === 'number') {
              probability = parsedPrice
            }
          }
          const vol = typeof m.volume24hr === 'string' ? parseFloat(m.volume24hr) : (m.volume24hr ?? m.volume ?? 0)
          const parseVol = typeof vol === 'number' ? vol : 0
          const liq = typeof m.liquidity === 'string' ? parseFloat(m.liquidity) : (m.liquidity ?? 0)
          const parseLiq = typeof liq === 'number' ? liq : 0
          return {
            question: m.question ?? m.name ?? 'Unknown',
            probability,
            volume: parseVol,
            liquidity: parseLiq,
          }
        })
    }
  } catch { /* pass */ }

  return result
}

const polymarketModule: DataModule = {
  id: 'polymarket-clob',
  name: 'Polymarket Markets (CLOB)',
  category: 'prediction',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Polymarket prediction market data — active markets, prices, volume',
    upstreamProduct: 'Polymarket',
    discoveredVia: 'docs',
    fragility: 'stable',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await fetch(`${CLOB}/markets?limit=1`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6_000),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('polymarket', params, TTL.MACRO_DATA, () => fetchPolymarket(params) as Promise<T>)
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { topMarkets: [], count: 0, timestamp: Date.now() } as unknown as T,
      source: 'polymarket (empty fallback)', cached: false, timestamp: Date.now(), ttl: TTL.MACRO_DATA,
    }
  },
}

export default polymarketModule
