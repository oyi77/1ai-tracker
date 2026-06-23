// ─────────────────────────────────────────────────────────────
// GET /api/v1/mempool — Mempool Radar
// Pending whale transactions, mempool stats, fee levels
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api/response'
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

        const response = NextResponse.json({
          data: {
            count: txCount,
            totalFee,
            fees: feeData,
            congestion,
            avgFee: txCount > 0 ? Math.round(totalFee / txCount) : 0,
            vsize: (mempoolData?.vsize as number) ?? 0,
          },
          error: null,
        }, {
          headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' },
        })
        return response
      }

      case 'whale': {
        // Detect whale transactions from recent Bitcoin blocks via mempool.space & blockchain.info
        const WHALE_THRESHOLD_BTC = 2 // ~$130K+
        const txs: Array<Record<string, unknown>> = []
        let btcPrice = 0
        try {
          // Get BTC price
          try {
            const priceRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4400'}/api/v1/market/prices`, { signal: AbortSignal.timeout(10_000) })
            const priceData = await priceRes.json() as { data?: { tickers?: Array<Record<string, unknown>> } }
            const btcTicker = priceData.data?.tickers?.find((t: Record<string, unknown>) => t.symbol === 'BTC')
            if (btcTicker) btcPrice = typeof btcTicker.price === 'string' ? parseFloat(btcTicker.price.replace(/[$,]/g, '')) : (btcTicker.price as number) || 0
          } catch { /* use default */ }

          // 1. Fetch unconfirmed from blockchain.info (latest 100 txs in mempool)
          try {
            const bcRes = await fetch('https://blockchain.info/unconfirmed-transactions?format=json', { signal: AbortSignal.timeout(10_000) })
            const bcData = await bcRes.json() as { txs: Array<Record<string, unknown>> }
            for (const tx of (bcData.txs || [])) {
              const totalOut = ((tx.out as Array<Record<string, unknown>>) || [])
                .reduce((s: number, o: Record<string, unknown>) => s + ((o.value as number) || 0), 0) / 1e8
              if (totalOut >= WHALE_THRESHOLD_BTC) {
                txs.push({
                  txid: tx.hash,
                  valueBtc: totalOut,
                  valueUsd: totalOut * btcPrice,
                  block: 'mempool',
                  fee: (tx.fee as number) || 0,
                  size: (tx.size as number) || 0,
                })
              }
            }
          } catch (err) {
            console.error('[mempool/whale] blockchain.info fetch failed', err)
          }

          // 2. Fetch from recent blocks on mempool.space
          const tipRes = await fetch('https://mempool.space/api/blocks/tip/height', { signal: AbortSignal.timeout(10_000) })
          const tipHeight = parseInt(await tipRes.text(), 10)

          // Scan last 3 blocks for whale TXs (mempool.space limits to 25 txs per block query)
          for (let i = 0; i < 3 && tipHeight - i > 0; i++) {
            const height = tipHeight - i
            const hashRes = await fetch(`https://mempool.space/api/block-height/${height}`, { signal: AbortSignal.timeout(10_000) })
            const blockHash = (await hashRes.text()).trim()
            
            // Fetch first 2 pages (50 txs) of each block to get more coverage
            for (const startIndex of [0, 25]) {
              const txRes = await fetch(`https://mempool.space/api/block/${blockHash}/txs/${startIndex}`, { signal: AbortSignal.timeout(15_000) })
              if (!txRes.ok) continue
              const blockTxs = await txRes.json() as Array<Record<string, unknown>>

              for (const tx of blockTxs) {
                const totalOut = ((tx.vout as Array<Record<string, unknown>>) || [])
                  .reduce((s: number, o: Record<string, unknown>) => s + ((o.value as number) || 0), 0) / 1e8
                if (totalOut >= WHALE_THRESHOLD_BTC) {
                  // avoid duplicates
                  if (!txs.some(existing => existing.txid === tx.txid)) {
                    txs.push({
                      txid: tx.txid,
                      valueBtc: totalOut,
                      valueUsd: totalOut * btcPrice,
                      block: height,
                      fee: (tx.fee as number) || 0,
                      size: (tx.size as number) || 0,
                    })
                  }
                }
              }
            }
          }
          txs.sort((a, b) => (b.valueBtc as number) - (a.valueBtc as number))
        } catch (err) {
          console.error('[mempool/whale] Fetch failed:', (err as Error).message)
        }

        return NextResponse.json({
          data: {
            transactions: txs.slice(0, 20),
            count: txs.length,
            threshold: `${WHALE_THRESHOLD_BTC} BTC (~$${btcPrice > 0 ? (WHALE_THRESHOLD_BTC * btcPrice / 1000).toFixed(0) : '?'}K)`,
            source: 'mempool.space',
          },
          error: null,
        }, {
          headers: { 'Cache-Control': 'public, max-age=60' },
        })
      }

      case 'all': {
        // Mempool.space doesn't expose full tx list via public API
        return NextResponse.json({
          data: {
            transactions: [],
            count: 0,
            note: 'Full mempool transaction list requires specialized API access',
          },
          error: null,
        }, {
          headers: { 'Cache-Control': 'public, max-age=60' },
        })
      }

      case 'blocks': {
        const blocks = await registry.fetchOne('mempool-space', { action: 'blocks' })
        const response = NextResponse.json({
          data: blocks.data,
          error: null,
        }, {
          headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
        })
        return response
      }

      case 'hashrate': {
        const hashrate = await registry.fetchOne('mempool-space', { action: 'hashrate' })
        const response = NextResponse.json({
          data: hashrate.data,
          error: null,
        }, {
          headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
        })
        return response
      }

      default:
        return apiError(`Unknown action: ${action}. Use: stats, whale, all, blocks, hashrate`, 400)
    }
  } catch (err) {
    console.error('[mempool] Error:', err)
    return apiError((err as Error).message, 502)
  }
}
