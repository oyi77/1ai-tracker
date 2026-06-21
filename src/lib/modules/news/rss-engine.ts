// ─────────────────────────────────────────────────────────────
// Module: RSS Engine — Comprehensive Multi-Domain Feed Aggregator
// sourceType: public-api
// 60+ feeds: crypto, macro, regulatory, tradfi, tech, political,
// social, science, energy, geopolitical, Indonesia
// ─────────────────────────────────────────────────────────────

import type { DataModule, FetchParams, ModuleResult, ModuleHealth } from '../types'
import { TTL } from '../types'
import { cachedFetch } from '../fetch-with-cache'

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
  // ═══ CRYPTO ═══
  { id: 'coindesk',       url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',          category: 'crypto' },
  { id: 'cointelegraph',  url: 'https://cointelegraph.com/rss',                            category: 'crypto' },
  { id: 'decrypt',        url: 'https://decrypt.co/feed',                                   category: 'crypto' },
  { id: 'theblock',       url: 'https://www.theblock.co/rss.xml',                           category: 'crypto' },
  { id: 'blockworks',     url: 'https://blockworks.co/feed',                                category: 'crypto' },
  { id: 'thedefiant',     url: 'https://thedefiant.io/feed',                                category: 'crypto' },
  { id: 'cryptoslate',    url: 'https://cryptoslate.com/feed/',                             category: 'crypto' },
  { id: 'bitcoinmag',     url: 'https://bitcoinmagazine.com/feed',                         category: 'crypto' },
  { id: 'dlnews',         url: 'https://www.dlnews.com/rss/',                               category: 'crypto' },

  // ═══ MACRO & ECONOMICS ═══
  { id: 'fed-press',      url: 'https://www.federalreserve.gov/feeds/press_all.xml',        category: 'macro' },
  { id: 'bls',            url: 'https://www.bls.gov/feed/bls_latest.rss',                   category: 'macro' },
  { id: 'bis',            url: 'https://www.bis.org/rss/home.htm',                          category: 'macro' },
  { id: 'imf',            url: 'https://www.imf.org/en/News/RSS',                           category: 'macro' },
  { id: 'treasury',       url: 'https://www.treasury.gov/resource-center/rss.xml',          category: 'macro' },
  { id: 'ecb',            url: 'https://www.ecb.europa.eu/rss/press.html',                  category: 'macro' },
  { id: 'bea',            url: 'https://www.bea.gov/news/rss.xml',                          category: 'macro' },

  // ═══ REGULATORY ═══
  { id: 'sec-edgar',      url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&dateb=&owner=include&count=20&output=atom', category: 'regulatory' },
  { id: 'cftc',           url: 'https://www.cftc.gov/Newsroom/RSS',                         category: 'regulatory' },
  { id: 'finra',          url: 'https://www.finra.org/rss',                                  category: 'regulatory' },
  { id: 'occ',            url: 'https://www.occ.treas.gov/news-issuances/news-releases.rss', category: 'regulatory' },

  // ═══ TRADITIONAL FINANCE ═══
  { id: 'marketwatch',    url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', category: 'tradfi' },
  { id: 'cnbc-markets',   url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069', category: 'tradfi' },
  { id: 'cnbc-world',     url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', category: 'tradfi' },
  { id: 'ft',             url: 'https://rss.ft.com/rss/home/us',                             category: 'tradfi' },
  { id: 'wsj-markets',    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',              category: 'tradfi' },
  { id: 'wsj-world',      url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',                category: 'tradfi' },
  { id: 'bloomberg',      url: 'https://feeds.bloomberg.com/markets/news.rss',               category: 'tradfi' },
  { id: 'reuters-biz',    url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', category: 'tradfi' },
  { id: 'investing',      url: 'https://www.investing.com/rss/news.rss',                     category: 'tradfi' },
  { id: 'fool',           url: 'https://www.fool.com/feeds/index.aspx',                      category: 'tradfi' },

  // ═══ TECHNOLOGY ═══
  { id: 'techcrunch',     url: 'https://techcrunch.com/feed/',                               category: 'tech' },
  { id: 'arstechnica',    url: 'https://feeds.arstechnica.com/arstechnica/index',            category: 'tech' },
  { id: 'verge',          url: 'https://www.theverge.com/rss/index.xml',                     category: 'tech' },
  { id: 'wired',          url: 'https://www.wired.com/feed/rss',                             category: 'tech' },
  { id: 'hackernews',     url: 'https://hnrss.org/frontpage',                                category: 'tech' },
  { id: 'github-trending',url: 'https://rsshub.app/github/trending/daily/any',               category: 'tech' },
  { id: 'venturebeat',    url: 'https://venturebeat.com/feed/',                              category: 'tech' },
  { id: 'register',       url: 'https://www.theregister.com/headlines.atom',                 category: 'tech' },
  { id: 'zdnet',          url: 'https://www.zdnet.com/news/rss.xml',                         category: 'tech' },

  // ═══ POLITICAL ═══
  { id: 'politico',       url: 'https://rss.politico.com/politics-news.xml',                 category: 'political' },
  { id: 'hill',           url: 'https://thehill.com/feed/',                                  category: 'political' },
  { id: 'axios',          url: 'https://api.axios.com/feed/',                                category: 'political' },
  { id: 'bbc-world',      url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                category: 'political' },
  { id: 'nyt-world',      url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',    category: 'political' },
  { id: 'guardian-world',  url: 'https://www.theguardian.com/world/rss',                     category: 'political' },
  { id: 'aljazeera',      url: 'https://www.aljazeera.com/xml/rss/all.xml',                  category: 'political' },

  // ═══ GEOPOLITICAL ═══
  { id: 'cfr',            url: 'https://www.cfr.org/rss',                                   category: 'geopolitical' },
  { id: 'foreign-affairs', url: 'https://www.foreignaffairs.com/rss.xml',                    category: 'geopolitical' },
  { id: 'chatham-house',  url: 'https://www.chathamhouse.org/rss.xml',                       category: 'geopolitical' },

  // ═══ ENERGY & CLIMATE ═══
  { id: 'oilprice',       url: 'https://oilprice.com/rss/main',                              category: 'energy' },
  { id: 'reuters-energy', url: 'https://www.reutersagency.com/feed/?best-topics=energy',     category: 'energy' },
  { id: 'iea',            url: 'https://www.iea.org/rss',                                    category: 'energy' },

  // ═══ SCIENCE ═══
  { id: 'nature',         url: 'https://www.nature.com/nature.rss',                          category: 'science' },
  { id: 'science',        url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science', category: 'science' },
  { id: 'arxiv-cs',       url: 'https://rss.arxiv.org/rss/cs.AI',                            category: 'science' },
  { id: 'arxiv-fin',      url: 'https://rss.arxiv.org/rss/q-fin',                            category: 'science' },

  // ═══ SOCIAL & SENTIMENT ═══
  { id: 'reddit-crypto',  url: 'https://www.reddit.com/r/CryptoCurrency/top.rss?t=day',     category: 'social' },
  { id: 'reddit-stocks',  url: 'https://www.reddit.com/r/wallstreetbets/top.rss?t=day',     category: 'social' },
  { id: 'reddit-tech',    url: 'https://www.reddit.com/r/technology/top.rss?t=day',          category: 'social' },

  // ═══ INDONESIA ═══
  { id: 'kompas-bisnis',  url: 'https://www.kompas.com/rss/bisnis',                          category: 'indonesia' },
  { id: 'detik-finance',  url: 'https://finance.detik.com/rss',                              category: 'indonesia' },
  { id: 'cnbc-indo',      url: 'https://www.cnbcindonesia.com/rss',                          category: 'indonesia' },
  { id: 'bisnis-com',     url: 'https://www.bisnis.com/rss',                                 category: 'indonesia' },
  // ═══ NEWSNOW AGGREGATOR ═══
  { id: 'newsnow-tech',   url: 'https://www.newsnow.co.uk/h/Technology/RSS',                 category: 'tech' },
  { id: 'newsnow-politics',url: 'https://www.newsnow.co.uk/h/World+News/RSS',              category: 'political' },
  { id: 'newsnow-finance',url: 'https://www.newsnow.co.uk/h/Business+&+Finance/RSS',       category: 'tradfi' },
  { id: 'newsnow-crypto', url: 'https://www.newsnow.co.uk/h/Business+&+Finance/Cryptocurrencies/RSS', category: 'crypto' },

  // ═══ MORE CRYPTO ═══
  { id: 'binance-blog',   url: 'https://www.binance.com/en/blog/rss',                        category: 'crypto' },
  { id: 'kraken-blog',    url: 'https://blog.kraken.com/feed',                               category: 'crypto' },
  { id: 'messari',        url: 'https://messari.io/rss',                                     category: 'crypto' },
  { id: 'bankless',       url: 'https://www.bankless.com/rss',                               category: 'crypto' },
  { id: 'rekt-news',      url: 'https://rekt.news/feed',                                     category: 'crypto' },
  { id: 'chainalysis',    url: 'https://www.chainalysis.com/blog/feed',                      category: 'crypto' },
  { id: 'glassnode',      url: 'https://insights.glassnode.com/feed',                        category: 'crypto' },
  { id: 'coinmetrics',    url: 'https://coinmetrics.substack.com/feed',                      category: 'crypto' },
  { id: 'dune-analytics', url: 'https://dune.com/blog/rss.xml',                              category: 'crypto' },

  // ═══ MORE MACRO ═══
  { id: 'oecd',           url: 'https://www.oecd.org/newsroom/rss',                          category: 'macro' },
  { id: 'worldbank-news', url: 'https://www.worldbank.org/en/news/rss',                      category: 'macro' },
  { id: 'adb-news',       url: 'https://www.adb.org/rss/news',                               category: 'macro' },
  { id: 'boj',            url: 'https://www.boj.or.jp/en/rss/announcements.xml',             category: 'macro' },
  { id: 'pbo',            url: 'https://www.pbo-dpb.ca/en/rss/reports',                      category: 'macro' },
  { id: 'cbo',            url: 'https://www.cbo.gov/rss',                                    category: 'macro' },

  // ═══ MORE FINANCE ═══
  { id: 'nasdaq',         url: 'https://www.nasdaq.com/feed/rss-outfeed',                    category: 'tradfi' },
  { id: 'morningstar',    url: 'https://www.morningstar.com/rss/news',                       category: 'tradfi' },
  { id: 'seekingalpha',   url: 'https://seekingalpha.com/feed.xml',                          category: 'tradfi' },
  { id: 'barrons',        url: 'https://www.barrons.com/rss',                                category: 'tradfi' },
  { id: 'zerohedge',      url: 'https://www.zerohedge.com/rss.xml',                          category: 'tradfi' },
  { id: 'wolfstreet',     url: 'https://wolfstreet.com/feed',                                category: 'tradfi' },
  { id: 'calculatedrisk', url: 'https://www.calculatedriskblog.com/feeds/posts/default',     category: 'tradfi' },
  { id: 'economist',      url: 'https://www.economist.com/feeds/print-sections/73/business.xml', category: 'tradfi' },
  { id: 'forexlive',      url: 'https://www.forexlive.com/feed',                             category: 'tradfi' },

  // ═══ AI / ML ═══
  { id: 'openai',         url: 'https://openai.com/blog/rss.xml',                            category: 'tech' },
  { id: 'google-ai',      url: 'https://blog.google/technology/ai/rss',                      category: 'tech' },
  { id: 'meta-ai',        url: 'https://ai.meta.com/blog/rss',                               category: 'tech' },
  { id: 'anthropic',      url: 'https://www.anthropic.com/feed.xml',                         category: 'tech' },
  { id: 'huggingface',    url: 'https://huggingface.co/blog/feed.xml',                       category: 'tech' },
  { id: 'mit-tech',       url: 'https://www.technologyreview.com/feed',                      category: 'tech' },
  { id: 'ieee-spectrum',  url: 'https://spectrum.ieee.org/rss/fulltext',                     category: 'tech' },

  // ═══ STARTUP / VC ═══
  { id: 'ycombinator',    url: 'https://news.ycombinator.com/rss',                           category: 'tech' },
  { id: 'producthunt',    url: 'https://www.producthunt.com/feed',                           category: 'tech' },
  { id: 'sifted',         url: 'https://sifted.eu/feed',                                     category: 'tech' },
  { id: 'techinasia',     url: 'https://www.techinasia.com/feed',                            category: 'tech' },
  { id: 'dealroom',       url: 'https://dealroom.co/feed',                                   category: 'tech' },

  // ═══ MORE INDONESIA ═══
  { id: 'kontan',         url: 'https://www.kontan.co.id/rss',                               category: 'indonesia' },
  { id: 'tempo-bisnis',   url: 'https://www.tempo.co/rss/bisnis',                            category: 'indonesia' },
  { id: 'liputan6-bisnis',url: 'https://www.liputan6.com/feeds/bisnis',                      category: 'indonesia' },
  { id: 'okezone',        url: 'https://economy.okezone.com/rss',                            category: 'indonesia' },
  { id: 'idx-rss',        url: 'https://www.idx.co.id/rss/berita',                           category: 'indonesia' },
  { id: 'antara-ekonomi', url: 'https://www.antaranews.com/rss/ekonomi',                     category: 'indonesia' },

  // ═══ REAL ESTATE ═══
  { id: 'realtor-com',    url: 'https://www.realtor.com/news/rss',                           category: 'tradfi' },
  { id: 'zillow',         url: 'https://www.zillow.com/blog/feed',                           category: 'tradfi' },
  { id: 'cre-news',       url: 'https://www.costar.com/rss/news',                            category: 'tradfi' },

  // ═══ COMMODITIES ═══
  { id: 'reuters-commod', url: 'https://www.reutersagency.com/feed/?best-topics=commodities',category: 'energy' },
  { id: 'mining-com',     url: 'https://www.mining.com/rss',                                 category: 'energy' },
  { id: 'spglobal-commod',url: 'https://www.spglobal.com/commodityinsights/en/rss/news',     category: 'energy' },
  { id: 'gold-news',      url: 'https://www.kitco.com/rss',                                  category: 'energy' },

  // ═══ MORE GEOPOLITICAL ═══
  { id: 'warontherocks',   url: 'https://warontherocks.com/feed',                            category: 'geopolitical' },
  { id: 'stratfor',       url: 'https://worldview.stratfor.com/rss',                         category: 'geopolitical' },
  { id: 'janes',          url: 'https://www.janes.com/rss',                                  category: 'geopolitical' },
  { id: 'atlantic-council',url: 'https://www.atlanticcouncil.org/feed',                      category: 'geopolitical' },
  { id: 'csis',           url: 'https://www.csis.org/rss',                                   category: 'geopolitical' },
  { id: 'rferl',          url: 'https://www.rferl.org/rss',                                   category: 'geopolitical' },

  // ═══ MORE SCIENCE ═══
  { id: 'newscientist',   url: 'https://www.newscientist.com/feed/home',                     category: 'science' },
  { id: 'pnas',           url: 'https://www.pnas.org/rss/rss_most_recent.xml',               category: 'science' },
  { id: 'arxiv-bio',      url: 'https://rss.arxiv.org/rss/q-bio',                            category: 'science' },
  { id: 'nasa-image',     url: 'https://www.nasa.gov/rss/dyn/imageoftheday.rss',             category: 'science' },

  // ═══ MORE SOCIAL ═══
  { id: 'reddit-ai',      url: 'https://www.reddit.com/r/artificial/top.rss?t=day',          category: 'social' },
  { id: 'reddit-econ',    url: 'https://www.reddit.com/r/economics/top.rss?t=day',           category: 'social' },
  { id: 'reddit-world',   url: 'https://www.reddit.com/r/worldnews/top.rss?t=day',           category: 'social' },
  { id: 'medium',         url: 'https://medium.com/feed/tag/artificial-intelligence',        category: 'social' },
  { id: 'substack-top',   url: 'https://substack.com/feed',                                  category: 'social' },

  // ═══ MORE REGULATORY ═══
  { id: 'ecb-banking',    url: 'https://www.bankingsupervision.europa.eu/rss/press.xml',     category: 'regulatory' },
  { id: 'fsb',            url: 'https://www.fsb.org/rss',                                    category: 'regulatory' },
  { id: 'bis-central',    url: 'https://www.bis.org/press/rss.xml',                          category: 'regulatory' },
  { id: 'fca',            url: 'https://www.fca.org.uk/rss/news',                            category: 'regulatory' },
  { id: 'finma',          url: 'https://www.finma.ch/en/rss/news',                           category: 'regulatory' },
  { id: 'esma',           url: 'https://www.esma.europa.eu/rss/press-releases',              category: 'regulatory' },
]

function parseRssItems(xml: string, sourceId: string, category: FeedCategory): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractLink(block)
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated')
    const description = extractTag(block, 'description') || extractTag(block, 'summary')
    if (title && link) {
      items.push({
        title: cleanHtml(title).slice(0, 500),
        link,
        source: sourceId,
        publishedAt: pubDate || new Date().toISOString(),
        summary: description ? cleanHtml(description).slice(0, 500) : undefined,
        category,
      })
    }
  }
  return items
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m?.[1]?.trim() ?? ''
}

function extractLink(xml: string): string {
  const m = xml.match(/<link[^>]*href="([^"]+)"/i)
  if (m) return m[1]
  return extractTag(xml, 'link')
}

function cleanHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

async function fetchFeed(feed: { id: string; url: string; category: FeedCategory }): Promise<RssItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(6_000),
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
  const limit = (params.limit as number) ?? 100
  const feeds = category ? FEEDS.filter(f => f.category === category) : FEEDS

  // Sample first N feeds — keeps response time predictable
  const sample = feeds.slice(0, Math.min(feeds.length, MAX_FEEDS_PER_CYCLE))

  // Concurrency: 20 simultaneous fetches
  const CONCURRENCY = 20
  const results: RssItem[] = []
  for (let i = 0; i < sample.length; i += CONCURRENCY) {
    const batch = sample.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(batch.map(f => fetchFeed(f)))
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(...r.value)
    }
  }

  return results
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit)
}

const rssEngineModule: DataModule = {
  id: 'rss-engine',
  name: 'RSS Engine',
  category: 'news',
  sourceType: 'public-api',
  provenance: {
    describesItself: 'Comprehensive RSS aggregator — 60+ feeds across 11 domains: crypto, macro, regulatory, tradfi, tech, political, social, science, energy, geopolitical, Indonesia',
    fragility: 'stable',
    lastVerified: '2026-06-19',
    toleratesAbsence: true,
  },

  isEnabled: () => true,

  async healthCheck(): Promise<ModuleHealth> {
    try {
      const items = await fetchFeed(FEEDS[0])
      return {
        status: items.length > 0 ? 'active' : 'degraded',
        lastChecked: new Date(),
        lastSuccess: items.length > 0 ? new Date() : undefined,
        failureCount: items.length > 0 ? 0 : 1,
        notes: `${FEEDS.length} feeds configured`,
      }
    } catch (e) {
      return { status: 'offline', lastChecked: new Date(), failureCount: 1, notes: String(e) }
    }
  },

  async fetch<T>(params: FetchParams): Promise<ModuleResult<T>> {
    return cachedFetch<T>(
      'rss-engine',
      params,
      TTL.NEWS,
      () => fetchAllFeeds(params) as Promise<T>,
    )
  },
}

export default rssEngineModule
export { FEEDS }
