// ─────────────────────────────────────────────────────────────
// GET /api/v1/arbitrage — Cross-Exchange Arbitrage Scanner
// Finds price spreads, funding rate differentials, and
// spot-perp basis across Binance, Bybit, OKX
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getCached } from '@/lib/api/server-cache'
import { scanArbitrage, type ArbitrageScanOptions } from '@/lib/modules/market/arbitrage-engine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Query params
    const category = (searchParams.get('category') ?? 'all') as 'all' | 'price' | 'funding' | 'basis'
    const minSpreadBps = Number(searchParams.get('minSpread') ?? 3)
    const minFundingBps = Number(searchParams.get('minFunding') ?? 50)
    const minBasisPercent = Number(searchParams.get('minBasis') ?? 0.05)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)))
    const symbolsParam = searchParams.get('symbols')
    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : undefined

    const options: ArbitrageScanOptions = {
      minSpreadBps,
      minFundingBps,
      minBasisPercent,
      limit,
      symbols,
    }

    const { data, fromCache } = await getCached(
      `arbitrage:${category}:${minSpreadBps}:${minFundingBps}:${minBasisPercent}:${limit}:${symbolsParam ?? 'all'}`,
      10_000, // 15s cache — prices move fast
      () => scanArbitrage(options),
    )

    // Filter response by category
    let responseData: Record<string, unknown>

    if (category === 'price') {
      responseData = {
        priceSpreads: data.priceSpreads,
        summary: { topSpread: data.summary.topSpread, count: data.priceSpreads.length },
      }
    } else if (category === 'funding') {
      responseData = {
        fundingArbitrage: data.fundingArbitrage,
        summary: { topFunding: data.summary.topFunding, count: data.fundingArbitrage.length },
      }
    } else if (category === 'basis') {
      responseData = {
        spotPerpArbitrage: data.spotPerpArbitrage,
        summary: { topBasis: data.summary.topBasis, count: data.spotPerpArbitrage.length },
      }
    } else {
      responseData = {
        priceSpreads: data.priceSpreads,
        fundingArbitrage: data.fundingArbitrage,
        spotPerpArbitrage: data.spotPerpArbitrage,
        summary: data.summary,
      }
    }

    const resp = NextResponse.json({
      data: { ...responseData, timestamp: data.timestamp },
      error: null,
    })
    resp.headers.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
    resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
    return resp
  } catch (error) {
    console.error('Arbitrage scan error:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to scan arbitrage opportunities' },
      { status: 502 },
    )
  }
}
