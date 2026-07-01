// ─────────────────────────────────────────────────────────────
// News Module — unified barrel export
// ─────────────────────────────────────────────────────────────

// Providers
export { default as gdelt } from './gdelt'
export { default as rssEngine } from './rss'
export { default as redditCrypto } from './reddit'
export { default as benzingaRe } from './benzinga'
export { default as cryptopanicRe } from './cryptopanic'
export { default as vimeroFeed } from './vimero'
export { default as defillamaResearch } from './defillama'

// Types from providers
export type { FeedCategory, RssItem } from './rss'
export { FEEDS } from './rss'

// Aggregator (category level)
export { fetchNewsIntelligence, persistNewsEvents } from './news-intel'
