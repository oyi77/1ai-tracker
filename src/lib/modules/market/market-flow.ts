// ─────────────────────────────────────────────────────────────
// Module: Market Flow (aggr.trade-style)
// sourceType: public-api
// Fetches aggregate trade data from exchanges to compute
// buy/sell volume, flow imbalance, and large trade detection.
// Inspired by aggr.trade and Insilico Terminal data.
// ─────────────────────────────────────────────────────────────

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'

const BINANCE_SPOT = 'https://api.binance.com/api/v3'

interface AggTrade {
  a: number  // aggregate trade ID
  p: string  // price
  q: string  // quantity
  f: number  // first trade ID
  l: number  // last trade ID
  T: number  // timestamp
  m: boolean // is the buyer the market maker? (false = buy-initiated)
  M: boolean // ignore
}

export interface FlowMetrics {
  symbol: string
  exchange: string
  buyVolume: number
  sellVolume: number
  totalVolume: number
  buySellRatio: number
  netFlow: number
  tradeCount: number
  largeTrades: number
  avgTradeSize: number
  lastPrice: number
  timestamp: number
}

export interface MarketFlowData {
  flows: FlowMetrics[]
  summary: {
    totalBuyVolume: number
    totalSellVolume: number
    totalNetFlow: number
    overallBuySellRatio: number
    largeTradeCount: number
  }
  generated: string
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

async function fetchBinanceAggTrades(symbol: string): Promise<AggTrade[]> {
  const url = `${BINANCE_SPOT}/aggTrades?symbol=${symbol}&limit=200`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Binance aggTrades ${symbol}: ${res.status}`)
  return res.json()
}

function computeFlow(symbol: string, trades: AggTrade[]): FlowMetrics {
  let buyVolume = 0
  let sellVolume = 0
  let totalSize = 0
  const sizes: number[] = []

  for (const t of trades) {
    const qty = parseFloat(t.q) * parseFloat(t.p)
    totalSize += qty
    sizes.push(qty)
    if (t.m === false) {
      buyVolume += qty
    } else {
      sellVolume += qty
    }
  }

  const avgSize = sizes.length > 0 ? totalSize / sizes.length : 0
  const threshold = avgSize * 2
  const largeTrades = sizes.filter(s => s > threshold).length

  return {
    symbol,
    exchange: 'binance',
    buyVolume: Math.round(buyVolume * 100) / 100,
    sellVolume: Math.round(sellVolume * 100) / 100,
    totalVolume: Math.round(totalSize * 100) / 100,
    buySellRatio: sellVolume > 0 ? Math.round((buyVolume / sellVolume) * 100) / 100 : buyVolume > 0 ? 999 : 1,
    netFlow: Math.round((buyVolume - sellVolume) * 100) / 100,
    tradeCount: trades.length,
    largeTrades,
    avgTradeSize: Math.round(avgSize * 100) / 100,
    lastPrice: trades.length > 0 ? parseFloat(trades[trades.length - 1].p) : 0,
    timestamp: Date.now(),
  }
}

async function fetchAllFlows(_params: FetchParams): Promise<MarketFlowData> {
  const results = await Promise.allSettled(
    SYMBOLS.map(sym => fetchBinanceAggTrades(sym))
  )

  const flows: FlowMetrics[] = []
  for (let i = 0; i < SYMBOLS.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      flows.push(computeFlow(SYMBOLS[i], r.value))
    }
  }

  const summary = {
    totalBuyVolume: Math.round(flows.reduce((s, f) => s + f.buyVolume, 0) * 100) / 100,
    totalSellVolume: Math.round(flows.reduce((s, f) => s + f.sellVolume, 0) * 100) / 100,
    totalNetFlow: Math.round(flows.reduce((s, f) => s + f.netFlow, 0) * 100) / 100,
    overallBuySellRatio: flows.reduce((s, f) => s + f.buySellRatio, 0) / flows.length,
    largeTradeCount: flows.reduce((s, f) => s + f.largeTrades, 0),
  }

  return { flows, summary, generated: new Date().toISOString() }
}

const marketFlowModule: DataModule = {
  id: 'market-flow',
  name: 'Market Flow (aggr.trade/Insilico)',
  category: 'sentiment',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Market flow data from Binance aggregate trades — buy/sell volume, flow imbalance, large trade detection',
    fragility: 'stable',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },
  isEnabled: () => true,
  async healthCheck(): Promise<ModuleHealth> {
    try {
      const trades = await fetchBinanceAggTrades('BTCUSDT')
      if (trades.length > 0) {
        return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0, notes: `${trades.length} BTC trades` }
      }
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1 }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },
  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('market-flow', params, TTL.PRICE_DATA, () => fetchAllFlows(params) as Promise<T>)
  },
}
export default marketFlowModule
