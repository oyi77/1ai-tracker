// ─────────────────────────────────────────────────────────────
// Module: RSS Engine — Comprehensive Multi-Domain Feed Aggregator
// sourceType: public-api
// 60+ feeds: crypto, macro, regulatory, tradfi, tech, political,
// social, science, energy, geopolitical, Indonesia
// ─────────────────────────────────────────────────────────────

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../../types'
import { TTL } from '../../types'
import { cachedFetch } from '../../fetch-with-cache'

export type FeedCategory =
  | 'crypto' | 'macro' | 'regulatory' | 'tradfi'
  | 'tech' | 'political' | 'social' | 'science'
  | 'energy' | 'geopolitical' | 'indonesia'

export interface RssItem {
  title: string
  link: string
  source: string
  publishedAt: string
  summary?: string
  category: FeedCategory
}

const FEEDS: Array<{ id: string; url: string; category: FeedCategory }> = [
  // ─── Crypto ────────────────────────────────────────────────
  { id: 'coindesk',       url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',                 category: 'crypto' },
  { id: 'cointelegraph',  url: 'https://cointelegraph.com/rss',                                   category: 'crypto' },
  { id: 'decrypt',        url: 'https://decrypt.co/feed',                                         category: 'crypto' },
  { id: 'theblock',       url: 'https://www.theblock.co/rss.xml',                                 category: 'crypto' },
  { id: 'bitcoinmag',     url: 'https://bitcoinmagazine.com/.rss/full/',                           category: 'crypto' },
  { id: 'cryptoslate',    url: 'https://cryptoslate.com/feed/',                                   category: 'crypto' },
  { id: 'blockworks',     url: 'https://blockworks.co/feed',                                      category: 'crypto' },
  { id: 'dlnews',         url: 'https://www.dlnews.com/rss/',                                     category: 'crypto' },
  { id: 'unchained',      url: 'https://unchainedcrypto.com/feed/',                               category: 'crypto' },
  { id: 'the-defiant',    url: 'https://thedefiant.io/feed',                                      category: 'crypto' },
  { id: 'bankless',       url: 'https://www.bankless.com/feed',                                   category: 'crypto' },
  { id: 'rekt',           url: 'https://rekt.news/feed/',                                         category: 'crypto' },

  // ─── Macro / Economics ─────────────────────────────────────
  { id: 'fed-rss',        url: 'https://www.federalreserve.gov/feeds/press_all.xml',                category: 'macro' },
  { id: 'ecb-press',      url: 'https://www.ecb.europa.eu/rss/press.html',                        category: 'macro' },
  { id: 'imf-blog',       url: 'https://www.imf.org/en/News/rss',                                 category: 'macro' },
  { id: 'bis',            url: 'https://www.bis.org/doclist/pressrelease.rss',                     category: 'macro' },
  { id: 'bls',            url: 'https://www.bls.gov/feed/bls_latest.rss',                         category: 'macro' },
  { id: 'bea',            url: 'https://www.bea.gov/news/rss.xml',                                category: 'macro' },
  { id: 'worldbank',      url: 'https://blogs.worldbank.org/rss.xml',                             category: 'macro' },
  { id: 'stlouisfed',     url: 'https://www.stlouisfed.org/rss/news-releases',                    category: 'macro' },

  // ─── Regulatory / Legal ────────────────────────────────────
  { id: 'sec-rss',        url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=&dateb=&owner=include&count=40&search_text=&action=getcompany&RSS', category: 'regulatory' },
  { id: 'cftc',           url: 'https://www.cftc.gov/RSS/PressReleases.xml',                      category: 'regulatory' },
  { id: 'finra',          url: 'https://www.finra.org/rss/notices',                                category: 'regulatory' },
  { id: 'doj',            url: 'https://www.justice.gov/opa/press-releases.xml',                  category: 'regulatory' },
  { id: 'treasury',       url: 'https://home.treasury.gov/rss/press-releases',                    category: 'regulatory' },
  { id: 'uk-fca',         url: 'https://www.fca.org.uk/news/rss.xml',                              category: 'regulatory' },
  { id: 'eu-esma',        url: 'https://www.esma.europa.eu/rss.xml',                               category: 'regulatory' },

  // ─── TradFi / Markets ──────────────────────────────────────
  { id: 'bloomberg',      url: 'https://feeds.bloomberg.com/markets/news.rss',                    category: 'tradfi' },
  { id: 'reuters-biz',    url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', category: 'tradfi' },
  { id: 'ft',             url: 'https://www.ft.com/?format=rss',                                   category: 'tradfi' },
  { id: 'wsj-markets',    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',                   category: 'tradfi' },
  { id: 'cnbc',           url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',           category: 'tradfi' },
  { id: 'marketwatch',    url: 'https://feeds.marketwatch.com/marketwatch/topstories/',            category: 'tradfi' },
  { id: 'investopedia',   url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline', category: 'tradfi' },

  // ─── Tech ──────────────────────────────────────────────────
  { id: 'techcrunch',     url: 'https://techcrunch.com/feed/',                                     category: 'tech' },
  { id: 'arstechnica',    url: 'https://feeds.arstechnica.com/arstechnica/index',                  category: 'tech' },
  { id: 'verge',          url: 'https://www.theverge.com/rss/index.xml',                           category: 'tech' },
  { id: 'wired',          url: 'https://www.wired.com/feed/rss',                                   category: 'tech' },
  { id: 'hackernews',     url: 'https://hnrss.org/frontpage',                                      category: 'tech' },
  { id: 'mit-tech',       url: 'https://www.technologyreview.com/feed/',                           category: 'tech' },

  // ─── Political / Government ────────────────────────────────
  { id: 'whitehouse',     url: 'https://www.whitehouse.gov/feed/',                                 category: 'political' },
  { id: 'congress',       url: 'https://www.congress.gov/rss/most-viewed-bills.xml',              category: 'political' },
  { id: 'eu-commission',  url: 'https://ec.europa.eu/commission/presscorner/api/rss',             category: 'political' },

  // ─── Social / Community ────────────────────────────────────
  { id: 'reddit-crypto',  url: 'https://www.reddit.com/r/CryptoCurrency/.rss',                    category: 'social' },
  { id: 'reddit-bitcoin', url: 'https://www.reddit.com/r/Bitcoin/.rss',                            category: 'social' },
  { id: 'reddit-eth',     url: 'https://www.reddit.com/r/ethereum/.rss',                           category: 'social' },
  { id: 'lobsters',       url: 'https://lobste.rs/rss',                                            category: 'social' },

  // ─── Science / Research ────────────────────────────────────
  { id: 'arxiv-cs',       url: 'https://rss.arxiv.org/rss/cs.CR',                                 category: 'science' },
  { id: 'arxiv-econ',     url: 'https://rss.arxiv.org/rss/q-fin',                                 category: 'science' },
  { id: 'nature',         url: 'https://www.nature.com/nature.rss',                                category: 'science' },

  // ─── Energy / Commodities ──────────────────────────────────
  { id: 'eia',            url: 'https://www.eia.gov/rss/petroleum_gasoline.xml',                   category: 'energy' },
  { id: 'oilprice',       url: 'https://oilprice.com/rss/main',                                    category: 'energy' },
  { id: 'iea',            url: 'https://www.iea.org/rss',                                          category: 'energy' },

  // ─── Geopolitical ──────────────────────────────────────────
  { id: 'cfr',            url: 'https://www.cfr.org/rss',                                          category: 'geopolitical' },
  { id: 'chatham',        url: 'https://www.chathamhouse.org/rss.xml',                              category: 'geopolitical' },
  { id: 'csis',           url: 'https://www.csis.org/analysis/feed',                                category: 'geopolitical' },

  // ─── Indonesia ─────────────────────────────────────────────
  { id: 'bi',             url: 'https://www.bi.or.id/id/informasi-rss/Default.aspx',               category: 'indonesia' },
  { id: 'bappebti',       url: 'https://www.bappebti.go.id/rss',                                   category: 'indonesia' },
  { id: 'ojk',            url: 'https://www.ojk.go.id/id/kanal/iknb/rss.aspx',                     category: 'indonesia' },
  { id: 'kontan',         url: 'https://www.kontan.co.id/rss',                                      category: 'indonesia' },
  { id: 'bisnis',         url: 'https://www.bisnis.com/rss',                                        category: 'indonesia' },
  { id: 'katadata',       url: 'https://katadata.co.id/feed',                                       category: 'indonesia' },
]

function parseRssItems(xml: string, sourceId: string, category: FeedCategory): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractLink(block)
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || ''
    const summary = cleanHtml(extractTag(block, 'description') || extractTag(block, 'content:encoded') || '')

    if (title) {
      items.push({
        title: cleanHtml(title),
        link,
        source: sourceId,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: summary.slice(0, 500),
        category,
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function extractLink(xml: string): string {
  // RSS 2.0 <link>
  const linkTag = extractTag(xml, 'link')
  if (linkTag && linkTag.startsWith('http')) return linkTag
  // Atom <link href="...">
  const atomLink = xml.match(/<link[^>]+href=["']([^"']+)["']/i)
  return atomLink ? atomLink[1] : ''
}

function cleanHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchFeed(feed: { id: string; url: string; category: FeedCategory }): Promise<RssItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'NexusBot/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRssItems(xml, feed.id, feed.category)
  } catch {
    return []
  }
}

// Sample max 40 feeds per cycle to keep response time predictable
const MAX_FEEDS_PER_CYCLE = 40

async function fetchAllFeeds(params: FetchParams): Promise<RssItem[]> {
  const category = params.category as FeedCategory | undefined
  const limit = (params.limit as number) ?? 200

  let candidates = category
    ? FEEDS.filter(f => f.category === category)
    : FEEDS

  // Shuffle to avoid always hitting the same feeds first
  candidates = [...candidates].sort(() => Math.random() - 0.5).slice(0, MAX_FEEDS_PER_CYCLE)

  const results = await Promise.allSettled(candidates.map(f => fetchFeed(f)))
  const all = results
    .filter((r): r is PromiseFulfilledResult<RssItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  return all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit)
}

const rssEngineModule: DataModule = {
  id: 'rss-engine',
  name: 'RSS Engine',
  category: 'news',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'RSS Engine — 60+ curated feeds across crypto, macro, regulatory, tradfi, tech, political, social, science, energy, geopolitical, Indonesia',
    fragility: 'stable',
    lastVerified: '2026-06-20',
    toleratesAbsence: true,
  },
  isEnabled: () => true,
  async healthCheck(): Promise<ModuleHealth> {
    // Quick check: fetch one reliable feed
    try {
      const items = await fetchFeed(FEEDS[0])
      return {
        status: items.length > 0 ? 'active' : 'degraded',
        lastChecked: new Date(),
        lastSuccess: items.length > 0 ? new Date() : undefined,
        failureCount: items.length > 0 ? 0 : 1,
        notes: items.length === 0 ? 'Feed returned no items' : undefined,
      }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },
  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>('rss-engine', params, TTL.NEWS, () => fetchAllFeeds(params) as Promise<T>)
  },
}

export default rssEngineModule
export { FEEDS }
