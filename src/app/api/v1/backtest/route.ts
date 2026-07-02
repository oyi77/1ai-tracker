// ─────────────────────────────────────────────────────────────
// GET /api/v1/backtest — Backtest signals against historical prices
// ?symbol=BTC&period=30d&action=run|stats|results
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { apiJson, apiError } from '@/lib/api/response'
import { runBacktest, getBacktestResults, getBacktestStats, type BacktestSignal } from '@/lib/modules/derived/backtest-engine'
import { getAlphaSignals } from '@/lib/modules/derived/alpha-engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') ?? undefined
  const period = parseInt(searchParams.get('period') ?? '30')
  const action = searchParams.get('action') ?? 'stats'

  try {
    if (action === 'run') {
      // Run backtest on recent signals
      const { signals } = await getAlphaSignals()

      // Convert to backtest format
      const backtestSignals: BacktestSignal[] = signals
        .filter(s => s.entry && s.sl)
        .map(s => ({
          id: s.id,
          symbol: s.symbol,
          direction: s.direction,
          entry: s.entry!,
          tp1: s.tp1,
          tp2: s.tp2,
          tp3: s.tp3,
          sl: s.sl,
          timestamp: s.timestamp,
          source: s.sources[0] ?? 'unknown',
        }))

      const { results, stats } = await runBacktest(backtestSignals, period)

      return apiJson({ stats, results: results.slice(0, 50), period })
    }

    if (action === 'results') {
      const results = await getBacktestResults(symbol, period, 100)
      return apiJson({ results, count: results.length })
    }

    // Default: stats
    const stats = await getBacktestStats(symbol, period)
    return apiJson({ stats, symbol, period })

  } catch (err) {
    console.error('Backtest error:', err)
    return apiError('Failed to run backtest', 502)
  }
}
