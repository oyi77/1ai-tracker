// ─────────────────────────────────────────────────────────────
// ALPHA SOURCE /api/v1/feed — Unified aggregated endpoint
// Single call returns ALL data. Source identifiers stripped.
// Cache-Control headers for CDN/proxy caching.
// 60s server cache + single-flight dedup.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { registerAllModules, ModuleRegistry } from '@/lib/modules'

interface FeedItem {
  id: string
  t: string
  s?: string
  u?: string
  ts: number
  h: number
  c: string
}

interface FeedCategory {
  id: string
  label: string
  count: number
  items: FeedItem[]
}

interface PriceItem {
  s: string
  p: string
  c: string
  d: boolean
}

interface FeedResponse {
  feed: FeedCategory[]
  top: FeedItem[]
  prices: PriceItem[]
  sentiment: { fg: number; label: string; color: string } | null
  alerts: FeedItem[]
  generated: string
  ttl: number
  flow: unknown | null
}

let feedCache: { data: FeedResponse; ts: number } | null = null
const FEED_TTL = 60_000
let inflight: Promise<FeedResponse> | null = null

interface VimeroItem {
  id?: string
  title?: string
  link?: string
  source?: string
  desk?: string
  summary?: string
  summary_id?: string
  epoch?: number
  heat?: number
  buzz?: number
}

interface VimeroTopItem {
  id?: string
  title?: string
  take?: string
  summary?: string
  summary_id?: string
  link?: string
  epoch?: number
  heat?: number
  _impact?: number
  buzz?: number
}

interface MergedVimeroItem {
  id?: string
  title?: string
  take?: string
  summary?: string
  summary_id?: string
  link?: string
  epoch?: number
  heat?: number
  _impact?: number
  buzz?: number
  desk?: string
}

interface VimeroResponse {
  items?: VimeroItem[]
  top?: VimeroTopItem[]
  desk_counts?: Record<string, number>
}

interface DefiLlamaResearchArticle {
  id: string
  title: string
  slug?: string
  subtitle?: string
  excerpt?: string
  publishedAt?: string
}

interface DefiLlamaResearchResponse {
  articles?: DefiLlamaResearchArticle[]
}

interface PriceTicker {
  symbol?: string
  price?: string | number
  change?: string | number
  positive?: boolean
}

interface PriceApiResponse {
  tickers?: PriceTicker[]
}

interface FearGreedApiResponse {
  fearGreed?: number
}

interface USGSFeature {
  properties?: {
    id?: string
    place?: string
    mag?: number
    time?: number
  }
}

interface EONETEvent {
  id?: string
  title?: string
  geometry?: Array<{
    date?: string
  }>
}

interface AltDataApiResponse {
  usgs?: {
    features?: USGSFeature[]
  }
  eonet?: {
    events?: EONETEvent[]
  }
}

interface MarketFlowApiResponse {
  summary?: unknown
}

async function safeFetch(registry: ModuleRegistry, id: string): Promise<unknown> {
  try {
    const res = await registry.fetchOne<unknown>(id, { action: 'get' })
    return res.data
  } catch {
    return null
  }
}

