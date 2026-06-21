/**
 * Module: Bitcoin Mempool
 * sourceType: public-api
 * upstreamProduct: Mempool.space
 * endpoint: mempool.space/api/v1
 * discoveredVia: docs
 * lastVerified: 2026-06-20
 * UNOFFICIAL: uses mempool.space public REST API
 * fallbackFn: empty mempool state
 *
 * Alpha signals: mempool congestion = market activity spikes,
 * fee rate spikes correlate with Bitcoin volatility.
 */

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'

const BASE = 'https://mempool.space/api/v1'

interface MempoolState {
  count: number
  vSize: number
  totalFee: number
  feeRange: number[]
}

interface MempoolData {
  mempool: MempoolState | null
  latestBlockHeight: number | null
  recommendedFees: {
    fastestFee: number
    halfHourFee: number
    hourFee: number
    economyFee: number
    minimumFee: number
  } | null
  timestamp: number
}

async function fetchMempool(_params: FetchParams): Promise<MempoolData> {
  const [mempoolRes, feesRes, heightRes] = await Promise.allSettled([
    fetch(`${BASE}/mempool`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.ok ? r.json() : null),
    fetch(`${BASE}/fees/recommended`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.ok ? r.json() : null),
    fetch(`${BASE}/blocks/tip/height`, {
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.ok ? r.text() : null),
  ])

  const mempool: MempoolState | null = mempoolRes.status === 'fulfilled' ? mempoolRes.value : null
  const recommendedFees = feesRes.status === 'fulfilled' ? feesRes.value : null
  const latestBlockHeightStr = heightRes.status === 'fulfilled' ? heightRes.value : null
  const latestBlockHeight = latestBlockHeightStr ? parseInt(latestBlockHeightStr, 10) : null

  return {
    mempool,
    latestBlockHeight,
    recommendedFees,
    timestamp: Date.now(),
  }
}

const mempoolModule: DataModule = {
  id: 'mempool',
  name: 'Bitcoin Mempool',
  category: 'onchain',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Bitcoin mempool state, fee rates, and block height from mempool.space',
    upstreamProduct: 'Mempool.space',
    discoveredVia: 'docs',
    fragility: 'stable',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await fetch(`${BASE}/blocks/tip/height`, { signal: AbortSignal.timeout(5_000) })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('mempool', params, TTL.PRICE_DATA, () => fetchMempool(params) as Promise<T>)
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { mempool: null, latestBlockHeight: null, recommendedFees: null, timestamp: Date.now() } as unknown as T,
      source: 'mempool (empty fallback)', cached: false, timestamp: Date.now(), ttl: TTL.PRICE_DATA,
    }
  },
}

export default mempoolModule
