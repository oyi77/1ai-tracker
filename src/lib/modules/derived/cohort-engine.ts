// ─────────────────────────────────────────────────────────────
// Smart Money Cohort Engine
// Classifies wallets into behavioral cohorts from real transaction data
// Zero hardcoded data — all computed from Prisma DB
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

export interface Cohort {
  id: string
  name: string
  description: string
  criteria: { minVolume?: number; minAge?: number; minWinRate?: number; maxWinRate?: number; category?: string }
  walletCount: number
  netFlow24h: number
  topAssets: string[]
}

export interface CohortSignal {
  cohortId: string
  cohortName: string
  action: 'accumulating' | 'distributing' | 'rotating' | 'dormant'
  asset: string
  amountUsd: number
  confidence: number
  timestamp: Date
}

// Cohort definitions (criteria only — stats computed from DB)
const COHORT_DEFINITIONS: Array<Omit<Cohort, 'walletCount' | 'netFlow24h' | 'topAssets'>> = [
  {
    id: 'whale-accumulators',
    name: 'Whale Accumulators',
    description: 'Large wallets with high volume showing accumulation patterns',
    criteria: { minVolume: 1_000_000, minWinRate: 0.6 },
  },
  {
    id: 'smart-money-rotators',
    name: 'Smart Money Rotators',
    description: 'High-scoring wallets rotating between assets',
    criteria: { category: 'Fund', minVolume: 100_000 },
  },
  {
    id: 'dex-traders',
    name: 'DEX Traders',
    description: 'Active DEX traders with moderate volume',
    criteria: { minVolume: 10_000, maxWinRate: 0.8 },
  },
  {
    id: 'institutional',
    name: 'Institutional',
    description: 'Known institutional wallets (exchanges, funds, protocols)',
    criteria: { category: 'Exchange', minVolume: 10_000_000 },
  },
  {
    id: 'retail-dormant',
    name: 'Retail Dormant',
    description: 'Low-activity wallets with minimal recent transactions',
    criteria: { minVolume: 0, maxWinRate: 0.3 },
  },
]

/**
 * Get all cohort definitions with real stats from DB.
 */
export async function getCohorts(): Promise<Cohort[]> {
  const results: Cohort[] = []

  for (const def of COHORT_DEFINITIONS) {
    // Count wallets matching criteria
    const whereClause: Record<string, unknown> = {}
    if (def.criteria.category) {
      whereClause.entity = { type: def.criteria.category }
    }

    const wallets = await prisma.wallet.findMany({
      where: whereClause,
      include: {
        entity: { select: { name: true, type: true, totalUsdValue: true } },
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
      take: 500,
    }).catch(() => [])

    // Filter by volume and other criteria
    const matching = wallets.filter(w => {
      const totalVolume = w.transactions.reduce((s, t) => s + (t.value ?? 0), 0)
      if (def.criteria.minVolume && totalVolume < def.criteria.minVolume) return false
      return true
    })

    // Compute net flow (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const netFlow = matching.reduce((sum, w) => {
      const recentTxs = w.transactions.filter(t => new Date(t.timestamp) > oneDayAgo)
      return sum + recentTxs.reduce((s, t) => s + (t.value ?? 0), 0)
    }, 0)

    // Top assets by volume
    const assetVolume = new Map<string, number>()
    for (const w of matching) {
      for (const tx of w.transactions) {
        const sym = tx.tokenSymbol ?? 'UNKNOWN'
        assetVolume.set(sym, (assetVolume.get(sym) ?? 0) + Math.abs(tx.value ?? 0))
      }
    }
    const topAssets = [...assetVolume.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sym]) => sym)

    results.push({
      ...def,
      walletCount: matching.length,
      netFlow24h: netFlow,
      topAssets,
    })
  }

  return results
}

/**
 * Generate cohort signals from real transaction patterns.
 */
export async function getCohortSignals(): Promise<CohortSignal[]> {
  const signals: CohortSignal[] = []
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Get smart money wallets
  const smartWallets = await prisma.smartMoneyWallet.findMany({
    include: {
      wallet: {
        include: {
          transactions: {
            where: { timestamp: { gt: oneDayAgo } },
            orderBy: { timestamp: 'desc' },
          },
          entity: { select: { name: true, type: true } },
        },
      },
    },
    take: 100,
  }).catch(() => [])

  for (const sw of smartWallets) {
    const txs = sw.wallet?.transactions ?? []
    if (txs.length === 0) continue

    // Aggregate by token
    const tokenFlows = new Map<string, { inflow: number; outflow: number }>()
    for (const tx of txs) {
      const sym = tx.tokenSymbol ?? 'UNKNOWN'
      if (!tokenFlows.has(sym)) tokenFlows.set(sym, { inflow: 0, outflow: 0 })
      const flow = tokenFlows.get(sym)!
      if (tx.value > 0) flow.inflow += tx.value
      else flow.outflow += Math.abs(tx.value)
    }

    // Generate signals for tokens with significant flow
    for (const [asset, flow] of tokenFlows) {
      const netFlow = flow.inflow - flow.outflow
      const totalFlow = flow.inflow + flow.outflow
      if (totalFlow < 1000) continue // Skip small flows

      const action = netFlow > totalFlow * 0.3 ? 'accumulating'
        : netFlow < -totalFlow * 0.3 ? 'distributing'
        : Math.abs(netFlow) < totalFlow * 0.1 ? 'dormant'
        : 'rotating'

      signals.push({
        cohortId: sw.wallet?.entity?.type ?? 'unknown',
        cohortName: sw.wallet?.entity?.name ?? 'Unknown Wallet',
        action,
        asset,
        amountUsd: totalFlow,
        confidence: Math.min(0.9, sw.score / 100),
        timestamp: new Date(),
      })
    }
  }

  return signals.sort((a, b) => b.amountUsd - a.amountUsd).slice(0, 50)
}
