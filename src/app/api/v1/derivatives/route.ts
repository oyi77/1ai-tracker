import { NextResponse } from 'next/server'
import { registerAllModules } from '@/lib/modules'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') ?? 'BTCUSDT'
  const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') ?? 20)))

  const registry = registerAllModules()

  try {
    // Fetch all derivatives data from the module
    const result = await registry.fetchOne('binance-futures', { limit })
    const data = result.data as { pairs?: Array<Record<string, unknown>>; timestamp?: number }
    const pairs = data?.pairs || []

    return NextResponse.json({
      data: {
        topPairs: pairs.slice(0, limit),
        spotlight: pairs.find(p => p.symbol === symbol) || pairs[0] || null,
        timestamp: data?.timestamp || Date.now(),
      },
      meta: { symbol, limit, totalPairs: pairs.length },
      error: null,
    }, {
      headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    return NextResponse.json(
      { data: null, error: (err as Error).message },
      { status: 502 }
    )
  }
}
