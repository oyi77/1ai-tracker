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

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../../types'
import { TTL } from '../../types'
import { cachedFetch } from '../../fetch-with-cache'
import { curlFetchAsync } from '../../../curl-fetch'

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
  sections: string[]
  channels: string[]
  totalArticles: number
  fetchedAt: string
}

function parseDefiLlamaResponse(html: string): ResearchData | null {
  try {
    // Extract __NEXT_DATA__ JSON from the page
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) return null

    const nextData = JSON.parse(nextDataMatch[1])
    const pageProps = nextData?.props?.pageProps
    if (!pageProps) return null

    const researchArticles = pageProps.researchArticles ?? pageProps.articles ?? []
    const sections = pageProps.sections ?? []
    const channels = pageProps.channels ?? []

    const articles: ResearchArticle[] = researchArticles.map((a: Record<string, unknown>) => ({
      id: String(a.id ?? a.slug ?? ''),
      title: String(a.title ?? ''),
      subtitle: a.subtitle as string | undefined,
      excerpt: a.excerpt as string | undefined,
      plainText: a.plainText as string | undefined,
      author: a.author as string | undefined,
      slug: String(a.slug ?? ''),
      section: a.section as string | undefined,
      channel: a.channel as string | undefined,
      editorialTags: (a.editorialTags ?? a.tags) as string[] | undefined,
      publishedAt: a.publishedAt as string | undefined,
      firstPublishedAt: a.firstPublishedAt as string | undefined,
      createdAt: a.createdAt as string | undefined,
      coverImage: a.coverImage as { url: string; alt?: string } | undefined,
      reportPdf: a.reportPdf as { url: string } | undefined,
    }))

    return {
      articles,
      sections: sections as string[],
      channels: channels as string[],
      totalArticles: articles.length,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

async function fetchDefiLlamaResearch(_params: FetchParams): Promise<ResearchData> {
  const html = await curlFetchAsync('https://defillama.com/research', {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 30,
  })

  const data = parseDefiLlamaResponse(html.body)
  if (!data) {
    return { articles: [], sections: [], channels: [], totalArticles: 0, fetchedAt: new Date().toISOString() }
  }

  return data
}

const defiLlamaResearchModule: DataModule = {
  id: 'defillama-research',
  name: 'DefiLlama Research',
  category: 'news',
  sourceType: 're',
  provenance: {
    describesItself: 'DefiLlama Research — DeFi/crypto research articles scraped via __NEXT_DATA__',
    upstreamProduct: 'DefiLlama Research',
    discoveredVia: 'devtools-network-tab',
    fragility: 'fragile',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const data = await fetchDefiLlamaResearch({})
      return {
        status: data.articles.length > 0 ? 'active' : 'degraded',
        lastChecked: new Date(),
        lastSuccess: data.articles.length > 0 ? new Date() : undefined,
        failureCount: data.articles.length > 0 ? 0 : 1,
        notes: data.articles.length === 0 ? 'No articles found' : undefined,
      }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>(
      'defillama-research',
      params,
      TTL.NEWS * TTL.RE_MULTIPLIER,
      () => fetchDefiLlamaResearch(params) as Promise<T>,
    )
  },

  async fallbackFn<T>(_params: FetchParams): Promise<ModuleResult<T>> {
    return {
      data: { articles: [], sections: [], channels: [], totalArticles: 0, fetchedAt: new Date().toISOString() } as T,
      source: 'defillama-research-fallback',
      cached: false,
      timestamp: Date.now(),
      ttl: TTL.NEWS,
    }
  },
}

export default defiLlamaResearchModule
