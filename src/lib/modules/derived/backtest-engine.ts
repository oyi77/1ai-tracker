// ─────────────────────────────────────────────────────────────
// Backtest Engine — Replay signals against historical prices
// Calculates win/loss for each signal (TP hit vs SL hit)
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

export interface BacktestSignal {
  id: string
  symbol: string
  direction: 'bullish' | 'bearish' | 'neutral'
  entry: number
  tp1: number | null
  tp2: number | null
  tp3: number | null
  sl: number | null
  timestamp: number
  source: string
}

export interface BacktestResult {
  id: string
  symbol: string
  direction: string
  entryPrice: number
  tp1: number | null
  tp2: number | null
  tp3: number | null
  sl: number | null
  outcome: 'win' | 'loss' | 'expired'
  exitPrice: number | null
  pnlPercent: number | null
  hitTarget: string | null
  durationHours: number | null
  source: string
  signalId: string | null
  backtestDate: Date
}

export interface BacktestStats {
  totalSignals: number
  wins: number
  losses: number
  expired: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  avgDurationHours: number
}

/**
 * Fetch historical OHLCV data from Binance
 */
async function fetchHistoricalPrices(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<Array<{ time: number; open: number; high: number; low: number; close: number }>> {
  try {
    const interval = '1h' // 1 hour candles
    const limit = 1000
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []

    const data = (await res.json()) as Array<[number, string, string, string, string, string]>

    return data.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }))
  } catch {
    return []
  }
}

/**
 * Check if a signal hit TP or SL first
 */
function checkOutcome(
  candles: Array<{ time: number; high: number; low: number; close: number }>,
  signal: BacktestSignal
): { outcome: 'win' | 'loss' | 'expired'; exitPrice: number | null; hitTarget: string | null; durationHours: number | null } {
  if (!signal.entry || !signal.sl) {
    return { outcome: 'expired', exitPrice: null, hitTarget: null, durationHours: null }
  }

  const isBullish = signal.direction === 'bullish'
  const entryTime = signal.timestamp

  // Check each candle after signal
  for (const candle of candles) {
    if (candle.time <= entryTime) continue

    // Check if SL hit first
    if (isBullish) {
      if (candle.low <= signal.sl) {
        const duration = (candle.time - entryTime) / (1000 * 60 * 60)
        return { outcome: 'loss', exitPrice: signal.sl, hitTarget: 'sl', durationHours: duration }
      }
    } else {
      if (candle.high >= signal.sl) {
        const duration = (candle.time - entryTime) / (1000 * 60 * 60)
        return { outcome: 'loss', exitPrice: signal.sl, hitTarget: 'sl', durationHours: duration }
      }
    }

    // Check TP targets (closest first)
    const targets = [
      { price: signal.tp1, name: 'tp1' },
      { price: signal.tp2, name: 'tp2' },
      { price: signal.tp3, name: 'tp3' },
    ].filter(t => t.price !== null)

    for (const target of targets) {
      if (isBullish) {
        if (candle.high >= target.price!) {
          const duration = (candle.time - entryTime) / (1000 * 60 * 60)
          return { outcome: 'win', exitPrice: target.price!, hitTarget: target.name, durationHours: duration }
        }
      } else {
        if (candle.low <= target.price!) {
          const duration = (candle.time - entryTime) / (1000 * 60 * 60)
          return { outcome: 'win', exitPrice: target.price!, hitTarget: target.name, durationHours: duration }
        }
      }
    }
  }

  // No TP or SL hit within data range
  const lastCandle = candles[candles.length - 1]
  if (lastCandle) {
    const duration = (lastCandle.time - entryTime) / (1000 * 60 * 60)
    const pnl = isBullish
      ? ((lastCandle.close - signal.entry) / signal.entry) * 100
      : ((signal.entry - lastCandle.close) / signal.entry) * 100

    return {
      outcome: 'expired',
      exitPrice: lastCandle.close,
      hitTarget: null,
      durationHours: duration,
    }
  }

  return { outcome: 'expired', exitPrice: null, hitTarget: null, durationHours: null }
}

/**
 * Run backtest for a set of signals
 */
