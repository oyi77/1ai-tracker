// ─────────────────────────────────────────────────────────────
// CryptoCompare-Compatible Data Module
// Provides social stats and news from real APIs
// Zero hardcoded data — all from CoinGecko + RSS engine
// ─────────────────────────────────────────────────────────────

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

interface CoinGeckoSocialData {
  reddit_subscribers?: number
  reddit_accounts_active_48h?: number
  telegram_channel_user_count?: number
  twitter_followers?: number
  alexa_rank?: number
  github_forks?: number
  github_stars?: number
}

interface SocialStats {
  reddit: { subscribers: number; activeAccounts: number }
  telegram: { members: number }
  twitter: { followers: number }
  github: { forks: number; stars: number }
}

// Popular coin IDs for social stats
const TRACKED_COINS = [
  'bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot',
  'chainlink', 'uniswap', 'aave', 'maker', 'litecoin',
  'ripple', 'dogecoin', 'avalanche-2', 'polygon-pos',
  'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism',
]

async function fetchSocialStats(coinId: string): Promise<SocialStats | null> {
  try {
    const res = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return null

    const data = await res.json() as { community_data?: CoinGeckoSocialData }
    const social = data.community_data
    if (!social) return null

    return {
      reddit: {
        subscribers: social.reddit_subscribers ?? 0,
        activeAccounts: social.reddit_accounts_active_48h ?? 0,
      },
      telegram: {
        members: social.telegram_channel_user_count ?? 0,
      },
      twitter: {
        followers: social.twitter_followers ?? 0,
      },
      github: {
        forks: social.github_forks ?? 0,
        stars: social.github_stars ?? 0,
      },
    }
  } catch {
    return null
  }
}

async function fetchAllSocialStats(): Promise<Record<string, SocialStats>> {
  const results: Record<string, SocialStats> = {}

  // Fetch in batches of 5 to avoid rate limits
  for (let i = 0; i < TRACKED_COINS.length; i += 5) {
    const batch = TRACKED_COINS.slice(i, i + 5)
    const fetched = await Promise.allSettled(batch.map(coin => fetchSocialStats(coin)))
    for (let j = 0; j < batch.length; j++) {
      const result = fetched[j]
      if (result.status === 'fulfilled' && result.value) {
        results[batch[j]] = result.value
      }
    }
  }

  return results
}

async function fetchCryptoCompareData(params: FetchParams): Promise<unknown> {
  const action = (params.action as string) ?? 'social-stats'

  switch (action) {
    case 'social-stats': {
      const coinId = params.coinId as string | undefined
      if (coinId) {
        const stats = await fetchSocialStats(coinId)
        return { coinId, stats }
      }
      const allStats = await fetchAllSocialStats()
      return { stats: allStats, count: Object.keys(allStats).length }
    }
    case 'news': {
      // News is handled by the RSS engine, not CryptoCompare
      return { articles: [], note: 'Use RSS engine (/api/v1/news) for crypto news' }
    }
    default:
      return { error: `Unknown action: ${action}` }
  }
}

const cryptocompareModule: DataModule = {
  id: 'cryptocompare',
  name: 'CryptoCompare (CoinGecko Social)',
  category: 'sentiment',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Social stats from CoinGecko community_data — Reddit subscribers, Twitter followers, Telegram members, GitHub activity',
    fragility: 'stable',
    lastVerified: '2026-06-30',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await fetch(`${COINGECKO_BASE}/ping`, { signal: AbortSignal.timeout(5_000) })
      if (res.ok) return { status: 'active', lastChecked: new Date(), failureCount: 0 }
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1 }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>(
      'cryptocompare',
      params,
      TTL.SENTIMENT,
      () => fetchCryptoCompareData(params) as Promise<T>,
    )
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return { data: {} as T, source: 'cryptocompare (empty fallback)', cached: true, timestamp: Date.now(), ttl: TTL.SENTIMENT }
  },
}

export default cryptocompareModule
