// ─────────────────────────────────────────────────────────────
// Cross-Market Data Client — Forex, Commodities, Crypto
// Sources: open.er-api.com (free), CoinPaprika (existing), Alternative.me
// ─────────────────────────────────────────────────────────────

import * as coinpaprika from "@/lib/coinpaprika";

// ─── Types ─────────────────────────────────────────────────

export interface ForexPair {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change24h?: number;
}

export interface CommodityPrice {
  name: string;
  symbol: string;
  price: number;
  currency: string;
  change24h?: number;
}

export interface MarketOverview {
  forex: ForexPair[];
  commodities: CommodityPrice[];
  crypto: {
    btcPrice: number;
    ethPrice: number;
    totalMarketCap: number;
    btcDominance: number;
    fearGreed: number;
  };
  timestamp: string;
}

// ─── Exchange rate types ───────────────────────────────────

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

// ─── Fear & Greed types ────────────────────────────────────

interface FnGResponse {
  data: Array<{ value: string; timestamp: string }>;
}

// ─── Cache ─────────────────────────────────────────────────

let forexCache: { data: ForexPair[]; ts: number } | null = null;
let commodityCache: { data: CommodityPrice[]; ts: number } | null = null;
let overviewCache: { data: MarketOverview; ts: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// ─── Major forex pairs (base/quote) ────────────────────────

const MAJOR_PAIRS: Array<{ base: string; quote: string }> = [
  { base: "EUR", quote: "USD" },
  { base: "GBP", quote: "USD" },
  { base: "USD", quote: "JPY" },
  { base: "USD", quote: "CHF" },
  { base: "AUD", quote: "USD" },
  { base: "USD", quote: "CAD" },
  { base: "NZD", quote: "USD" },
];

// ─── Helpers ───────────────────────────────────────────────

async function fetchExchangeRates(base: string): Promise<ExchangeRateResponse> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
  return res.json() as Promise<ExchangeRateResponse>;
}

// ─── Public API ────────────────────────────────────────────

/** Fetch forex rates for major pairs against USD */
export async function getForexRates(base = "USD"): Promise<ForexPair[]> {
  const now = Date.now();
  if (forexCache && now - forexCache.ts < CACHE_TTL_MS) {
    return forexCache.data;
  }

  const usdRates = await fetchExchangeRates(base);

  const pairs: ForexPair[] = MAJOR_PAIRS.map(({ base: b, quote: q }) => ({
    pair: `${b}/${q}`,
    base: b,
    quote: q,
    rate: b === "USD" ? usdRates.rates[q] : 1 / usdRates.rates[b],
  }));

  forexCache = { data: pairs, ts: now };
  return pairs;
}

/** Fetch commodity prices (Gold, Silver, Oil, Natural Gas + digital commodities) */
export async function getCommodityPrices(): Promise<CommodityPrice[]> {
  const now = Date.now();
  if (commodityCache && now - commodityCache.ts < CACHE_TTL_MS) {
    return commodityCache.data;
  }

  // Hardcoded baseline prices (updated manually; these are reference points)
  // In production, these could come from a commodity API or be cross-referenced
  const hardCommodities: CommodityPrice[] = [
    { name: "Gold", symbol: "XAU", price: 2350.0, currency: "USD" },
    { name: "Silver", symbol: "XAG", price: 30.5, currency: "USD" },
    { name: "Crude Oil (WTI)", symbol: "CL", price: 78.0, currency: "USD" },
    { name: "Natural Gas", symbol: "NG", price: 2.85, currency: "USD" },
  ];

  // Fetch BTC and ETH as digital commodities via CoinPaprika
  let digitalCommodities: CommodityPrice[] = [];
  try {
    const [btc, eth] = await Promise.all([
      coinpaprika.getTicker("btc-bitcoin"),
      coinpaprika.getTicker("eth-ethereum"),
    ]);
    digitalCommodities = [
      {
        name: "Bitcoin",
        symbol: "BTC",
        price: btc.price,
        currency: "USD",
        change24h: btc.change24h,
      },
      {
        name: "Ethereum",
        symbol: "ETH",
        price: eth.price,
        currency: "USD",
        change24h: eth.change24h,
      },
    ];
  } catch {
    // CoinPaprika unavailable — continue with hard commodities only
  }

  const all = [...hardCommodities, ...digitalCommodities];
  commodityCache = { data: all, ts: now };
  return all;
}

/** Fetch Alternative.me Fear & Greed Index */
async function getFearGreed(): Promise<number> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    next: { revalidate: 300 },
  });
  if (!res.ok) return 50; // neutral fallback
  const body = (await res.json()) as FnGResponse;
  const val = body.data?.[0]?.value;
  return val ? Number(val) : 50;
}

/** Combined market overview: crypto + forex + commodities */
export async function getMarketOverview(): Promise<MarketOverview> {
  const now = Date.now();
  if (overviewCache && now - overviewCache.ts < CACHE_TTL_MS) {
    return overviewCache.data;
  }

  const [forex, commodities, globalResult, btcResult, ethResult, fearGreed] =
    await Promise.all([
      getForexRates().catch(() => [] as ForexPair[]),
      getCommodityPrices().catch(() => [] as CommodityPrice[]),
      coinpaprika.getGlobal().catch(() => ({ market_cap_usd: 0, bitcoin_dominance_percentage: 0, volume_24h_usd: 0, cryptocurrencies_number: 0, market_cap_change_24h: 0, volume_24h_change_24h: 0, market_cap_ath_value: 0, market_cap_ath_date: "", volume_24h_ath_value: 0, volume_24h_ath_date: "", last_updated: 0 })),
      coinpaprika.getTicker("btc-bitcoin").catch(() => ({ id: "btc-bitcoin", name: "Bitcoin", symbol: "BTC", rank: 1, price: 0, volume24h: 0, marketCap: 0, change1h: 0, change24h: 0, change7d: 0, change30d: 0, change1y: 0, athPrice: 0, athDate: "", athDrop: 0, circulatingSupply: 0, totalSupply: 0, maxSupply: null })),
      coinpaprika.getTicker("eth-ethereum").catch(() => ({ id: "eth-ethereum", name: "Ethereum", symbol: "ETH", rank: 2, price: 0, volume24h: 0, marketCap: 0, change1h: 0, change24h: 0, change7d: 0, change30d: 0, change1y: 0, athPrice: 0, athDate: "", athDrop: 0, circulatingSupply: 0, totalSupply: 0, maxSupply: null })),
      getFearGreed().catch(() => 0),
    ]);

  const overview: MarketOverview = {
    forex,
    commodities,
    crypto: {
      btcPrice: btcResult.price,
      ethPrice: ethResult.price,
      totalMarketCap: globalResult.market_cap_usd,
      btcDominance: globalResult.bitcoin_dominance_percentage,
      fearGreed,
    },
    timestamp: new Date().toISOString(),
  };

  overviewCache = { data: overview, ts: now };
  return overview;
}
