// ─────────────────────────────────────────────────────────────
// Whale Wallet Clustering — identify connected wallets
// Uses DB entity data only (no hardcoded addresses)
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

export interface WalletCluster {
  id: string
  wallets: string[]
  estimatedSize: number
  connectionMethod: string
  confidence: number
  label?: string
}

let cachedClusters: WalletCluster[] = []
let lastFetch = 0
const CACHE_TTL = 5 * 60_000

/**
 * Detect wallet clusters from DB entities only.
 */
export async function detectClusters(): Promise<WalletCluster[]> {
  const now = Date.now()
  if (cachedClusters.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedClusters
  }

  const clusters: WalletCluster[] = []

  // Fetch entities from DB
  try {
    const entities = await prisma.entity.findMany({
      include: { wallets: { select: { address: true, chain: true } } },
      orderBy: { totalUsdValue: 'desc' },
      take: 30,
    })

    for (const entity of entities) {
      const wallets = entity.wallets.map(w => w.address)
      if (wallets.length === 0) continue

      clusters.push({
        id: `entity-${entity.id}`,
        wallets,
        estimatedSize: entity.totalUsdValue,
        connectionMethod: entity.type === 'exchange' ? 'Exchange entity' : entity.type === 'fund' ? 'Fund entity' : 'On-chain entity',
        confidence: entity.verified ? 0.9 : 0.7,
        label: entity.name,
      })
    }
  } catch (err) {
    console.error('[whale-clustering] DB fetch failed:', (err as Error).message)
  }

  // Sort by estimated size
  clusters.sort((a, b) => b.estimatedSize - a.estimatedSize)

  cachedClusters = clusters
  lastFetch = now
  return clusters
}

export function areWalletsConnected(_walletA: string, _walletB: string): { connected: boolean; confidence: number; method: string } {
  return { connected: false, confidence: 0, method: 'Insufficient data' }
}

export function getClusterById(id: string): WalletCluster | undefined {
  return cachedClusters.find(c => c.id === id)
}
