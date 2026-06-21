/**
 * Module: DefiLlama Research
 * sourceType: re
 * upstreamProduct: DefiLlama Research
 * endpoint: defillama.com/research (__NEXT_DATA__ scrape)
 * discoveredVia: user request
 * lastVerified: 2026-06-20
 * UNOFFICIAL: scrapes __NEXT_DATA__ from DefiLlama research page using
 *   system `curl` to bypass Cloudflare (Node.js fetch is TLS-fingerprinted).
 *   May break if they change their page structure.
 *   fallbackFn: empty articles
 *
 * Alpha signals: in-depth DeFi/crypto research covering market structure,
 * protocol innovations, regulatory developments, and capital flows.
 * Full plainText content included for each article as scraped from listing page.
 */

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'
import { curlFetchAsync } from '../../curl-fetch'

interface ResearchArticle {
  id: string
  title: string
  subtitle?: string
  excerpt?: string
  plainText?: string
  author?: string
  slug: string
  section?: string
  channel?: string
  editorialTags?: string[]
  publishedAt?: string
  firstPublishedAt?: string
  createdAt?: string
  coverImage?: { url: string; alt?: string }
  reportPdf?: { url: string }
}

interface ResearchData {
  articles: ResearchArticle[]
  categories: Record<string, number>
  totalArticles: number
  fetchTimestamp: number
}

function parseDefiLlamaResponse(html: string): ResearchData | null {
  const match = html.match(/__NEXT_DATA__[^>]*>(.*?)<\/script>/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>
    const props = parsed.props as Record<string, unknown> | undefined
    const pageProps = props?.pageProps as Record<string, unknown> | undefined
    const landingData = (pageProps?.landingData ?? {}) as Record<string, unknown>

    const seen = new Set<string>()
    const articles: ResearchArticle[] = []
    const categories: Record<string, number> = {}

    for (const [category, items] of Object.entries(landingData)) {
      if (!Array.isArray(items)) continue

      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const record = item as Record<string, unknown>
        const id = typeof record.id === 'string' ? record.id : ''
        if (!id || seen.has(id)) continue
        seen.add(id)

        const title = typeof record.title === 'string' ? record.title : 'Untitled'
        const subtitle = typeof record.subtitle === 'string' ? record.subtitle : undefined
        const excerpt = typeof record.excerpt === 'string' ? record.excerpt : undefined
        const plainText = typeof record.plainText === 'string' ? record.plainText : undefined
        const author = typeof record.author === 'string' ? record.author : undefined
        const slug = typeof record.slug === 'string' ? record.slug : ''
        const section = typeof record.section === 'string' ? record.section : category
        const channel = typeof record.channel === 'string' ? record.channel : undefined

        const editorialTags: string[] = []
        if (Array.isArray(record.editorialTags)) {
          for (const t of record.editorialTags) {
            if (typeof t === 'string') editorialTags.push(t)
          }
        }

        const publishedAt = typeof record.publishedAt === 'string'
          ? record.publishedAt
          : typeof record.firstPublishedAt === 'string'
          ? record.firstPublishedAt
          : undefined

        const firstPublishedAt = typeof record.firstPublishedAt === 'string' ? record.firstPublishedAt : undefined
        const createdAt = typeof record.createdAt === 'string' ? record.createdAt : undefined

        let coverImage: { url: string; alt?: string } | undefined
        if (record.coverImage && typeof record.coverImage === 'object') {
          const img = record.coverImage as Record<string, unknown>
          if (typeof img.url === 'string') {
            coverImage = {
              url: img.url,
              alt: typeof img.alt === 'string' ? img.alt : undefined,
            }
          }
        }

        let reportPdf: { url: string } | undefined
        if (record.reportPdf && typeof record.reportPdf === 'object') {
          const pdf = record.reportPdf as Record<string, unknown>
          if (typeof pdf.url === 'string') {
            reportPdf = { url: pdf.url }
          }
        }

        articles.push({
          id,
          title,
          subtitle,
          excerpt,
          plainText,
          author,
          slug,
          section,
          channel,
          editorialTags,
          publishedAt,
          firstPublishedAt,
          createdAt,
          coverImage,
          reportPdf,
        })

        categories[category] = (categories[category] ?? 0) + 1
      }
    }

    return { articles, categories, totalArticles: articles.length, fetchTimestamp: Date.now() }
  } catch {
    return null
  }
}

async function fetchDefiLlamaResearch(_params: FetchParams): Promise<ResearchData> {
  try {
    const res = await curlFetchAsync('https://defillama.com/research', {
      timeout: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (res.status === 200 && res.body) {
      const parsed = parseDefiLlamaResponse(res.body)
      if (parsed) return parsed
    }
  } catch { /* pass */ }

  return { articles: [], categories: {}, totalArticles: 0, fetchTimestamp: Date.now() }
}

const defiLlamaResearchModule: DataModule = {
  id: 'defillama-research',
  name: 'DefiLlama Research',
  category: 'news',
  sourceType: 're',
  provenance: {
    describesItself: 'DefiLlama Research — in-depth DeFi/crypto research articles with full text',
    upstreamProduct: 'DefiLlama',
    discoveredVia: 'docs',
    fragility: 'moderate',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const res = await curlFetchAsync('https://defillama.com/research', {
        timeout: 8,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      })
      if (res.status !== 200 || !res.body) throw new Error(`status ${res.status}`)
      const parsed = parseDefiLlamaResponse(res.body)
      if (!parsed || parsed.articles.length === 0) throw new Error('no articles found')
      return { status: 'active', lastChecked: new Date(), lastSuccess: new Date(), failureCount: 0 }
    } catch (e) {
      return { status: 'degraded', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('defillama-research', params, TTL.NEWS, () =>
      fetchDefiLlamaResearch(params) as Promise<T>,
    )
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { articles: [], categories: {}, totalArticles: 0, fetchTimestamp: Date.now() } as unknown as T,
      source: 'defillama-research (empty fallback)',
      cached: false,
      timestamp: Date.now(),
      ttl: TTL.NEWS,
    }
  },
}

export default defiLlamaResearchModule
