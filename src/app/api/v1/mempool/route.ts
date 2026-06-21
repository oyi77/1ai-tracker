// ─────────────────────────────────────────────────────────────
// GET /api/v1/mempool — Mempool Radar
// Pending whale transactions, mempool stats, fee levels
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { registerAllModules } from '@/lib/modules'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? 'stats'
  const registry = registerAllModules()
  try {
    switch (action) {
      case 'stats': {
        const [fees, mempool] = await Promise.all([
          registry.fetchOne('mempool-space', { action: 'fees' }),
          registry.fetchOne('mempool-space', { action: 'mempool' }),
        ])

        const mempoolData = mempool.data as Record<string, unknown>
        const feeData = fees.data as Record<string, unknown>
        const txCount = (mempoolData?.count as number) ?? 0
        const totalFee = (mempoolData?.total_fee as number) ?? 0

        // Determine congestion level based on mempool size
        let congestion: { level: string; color: string; description: string }
        if (txCount < 5000) {
          congestion = { level: 'low', color: 'green', description: 'Mempool is clear' }
        } else if (txCount < 20000) {
          congestion = { level: 'medium', color: 'yellow', description: 'Moderate congestion' }
        } else if (txCount < 50000) {
          congestion = { level: 'high', color: 'orange', description: 'High congestion' }
        } else {
          congestion = { level: 'extreme', color: 'red', description: 'Extreme congestion' }
        }

        return NextResponse.json({
          count: txCount,
          totalFee,
          fees: feeData,
          congestion,
          avgFee: txCount > 0 ? Math.round(totalFee / txCount) : 0,
          vsize: (mempoolData?.vsize as number) ?? 0,
        }, {
          headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' },
        })
      }

      case 'whale': {
        // Mempool.space doesn't have a direct whale endpoint
        // Return empty array with info message
        return NextResponse.json({
          data: [],
          count: 0,
          threshold: '10 BTC (~$100K)',
          note: 'Whale detection requires Blockstream API which is currently unavailable',
        }, {
          headers: { 'Cache-Control': 'public, max-age=60' },
        })
      }

      case 'all': {
        // Mempool.space doesn't expose full tx list via public API
        return NextResponse.json({
          data: [],
          count: 0,
          note: 'Full mempool transaction list requires specialized API access',
        }, {
          headers: { 'Cache-Control': 'public, max-age=60' },
        })
      }

      case 'blocks': {
        const blocks = await registry.fetchOne('mempool-space', { action: 'blocks' })
        return NextResponse.json({
          data: blocks.data,
          count: Array.isArray(blocks.data) ? blocks.data.length : 0,
        }, {
          headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
        })
      }

      case 'hashrate': {
        const hashrate = await registry.fetchOne('mempool-space', { action: 'hashrate' })
        return NextResponse.json({
          data: hashrate.data,
        }, {
          headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: stats, whale, all, blocks, hashrate` },
          { status: 400 },
        )
    }
  } catch (err) {
    console.error('[mempool] Error:', err)
    return NextResponse.json(
      { error: (err as Error).message, data: [] },
      { status: 502 },
    )
  }
}
