// ─────────────────────────────────────────────────────────────
// GET /api/v1/infra-signals — Infrastructure Signals
// Lightning Network, mempool congestion, hash rate
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { fetchInfraSignals, persistInfraSignals, fetchLightning, fetchMempoolCongestion, fetchHashRate, fetchBtcPrice } from '@/lib/modules/chain/infra-signals'
import { getCached } from '@/lib/api/server-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? 'snapshot'

  try {
    switch (action) {
      case 'snapshot': {
        const { data, fromCache } = await getCached('infra:snapshot', 60_000, async () => {
          const snapshot = await fetchInfraSignals()
          // Persist in background — don't block response
          persistInfraSignals(snapshot).catch(() => {})
          return snapshot
        })

        const resp = NextResponse.json({ data, error: null }, {
          headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
        })
        resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        return resp
      }

      case 'lightning': {
        const { data, fromCache } = await getCached('infra:lightning', 120_000, async () => {
          return await fetchLightning()
        })

        const resp = NextResponse.json({ data, error: null }, {
          headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
        })
        resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        return resp
      }

      case 'mempool': {
        const { data, fromCache } = await getCached('infra:mempool', 15_000, async () => {
          return await fetchMempoolCongestion()
        })

        const resp = NextResponse.json({ data, error: null }, {
          headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' },
        })
        resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        return resp
      }

      case 'hashrate': {
        const { data, fromCache } = await getCached('infra:hashrate', 60_000, async () => {
          return await fetchHashRate()
        })

        const resp = NextResponse.json({ data, error: null }, {
          headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
        })
        resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        return resp
      }

      case 'price': {
        const { data, fromCache } = await getCached('infra:price', 30_000, async () => {
          return await fetchBtcPrice()
        })

        const resp = NextResponse.json({ data, error: null }, {
          headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
        })
        resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        return resp
      }

      default:
        return NextResponse.json(
          { data: null, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (err) {
    return NextResponse.json(
      { data: null, error: (err as Error).message },
      { status: 502 },
    )
  }
}
