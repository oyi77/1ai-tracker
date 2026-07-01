// ─────────────────────────────────────────────────────────────
// Sentiment Module — unified barrel export
// ─────────────────────────────────────────────────────────────

// Provider modules
export { default as fearGreedModule } from './alternative-me/fear-greed'
export { default as googleTrendsModule } from './google/trends'
export { default as githubModule } from './github/activity'
export { default as hackernewsModule } from './hackernews/stories'
export { default as weiboHotModule } from './weibo/hot'
export { default as zhihuTrendsModule } from './zhihu/trends'
export { default as lunarcrushModule } from './lunarcrush/sentiment'
export { default as santimentModule } from './santiment/metrics'
export { default as cryptocompareModule } from './cryptocompare/social'

// Derived module (stays at root)
export { default as longshortDerivedModule } from './longshort-derived'

// Aggregator (stays at root)
export { fetchSentimentIntelligence, persistSentimentSnapshots } from './sentiment-intel'
export type { SentimentData } from './sentiment-intel'
