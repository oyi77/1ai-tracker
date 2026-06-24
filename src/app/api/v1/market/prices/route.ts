// ─────────────────────────────────────────────────────────────
// GET /api/v1/market/prices — Live prices for ticker strip
// Uses Binance (crypto) + Yahoo Finance (tradfi) + EastMoney
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

  // TradFi from Yahoo Finance (via our module)
  try {
    const { registerAllModules } = await import('@/lib/modules')
    const registry = registerAllModules()
    const yfResult = await registry.fetchOne<Array<Record<string, unknown>>>(
      'yahoo-finance', { action: 'quote', symbols: '^JKSE,^GSPC,USDIDR=X,GC=F' }
    ).catch(() => null)

    if (yfResult?.data && Array.isArray(yfResult.data)) {
      for (const item of yfResult.data) {
        let sym = String(item.symbol ?? '')
        if (sym === '^JKSE') sym = 'IHSG'
        if (sym === '^GSPC') sym = 'S&P 500'
        if (sym === 'USDIDR=X') sym = 'USD/IDR'
        if (sym === 'GC=F') sym = 'GOLD'

        const price = item.regularMarketPrice as number | undefined
        const changePct = item.regularMarketChangePercent as number | undefined
        tickers.push({
          symbol: sym,
          price: price ? (price >= 1000 ? price.toLocaleString('en-US', { maximumFractionDigits: sym === 'USD/IDR' ? 0 : 2 }) : price.toFixed(2)) : '—',
          change: changePct ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%` : '—',
          positive: (changePct ?? 0) >= 0,
        })
      }
    }
  } catch { /* Yahoo down */ }

  return tickers
}

export async function GET() {
  try {
    const { data: tickers, fromCache } = await getCached('market:prices', 5_000, fetchPrices)

    const resp = NextResponse.json({ data: { tickers }, error: null })
    resp.headers.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
    resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
    return resp
  } catch (err) {
    console.error('[market/prices] Error:', err)
    return NextResponse.json({ data: null, error: 'Failed to fetch prices' }, { status: 502 })
  }
}
