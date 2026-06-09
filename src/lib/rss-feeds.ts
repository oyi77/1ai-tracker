// ─────────────────────────────────────────────────────────────
// Crypto RSS Feed Aggregator
// Curated feeds from 30+ crypto news sources with credibility scoring
// Inspired by World Monitor's 500+ feed architecture
// ─────────────────────────────────────────────────────────────

export type SourceCredibility = "high" | "medium" | "low";
export type FeedCategory = "breaking" | "markets" | "defi" | "nfts" | "regulation" | "technology" | "opinion" | "onchain";

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  credibility: SourceCredibility;
  tier: 1 | 2 | 3; // 1 = wire/fastest, 2 = mainstream, 3 = niche
  lang: string;
  tags: string[];
}

export const SOURCE_CREDIBILITY: Record<string, SourceCredibility> = {
  // High: Wire services, major financial outlets
  "Reuters": "high",
  "Bloomberg": "high",
  "CoinDesk": "high",
  "The Block": "high",
  "Cointelegraph": "high",
  "Decrypt": "high",
  "Blockworks": "high",
  "DL News": "high",
  "Unchained": "high",

  // Medium: Established crypto-native, financial media
  "CoinTelegraph": "medium",
  "Bitcoin Magazine": "medium",
  "The Defiant": "medium",
  "Bankless": "medium",
  "Messari": "medium",
  "Nansen": "medium",
  "Dune Analytics": "medium",
  "Rekt News": "medium",
  "Wu Blockchain": "medium",
  "CryptoSlate": "medium",
  "BeInCrypto": "medium",
  "U.Today": "medium",
  "AMBCrypto": "medium",
  "NewsBTC": "medium",

  // Low: Aggregators, unverified, opinion-heavy
  "Crypto Briefing": "low",
  "CryptoPotato": "low",
  "CoinGape": "low",
  "Coinspeaker": "low",
};

// ─── Curated Crypto RSS Feeds ───────────────────────────────