export async function runBacktest(
  signals: BacktestSignal[],
  periodDays: number = 30
): Promise<{ results: BacktestResult[]; stats: BacktestStats }> {
  const now = Date.now()
  const startTime = now - periodDays * 24 * 60 * 60 * 1000
  const results: BacktestResult[] = []

  // Group signals by symbol for efficient price fetching
  const signalsBySymbol = new Map<string, BacktestSignal[]>()
  for (const signal of signals) {
    const existing = signalsBySymbol.get(signal.symbol) ?? []
    existing.push(signal)
    signalsBySymbol.set(signal.symbol, existing)
  }

  // Process each symbol
  for (const [symbol, symbolSignals] of signalsBySymbol) {
    // Fetch historical prices
    const candles = await fetchHistoricalPrices(symbol, startTime, now)
    if (candles.length === 0) continue

    // Check each signal
    for (const signal of symbolSignals) {
      const { outcome, exitPrice, hitTarget, durationHours } = checkOutcome(candles, signal)

      // Calculate PnL
      let pnlPercent: number | null = null
      if (exitPrice && signal.entry) {
        if (signal.direction === 'bullish') {
          pnlPercent = ((exitPrice - signal.entry) / signal.entry) * 100
        } else {
          pnlPercent = ((signal.entry - exitPrice) / signal.entry) * 100
        }
      }

      const result: BacktestResult = {
        id: `bt-${signal.id}`,
        symbol: signal.symbol,
        direction: signal.direction,
        entryPrice: signal.entry,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        sl: signal.sl,
        outcome,
        exitPrice,
        pnlPercent,
        hitTarget,
        durationHours,
        source: signal.source,
        signalId: signal.id,
        backtestDate: new Date(signal.timestamp),
      }

      results.push(result)
    }
  }

  // Calculate stats
  const stats = calculateStats(results)

  return { results, stats }
}

/**
 * Calculate backtest statistics
 */
function calculateStats(results: BacktestResult[]): BacktestStats {
  const wins = results.filter(r => r.outcome === 'win')
  const losses = results.filter(r => r.outcome === 'loss')
  const expired = results.filter(r => r.outcome === 'expired')

  const winRate = results.length > 0 ? (wins.length / results.length) * 100 : 0

  const avgWin = wins.length > 0
    ? wins.reduce((sum, r) => sum + (r.pnlPercent ?? 0), 0) / wins.length
    : 0

  const avgLoss = losses.length > 0
    ? losses.reduce((sum, r) => sum + (r.pnlPercent ?? 0), 0) / losses.length
    : 0

  const grossProfit = wins.reduce((sum, r) => sum + Math.abs(r.pnlPercent ?? 0), 0)
  const grossLoss = losses.reduce((sum, r) => sum + Math.abs(r.pnlPercent ?? 0), 0)
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Calculate max drawdown
  let maxDrawdown = 0
  let peak = 0
  let equity = 100 // Starting equity
  for (const r of results) {
    equity *= 1 + (r.pnlPercent ?? 0) / 100
    peak = Math.max(peak, equity)
    const drawdown = (peak - equity) / peak
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  }

  const avgDurationHours = results.length > 0
    ? results.reduce((sum, r) => sum + (r.durationHours ?? 0), 0) / results.length
    : 0

  return {
    totalSignals: results.length,
    wins: wins.length,
    losses: losses.length,
    expired: expired.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown: maxDrawdown * 100,
    avgDurationHours,
  }
}

/**
 * Save backtest results to database
 */
export async function saveBacktestResults(results: BacktestResult[]): Promise<void> {
  for (const result of results) {
    await prisma.backtestResult.create({
      data: {
        symbol: result.symbol,
        direction: result.direction,
        entryPrice: result.entryPrice,
        tp1: result.tp1,
        tp2: result.tp2,
        tp3: result.tp3,
        sl: result.sl,
        outcome: result.outcome,
        exitPrice: result.exitPrice,
        pnlPercent: result.pnlPercent,
        hitTarget: result.hitTarget,
        durationHours: result.durationHours,
        source: result.source,
        signalId: result.signalId,
        backtestDate: result.backtestDate,
      },
    })
  }
}

/**
 * Get backtest results from database
 */
export async function getBacktestResults(
  symbol?: string,
  periodDays?: number,
  limit: number = 100
): Promise<BacktestResult[]> {
  const where: Record<string, unknown> = {}
  if (symbol) where.symbol = symbol
  if (periodDays) {
    where.backtestDate = {
      gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
    }
  }

  const results = await prisma.backtestResult.findMany({
    where,
    orderBy: { backtestDate: 'desc' },
    take: limit,
  })

  return results.map(r => ({
    id: r.id,
    symbol: r.symbol,
    direction: r.direction,
    entryPrice: r.entryPrice,
    tp1: r.tp1,
    tp2: r.tp2,
    tp3: r.tp3,
    sl: r.sl,
    outcome: r.outcome as 'win' | 'loss' | 'expired',
    exitPrice: r.exitPrice,
    pnlPercent: r.pnlPercent,
    hitTarget: r.hitTarget,
    durationHours: r.durationHours,
    source: r.source,
    signalId: r.signalId,
    backtestDate: r.backtestDate,
  }))
}

/**
 * Get backtest statistics from database
 */
export async function getBacktestStats(
  symbol?: string,
  periodDays?: number
): Promise<BacktestStats> {
  const results = await getBacktestResults(symbol, periodDays, 10000)
  return calculateStats(results)
}
