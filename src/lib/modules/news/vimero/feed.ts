// ─────────────────────────────────────────────────────────────
// VIMERO Feed Proxy — wrapped as DataModule for caching/health
// Fetches trackai.adanghdyt.com/api/feed with 60s cache
// ─────────────────────────────────────────────────────────────

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../../types'
import { TTL } from '../../types'
import { cachedFetch } from '../../fetch-with-cache'

const VIMERO_FEED = 'https://trackai.adanghdyt.com/api/feed'

async function fetchVimero(_params: FetchParams): Promise<unknown> {
  const res = await fetch(VIMERO_FEED, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`VIMERO: ${res.status}`)
  return res.json()
}

const vimeroModule: DataModule = {
  id: 'vimero-feed-proxy',
  name: 'VIMERO Feed Proxy',
  category: 'news',
  sourceType: 're',
  provenance: {
    describesItself: 'AI news feed from VIMERO Terminal (reverse-engineered, no key)',
    fragility: 'moderate',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },
  isEnabled: () => true,
  fallbackFn<T>(_params: import('../../types').FetchParams): Promise<import('../../types').ModuleResult<T>> {
    return Promise.resolve({ data: { items: [], top: [], desk_counts: {}, leaderboard: null } as T, source: 'vimero-fallback', cached: true, timestamp: Date.now(), ttl: 300000 })
  },
  async healthCheck(): Promise<ModuleHealth> {
    try {
      await fetchVimero({})
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },
  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('vimero-feed-proxy', params, TTL.NEWS, () => fetchVimero(params) as Promise<T>)
  },
}
export default vimeroModule
