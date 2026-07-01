// ─────────────────────────────────────────────────────────────
// GET /api/v1/market/prices — Live prices for ticker strip
// Uses Binance (crypto) + Yahoo Finance (tradfi/forex) + Frankfurter (ECB)
// All wrapped in getCached with single-flight dedup
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getCached } from '@/lib/api/server-cache'

interface TickerItem {
  symbol: string
  price: string
  change: string
  positive: boolean
}

const YF_BASES = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']

async function yfChartQuote(symbol: string): Promise<{ symbol: string; price: number; change: number } | null> {
  for (const base of YF_BASES) {
    try {
      const res = await fetch(`${base}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) continue
      const data = await res.json() as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } }
      const meta = data.chart?.result?.[0]?.meta
      if (!meta) continue
      const price = meta.regularMarketPrice as number | undefined
      const prevClose = meta.chartPreviousClose as number | undefined
      const change = price != null && prevClose != null && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0
      if (price != null) return { symbol: meta.symbol as string ?? symbol, price, change }
    } catch { continue }
  }
  return null
}

async function fetchPrices(): Promise<TickerItem[]> {
  const tickers: TickerItem[] = []

  // Crypto from Binance (no rate limits)
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]', {
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const data = (await res.json()) as Array<{ symbol: string; lastPrice: string; priceChangePercent: string }>
      const map: Record<string, string> = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' }
      for (const t of data) {
        const sym = map[t.symbol]
        if (sym) {
          const price = parseFloat(t.lastPrice)
          const change = parseFloat(t.priceChangePercent)
          tickers.push({
            symbol: sym,
            price: price >= 1000 ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${price.toFixed(2)}`,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
            positive: change >= 0,
          })
        }
      }
    }
  } catch { /* Binance down */ }

  // TradFi + Forex from Yahoo Finance (direct, bypass module cache)
  const yfSymbols: Array<[string, string]> = [
    ['^JKSE', 'IHSG'],
    ['^GSPC', 'S&P 500'],
    ['IDR=X', 'USD/IDR'],
    ['GC=F', 'GOLD'],
    ['EURUSD=X', 'EUR/USD'],
    ['GBPUSD=X', 'GBP/USD'],
    ['JPY=X', 'USD/JPY'],
    ['AUDUSD=X', 'AUD/USD'],
  ]

  const yfResults = await Promise.allSettled(yfSymbols.map(([sym]) => yfChartQuote(sym)))
  for (let i = 0; i < yfSymbols.length; i++) {
    const result = yfResults[i]
    if (result.status === 'fulfilled' && result.value) {
      const [, displayName] = yfSymbols[i]
      const { price, change } = result.value
      tickers.push({
        symbol: displayName,
        price: price >= 1000 ? price.toLocaleString('en-US', { maximumFractionDigits: displayName === 'USD/IDR' ? 0 : 2 }) : price.toFixed(4),
        change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        positive: change >= 0,
      })
    }
  }

  return tickers
}

export async function GET() {
  try {
    const { data: tickers, fromCache } = await getCached('market:prices', 10_000, fetchPrices)

    const resp = NextResponse.json({ data: { tickers }, error: null })
    resp.headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=20')
    resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
    return resp
  } catch (err) {
    console.error('[market/prices] Error:', err)
    return NextResponse.json({ data: null, error: 'Failed to fetch prices' }, { status: 502 })
  }
}