function buildFeed(
  items: VimeroItem[],
  top: VimeroTopItem[],
  deskCounts: Record<string, number>,
  prices: PriceApiResponse | null,
  sentiment: FearGreedApiResponse | null,
  alt: AltDataApiResponse | null,
  flow: MarketFlowApiResponse | null
): FeedResponse {
  const deskOrder = ['VIRAL', 'MODELS', 'RESEARCH', 'INDUSTRY', 'OPENSOURCE', 'CUAN', 'GENMODEL', 'SECTOR', 'AGENT', 'ROBOTICS']
  const deskLabel: Record<string, string> = {
    VIRAL: 'Trending',
    MODELS: 'Releases & Tools',
    RESEARCH: 'Research & Papers',
    INDUSTRY: 'Industry',
    OPENSOURCE: 'Open Source',
    CUAN: 'Alpha & Signals',
    GENMODEL: 'Generative AI',
    SECTOR: 'Sectors',
    AGENT: 'AI Agents',
    ROBOTICS: 'Robotics',
  }

  const feed: FeedCategory[] = deskOrder
    .filter(d => items.some((i) => i.desk === d))
    .map(desk => ({
      id: desk.toLowerCase(),
      label: deskLabel[desk] || desk,
      count: deskCounts[desk] || 0,
      items: items
        .filter((i) => i.desk === desk)
        .slice(0, 30)
        .map((i): FeedItem => ({
          id: i.id || '',
          t: i.title || '',
          s: i.summary || i.summary_id || '',
          u: i.link && i.link !== '#' ? i.link : undefined,
          ts: i.epoch || 0,
          h: i.heat || i.buzz || 0,
          c: desk,
        })),
    }))

  const rawTopList = (top.length ? top : items.slice(0, 16)) as MergedVimeroItem[]
  const topStories: FeedItem[] = rawTopList.map((t): FeedItem => ({
    id: t.id || '',
    t: t.title || t.take || '',
    s: t.take || t.summary || t.summary_id || '',
    u: t.link && t.link !== '#' ? t.link : undefined,
    ts: t.epoch || 0,
    h: t.heat || t._impact || t.buzz || 0,
    c: 'trending',
  }))

  const priceItems = (prices?.tickers || []).map((p) => {
    const symbolStr = p.symbol || ''
    const priceStr = p.price != null ? String(p.price) : ''
    const changeStr = p.change != null ? String(p.change) : ''
    const positiveVal = p.positive !== undefined ? p.positive : true
    return {
      s: symbolStr,
      p: priceStr,
      c: changeStr,
      d: positiveVal,
    }
  })

  const fearGreedVal = sentiment?.fearGreed
  const sentItem = fearGreedVal != null
    ? {
        fg: fearGreedVal,
        label: fearGreedVal >= 55 ? 'Greed' : fearGreedVal >= 45 ? 'Neutral' : 'Fear',
        color: fearGreedVal >= 55 ? '#4af6c3' : fearGreedVal >= 45 ? '#fb8b1e' : '#ff433d',
      }
    : null

  const alerts: FeedItem[] = []
  if (alt?.usgs?.features) {
    alt.usgs.features.slice(0, 5).forEach((f) => {
      const p = f.properties || {}
      alerts.push({
        id: `q-${p.id || Math.random().toString(36).slice(2)}`,
        t: `EQ: ${p.place || '?'} M${p.mag || '?'}`,
        ts: (p.time || Date.now()) / 1000,
        h: Math.round((p.mag || 0) * 20),
        c: 'alert',
      })
    })
  }
  if (alt?.eonet?.events) {
    alt.eonet.events.slice(0, 5).forEach((e) => {
      const dateStr = e.geometry?.[0]?.date
      const tsVal = dateStr ? new Date(dateStr).getTime() / 1000 : Date.now() / 1000
      alerts.push({
        id: `eo-${e.id || Math.random().toString(36).slice(2)}`,
        t: `Event: ${e.title || '?'}`,
        ts: tsVal,
        h: 50,
        c: 'alert',
      })
    })
  }

  return {
    feed,
    top: topStories,
    prices: priceItems,
    sentiment: sentItem,
    alerts: alerts.slice(0, 10),
    flow: flow?.summary ?? null,
    generated: new Date().toISOString(),
    ttl: FEED_TTL / 1000,
  }
}

async function fetchFeed(): Promise<FeedResponse> {
  if (feedCache && Date.now() - feedCache.ts < FEED_TTL) return feedCache.data
  if (inflight) return inflight

  inflight = (async () => {
    const registry = registerAllModules()
    const [vRes, sRes, dlRes] = await Promise.allSettled([
      safeFetch(registry, 'vimero-feed-proxy'),
      safeFetch(registry, 'fear-greed'),
      safeFetch(registry, 'defillama-research'),
    ])
    const [pRes, aRes, fRes] = await Promise.allSettled([
      safeFetch(registry, 'coingecko'),
      safeFetch(registry, 'usgs-earthquakes'),
      safeFetch(registry, 'market-flow'),
    ])

    let items: VimeroItem[] = []
    let top: VimeroTopItem[] = []
    let deskCounts: Record<string, number> = {}

    if (vRes.status === 'fulfilled' && vRes.value) {
      const val = vRes.value as VimeroResponse
      items = val.items || []
      top = val.top || []
      deskCounts = val.desk_counts || {}
    }

    if (dlRes.status === 'fulfilled' && dlRes.value) {
      const val = dlRes.value as DefiLlamaResearchResponse
      if (val.articles) {
        const dlArticles = val.articles.map((a): VimeroItem => ({
          id: `dl-${a.id}`,
          title: a.title,
          link: a.slug ? `https://defillama.com/research/report/${a.slug}` : '#',
          source: 'DefiLlama Research',
          desk: 'RESEARCH',
          summary: a.subtitle || a.excerpt || '',
          epoch: a.publishedAt ? new Date(a.publishedAt).getTime() / 1000 : Date.now() / 1000,
          heat: 80,
        }))
        items = [...dlArticles, ...items]
        deskCounts['RESEARCH'] = (deskCounts['RESEARCH'] || 0) + dlArticles.length
      }
    }

    const data = buildFeed(
      items,
      top,
      deskCounts,
      pRes.status === 'fulfilled' ? (pRes.value as PriceApiResponse) : null,
      sRes.status === 'fulfilled' ? (sRes.value as FearGreedApiResponse) : null,
      aRes.status === 'fulfilled' ? (aRes.value as AltDataApiResponse) : null,
      fRes.status === 'fulfilled' ? (fRes.value as MarketFlowApiResponse) : null
    )
    feedCache = { data, ts: Date.now() }
    return data
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export async function GET() {
  try {
    const data = await fetchFeed()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120, s-maxage=30',
        'X-Cache-TTL': String(FEED_TTL),
        'X-Generated': data.generated,
      },
    })
  } catch (err) {
    console.error('[api/v1/feed] Error:', err)
    if (feedCache) {
      return NextResponse.json(feedCache.data, {
        headers: {
          'Cache-Control': 'public, max-age=10',
          'X-Stale': 'true',
        },
      })
    }
    return NextResponse.json({ error: String(err) }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
