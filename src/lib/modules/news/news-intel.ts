// ─────────────────────────────────────────────────────────────
// News Intelligence Module
// Sources: GDELT Project (free), SEC EDGAR filings, exchange status pages
// All free, zero API keys required
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

interface NewsEvent {
  source: string
  headline: string
  url: string
  entities: string[]
  relevanceScore: number
  severityScore: number
  direction: 'bullish' | 'bearish' | 'neutral'
  publishedAt: string
  category: string
}

// ─── GDELT Project ─────────────────────────────────────────

async function fetchGDELT(query = 'cryptocurrency OR bitcoin OR ethereum'): Promise<NewsEvent[]> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=25&format=json&sort=date`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []
    const data = await res.json() as { articles?: Array<{ title: string; url: string; seendate: string; language: string; sourcecountry: string }> }

    return (data.articles ?? []).map(a => ({
      source: 'GDELT',
      headline: a.title,
      url: a.url,
      entities: extractEntities(a.title),
      relevanceScore: computeRelevance(a.title),
      severityScore: computeSeverity(a.title),
      direction: classifyDirection(a.title),
      publishedAt: a.seendate,
      category: 'news',
    }))
  } catch { return [] }
}

// ─── SEC EDGAR ─────────────────────────────────────────────

async function fetchSECFilings(): Promise<NewsEvent[]> {
  try {
    // Fetch latest 8-K filings (material events)
    const url = 'https://efts.sec.gov/LATEST/search-index?q=%228-K%22&dateRange=custom&startdt=' +
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) +
      '&enddt=' + new Date().toISOString().slice(0, 10) + '&forms=8-K&limit=10'
    const res = await fetch(url, {
      headers: { 'User-Agent': '1ai-nexus/1.0 (contact@1ai-nexus.com)' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { filings?: Array<{ title: string; filed: string; form_type: string }> }

    return (data.filings ?? []).map(f => ({
      source: 'SEC EDGAR',
      headline: f.title,
      url: '',
      entities: extractEntities(f.title),
      relevanceScore: 0.7,
      severityScore: 0.6,
      direction: classifyDirection(f.title) as 'bullish' | 'bearish' | 'neutral',
      publishedAt: f.filed,
      category: 'regulatory',
    }))
  } catch { return [] }
}

// ─── Exchange Status Pages ─────────────────────────────────

interface ExchangeStatus {
  exchange: string
  status: string
  message: string
  updatedAt: string
}

async function fetchExchangeStatuses(): Promise<ExchangeStatus[]> {
  const statuses: ExchangeStatus[] = []

  // Binance system status
  try {
    const res = await fetch('https://api.binance.com/sapi/v1/system/status', { signal: AbortSignal.timeout(5_000) })
    if (res.ok) {
      const data = await res.json() as { status?: string; msg?: string }
      statuses.push({
        exchange: 'Binance',
        status: data.status === 'normal' ? 'operational' : 'degraded',
        message: data.msg ?? 'System operational',
        updatedAt: new Date().toISOString(),
      })
    }
  } catch { statuses.push({ exchange: 'Binance', status: 'unknown', message: 'Status check failed', updatedAt: new Date().toISOString() }) }

  return statuses
}

// ─── Helpers ───────────────────────────────────────────────

function extractEntities(text: string): string[] {
  const entities: string[] = []
  const patterns = [
    /bitcoin|btc/gi, /ethereum|eth/gi, /solana|sol/gi, /binance|bnb/gi,
    /coinbase/gi, /sec|securities and exchange/gi, /fed|federal reserve/gi,
    /tether|usdt/gi, /usdc|usd coin/gi, /xrp|ripple/gi, /cardano|ada/gi,
  ]
  for (const p of patterns) {
    if (p.test(text)) entities.push(p.source.split('|')[0])
  }
  return [...new Set(entities)]
}

function computeRelevance(text: string): number {
  const lower = text.toLowerCase()
  let score = 0.3
  if (/bitcoin|btc|ethereum|eth|crypto/i.test(lower)) score += 0.3
  if (/price|market|rally|crash|surge|plunge/i.test(lower)) score += 0.2
  if (/sec|regulation|etf|approval|listing/i.test(lower)) score += 0.2
  return Math.min(1, score)
}

function computeSeverity(text: string): number {
  const lower = text.toLowerCase()
  let score = 0.2
  if (/crash|hack|exploit|ban|lawsuit|fraud/i.test(lower)) score += 0.5
  if (/rally|surge|approval|record|all-time/i.test(lower)) score += 0.3
  return Math.min(1, score)
}

function classifyDirection(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase()
  const bullish = /rally|surge|approval|record|all-time|bullish|buy|accumulate|adoption|partnership|launch/i.test(lower)
  const bearish = /crash|hack|exploit|ban|lawsuit|fraud|bearish|sell|dump|liquidation|decline/i.test(lower)
  if (bullish && !bearish) return 'bullish'
  if (bearish && !bullish) return 'bearish'
  return 'neutral'
}

// ─── Public API ────────────────────────────────────────────

export async function fetchNewsIntelligence(): Promise<{ events: NewsEvent[]; exchangeStatuses: ExchangeStatus[] }> {
  const [gdeltEvents, secEvents, exchangeStatuses] = await Promise.allSettled([
    fetchGDELT(),
    fetchSECFilings(),
    fetchExchangeStatuses(),
  ])

  const events = [
    ...(gdeltEvents.status === 'fulfilled' ? gdeltEvents.value : []),
    ...(secEvents.status === 'fulfilled' ? secEvents.value : []),
  ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return {
    events: events.slice(0, 50),
    exchangeStatuses: exchangeStatuses.status === 'fulfilled' ? exchangeStatuses.value : [],
  }
}

export async function persistNewsEvents(events: NewsEvent[]): Promise<number> {
  let count = 0
  for (const e of events) {
    try {
      await prisma.newsArticle.create({
        data: {
          sourceId: e.source,
          title: e.headline,
          url: e.url || `${e.source}-${Date.now()}-${count}`,
          publishedAt: new Date(e.publishedAt),
          assets: e.entities,
          sentiment: e.direction,
          category: e.category,
        },
      }).catch(() => null)
      count++
    } catch { /* skip duplicates */ }
  }
  return count
}
