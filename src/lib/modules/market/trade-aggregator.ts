// ─────────────────────────────────────────────────────────────
// Real-Time Trade Aggregator
// Inspired by aggr.trade — connects to multiple exchange WebSockets
// Aggregates live trades for volume/flow analysis
// Zero API keys — all public WS endpoints
// ─────────────────────────────────────────────────────────────

export interface Trade {
  exchange: string
  pair: string
  price: number
  size: number
  side: 'buy' | 'sell'
  timestamp: number
  usdValue: number
}

export interface AggregatedFlow {
  symbol: string
  buyVolume: number
  sellVolume: number
  netFlow: number
  tradeCount: number
  vwap: number
  lastPrice: number
  lastUpdate: number
}

// Exchange WS configurations (from aggr.trade open-source)
const EXCHANGE_WS: Record<string, { url: string; subscribe: (pair: string) => string; parse: (data: unknown) => Trade[] }> = {
  binance: {
    url: 'wss://data-stream.binance.vision:9443/ws',
    subscribe: (pair: string) => JSON.stringify({
      method: 'SUBSCRIBE',
      params: [`${pair.toLowerCase()}@trade`],
      id: 1,
    }),
    parse: (data: unknown): Trade[] => {
      const msg = data as { e?: string; s?: string; p?: string; q?: string; T?: number; m?: boolean }
      if (msg.e !== 'trade' || !msg.s) return []
      const price = parseFloat(msg.p ?? '0')
      const size = parseFloat(msg.q ?? '0')
      return [{
        exchange: 'binance',
        pair: msg.s.toLowerCase(),
        price,
        size,
        side: msg.m ? 'sell' : 'buy',
        timestamp: msg.T ?? Date.now(),
        usdValue: price * size,
      }]
    },
  },
  binance_futures: {
    url: 'wss://fstream.binance.com/ws',
    subscribe: (pair: string) => JSON.stringify({
      method: 'SUBSCRIBE',
      params: [`${pair.toLowerCase()}@trade`],
      id: 1,
    }),
    parse: (data: unknown): Trade[] => {
      const msg = data as { e?: string; s?: string; p?: string; q?: string; T?: number; m?: boolean }
      if (msg.e !== 'trade' || !msg.s) return []
      const price = parseFloat(msg.p ?? '0')
      const size = parseFloat(msg.q ?? '0')
      return [{
        exchange: 'binance_futures',
        pair: msg.s.toLowerCase(),
        price,
        size,
        side: msg.m ? 'sell' : 'buy',
        timestamp: msg.T ?? Date.now(),
        usdValue: price * size,
      }]
    },
  },
  okx: {
    url: 'wss://ws.okx.com:8443/ws/v5/public',
    subscribe: (pair: string) => JSON.stringify({
      op: 'subscribe',
      args: [{ channel: 'trades', instId: pair.toUpperCase() }],
    }),
    parse: (data: unknown): Trade[] => {
      const msg = data as { data?: Array<{ instId?: string; px?: string; sz?: string; ts?: string; side?: string }> }
      if (!msg.data) return []
      return msg.data.map(t => {
        const price = parseFloat(t.px ?? '0')
        const size = parseFloat(t.sz ?? '0')
        return {
          exchange: 'okx',
          pair: (t.instId ?? '').toLowerCase(),
          price,
          size,
          side: t.side === 'buy' ? 'buy' : 'sell',
          timestamp: parseInt(t.ts ?? '0') || Date.now(),
          usdValue: price * size,
        }
      })
    },
  },
}

const SUPPORTED_PAIRS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt']

// In-memory flow aggregation
const flowMap = new Map<string, AggregatedFlow>()
const MAX_TRADES = 10000
const recentTrades: Trade[] = []
let totalBuyVolume = 0
let totalSellVolume = 0
let connected = false

function updateFlow(trade: Trade) {
  const key = trade.pair.replace('usdt', '').toUpperCase()
  const existing = flowMap.get(key) ?? {
    symbol: key,
    buyVolume: 0,
    sellVolume: 0,
    netFlow: 0,
    tradeCount: 0,
    vwap: 0,
    lastPrice: 0,
    lastUpdate: 0,
  }

  if (trade.side === 'buy') {
    existing.buyVolume += trade.usdValue
    totalBuyVolume += trade.usdValue
  } else {
    existing.sellVolume += trade.usdValue
    totalSellVolume += trade.usdValue
  }

  existing.netFlow = existing.buyVolume - existing.sellVolume
  existing.tradeCount++
  existing.lastPrice = trade.price
  existing.lastUpdate = trade.timestamp

  // VWAP
  const totalVol = existing.buyVolume + existing.sellVolume
  existing.vwap = totalVol > 0 ? (existing.buyVolume * trade.price + existing.sellVolume * trade.price) / totalVol : trade.price

  flowMap.set(key, existing)

  // Keep recent trades
  recentTrades.unshift(trade)
  if (recentTrades.length > MAX_TRADES) recentTrades.length = MAX_TRADES
}

/**
 * Start WebSocket connections to exchanges.
 * Call once on server startup. Trades accumulate in memory.
 */
export function startTradeAggregator() {
  if (connected) return
  connected = true

  for (const [exchangeId, config] of Object.entries(EXCHANGE_WS)) {
    try {
      const ws = new WebSocket(config.url)

      ws.onopen = () => {
        console.log(`[trade-aggregator] ${exchangeId} connected`)
        for (const pair of SUPPORTED_PAIRS) {
          ws.send(config.subscribe(pair))
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)
          const trades = config.parse(data)
          for (const trade of trades) {
            if (trade.usdValue > 0) updateFlow(trade)
          }
        } catch {
          // Silent parse errors
        }
      }

      ws.onerror = () => {
        console.warn(`[trade-aggregator] ${exchangeId} error`)
      }

      ws.onclose = () => {
        console.log(`[trade-aggregator] ${exchangeId} disconnected, reconnecting in 5s...`)
        setTimeout(() => {
          connected = false
          startTradeAggregator()
        }, 5000)
      }
    } catch (err) {
      console.error(`[trade-aggregator] Failed to connect ${exchangeId}:`, (err as Error).message)
    }
  }
}

/**
 * Get current flow data for all tracked symbols.
 */
export function getFlowData(): {
  flows: AggregatedFlow[]
  totalBuyVolume: number
  totalSellVolume: number
  totalNetFlow: number
  tradeCount: number
  connected: boolean
} {
  return {
    flows: [...flowMap.values()].sort((a, b) => (b.buyVolume + b.sellVolume) - (a.buyVolume + a.sellVolume)),
    totalBuyVolume,
    totalSellVolume,
    totalNetFlow: totalBuyVolume - totalSellVolume,
    tradeCount: recentTrades.length,
    connected,
  }
}

/**
 * Get recent trades (newest first).
 */
export function getRecentTrades(limit = 50): Trade[] {
  return recentTrades.slice(0, limit)
}

/**
 * Reset all flow data (for testing).
 */
export function resetFlowData() {
  flowMap.clear()
  recentTrades.length = 0
  totalBuyVolume = 0
  totalSellVolume = 0
}