export const CRYPTO_FEEDS: RssFeed[] = [
  // ── Breaking / Wire ──────────────────────────
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    category: "breaking",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["breaking", "markets", "regulation"],
  },
  {
    id: "theblock",
    name: "The Block",
    url: "https://www.theblock.co/rss.xml",
    category: "breaking",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["breaking", "markets", "defi"],
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    category: "breaking",
    credibility: "medium",
    tier: 1,
    lang: "en",
    tags: ["breaking", "markets"],
  },
  {
    id: "decrypt",
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    category: "breaking",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["breaking", "defi", "nfts"],
  },
  {
    id: "blockworks",
    name: "Blockworks",
    url: "https://blockworks.co/feed",
    category: "markets",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["markets", "institutional"],
  },
  {
    id: "dlnews",
    name: "DL News",
    url: "https://www.dlnews.com/rss/",
    category: "breaking",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["breaking", "regulation", "defi"],
  },

  // ── Markets / Trading ───────────────────────
  {
    id: "bitcoinmagazine",
    name: "Bitcoin Magazine",
    url: "https://bitcoinmagazine.com/feed",
    category: "markets",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["bitcoin", "markets", "technology"],
  },
  {
    id: "cryptoslate",
    name: "CryptoSlate",
    url: "https://cryptoslate.com/feed/",
    category: "markets",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["markets", "defi", "data"],
  },
  {
    id: "beincrypto",
    name: "BeInCrypto",
    url: "https://beincrypto.com/feed/",
    category: "markets",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["markets", "analysis"],
  },
  {
    id: "utoday",
    name: "U.Today",
    url: "https://u.today/rss",
    category: "markets",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["markets", "breaking"],
  },
  {
    id: "newsbtc",
    name: "NewsBTC",
    url: "https://www.newsbtc.com/feed/",
    category: "markets",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["markets", "analysis", "technology"],
  },

  // ── DeFi ────────────────────────────────────
  {
    id: "thedefiant",
    name: "The Defiant",
    url: "https://thedefiant.io/feed",
    category: "defi",
    credibility: "medium",
    tier: 1,
    lang: "en",
    tags: ["defi", "dao", "governance"],
  },
  {
    id: "bankless",
    name: "Bankless",
    url: "https://www.bankless.com/rss",
    category: "defi",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["defi", "ethereum", "layer2"],
  },
  {
    id: "rekt",
    name: "Rekt News",
    url: "https://rekt.news/feed/",
    category: "defi",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["defi", "security", "exploits"],
  },

  // ── Regulation ──────────────────────────────
  {
    id: "unchained",
    name: "Unchained",
    url: "https://unchainedcrypto.com/feed/",
    category: "regulation",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["regulation", "policy", "legal"],
  },

  // ── Technology ──────────────────────────────
  {
    id: "wublockchain",
    name: "Wu Blockchain",
    url: "https://wublock.substack.com/feed",
    category: "technology",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["technology", "mining", "china"],
  },
  {
    id: "ambcrypto",
    name: "AMBCrypto",
    url: "https://ambcrypto.com/feed/",
    category: "technology",
    credibility: "medium",
    tier: 3,
    lang: "en",
    tags: ["technology", "altcoins"],
  },

  // ── On-Chain / Data ─────────────────────────
  {
    id: "messari",
    name: "Messari",
    url: "https://messari.io/rss",
    category: "onchain",
    credibility: "medium",
    tier: 1,
    lang: "en",
    tags: ["research", "data", "onchain"],
  },

  // ── NFTs ────────────────────────────────────
  {
    id: "nftnow",
    name: "NFT Now",
    url: "https://nftnow.com/feed/",
    category: "nfts",
    credibility: "medium",
    tier: 2,
    lang: "en",
    tags: ["nfts", "art", "gaming"],
  },

  // ── Aggregators (low credibility but high volume) ──
  {
    id: "cryptopotato",
    name: "CryptoPotato",
    url: "https://cryptopotato.com/feed/",
    category: "markets",
    credibility: "low",
    tier: 3,
    lang: "en",
    tags: ["markets", "altcoins"],
  },
  {
    id: "cryptobriefing",
    name: "Crypto Briefing",
    url: "https://cryptobriefing.com/feed/",
    category: "markets",
    credibility: "low",
    tier: 3,
    lang: "en",
    tags: ["markets", "breaking"],
  },
  {
    id: "coingape",
    name: "CoinGape",
    url: "https://coingape.com/feed/",
    category: "markets",
    credibility: "low",
    tier: 3,
    lang: "en",
    tags: ["markets", "analysis"],
  },

  // ── Mainstream Finance (crypto-adjacent) ────
  {
    id: "bloomberg-crypto",
    name: "Bloomberg Crypto",
    url: "https://www.bloomberg.com/crypto/rss",
    category: "markets",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["institutional", "markets", "regulation"],
  },
  {
    id: "ft-digital-assets",
    name: "FT Digital Assets",
    url: "https://www.ft.com/digital-assets?format=rss",
    category: "markets",
    credibility: "high",
    tier: 1,
    lang: "en",
    tags: ["institutional", "regulation"],
  },
];

// ─── Feed Resolution ────────────────────────────────────────

export function getFeedsByCategory(category: FeedCategory): RssFeed[] {
  return CRYPTO_FEEDS.filter((f) => f.category === category);
}

export function getFeedsByCredibility(credibility: SourceCredibility): RssFeed[] {
  return CRYPTO_FEEDS.filter((f) => f.credibility === credibility);
}

export function getFeedsByTier(tier: 1 | 2 | 3): RssFeed[] {
  return CRYPTO_FEEDS.filter((f) => f.tier === tier);
}

export function getFeedById(id: string): RssFeed | undefined {
  return CRYPTO_FEEDS.find((f) => f.id === id);
}

export function getAllCategories(): FeedCategory[] {
  return [...new Set(CRYPTO_FEEDS.map((f) => f.category))];
}

export function getFeedStats(): {
  total: number;
  byCategory: Record<FeedCategory, number>;
  byCredibility: Record<SourceCredibility, number>;
  byTier: Record<number, number>;
} {
  const byCategory: Record<string, number> = {};
  const byCredibility: Record<string, number> = {};
  const byTier: Record<number, number> = {};

  for (const feed of CRYPTO_FEEDS) {
    byCategory[feed.category] = (byCategory[feed.category] || 0) + 1;
    byCredibility[feed.credibility] = (byCredibility[feed.credibility] || 0) + 1;
    byTier[feed.tier] = (byTier[feed.tier] || 0) + 1;
  }

  return {
    total: CRYPTO_FEEDS.length,
    byCategory: byCategory as Record<FeedCategory, number>,
    byCredibility: byCredibility as Record<SourceCredibility, number>,
    byTier: byTier as Record<number, number>,
  };
}
