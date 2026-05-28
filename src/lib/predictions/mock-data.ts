// ============================================================
// Prediction Markets — Mock Data
// Realistic Polymarket-style markets with plausible data
// ============================================================

export type MarketCategory = "Politics" | "Crypto" | "Sports" | "Science" | "Finance";
export type MarketStatus = "Open" | "Resolved" | "Upcoming";
export type TradeDirection = "YES" | "NO";
export type EntityType = "Whale" | "Bot" | "Fund" | "Retail" | "Insider";

export interface Market {
  id: string;
  title: string;
  category: MarketCategory;
  status: MarketStatus;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  totalVolume: number;
  traders: number;
  topTrader: string;
  topTraderEntity: string;
  createdAt: string;
  endDate: string;
  description: string;
  resolvedOutcome?: TradeDirection;
}

export interface PricePoint {
  timestamp: string;
  yesPrice: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
}

export interface Trader {
  rank: number;
  address: string;
  entityName: string;
  entityType: EntityType;
  markets: number;
  winRate: number;
  lifetimePnl: number;
  roi: number;
  openPositions: number;
  lastTrade: string;
  avatar?: string;
}

export interface Trade {
  id: string;
  timestamp: string;
  marketId: string;
  marketTitle: string;
  direction: TradeDirection;
  shares: number;
  price: number;
  value: number;
  entity: string;
  entityType: EntityType;
  category: MarketCategory;
}

export interface MarketDetail extends Market {
  priceHistory: PricePoint[];
  orderBook: OrderBook;
  topTraders: Trader[];
  recentTrades: Trade[];
  relatedMarkets: { id: string; title: string; yesPrice: number }[];
}

// ---- Markets ----

export const MARKETS: Market[] = [
  {
    id: "fed-rate-june-2026",
    title: "Will the Fed cut rates in June 2026?",
    category: "Finance",
    status: "Open",
    yesPrice: 0.34,
    noPrice: 0.66,
    volume24h: 1_420_000,
    totalVolume: 28_900_000,
    traders: 4_210,
    topTrader: "0x7a3e...9f21",
    topTraderEntity: "Paradigm Fund",
    createdAt: "2026-03-01",
    endDate: "2026-06-18",
    description: "Resolves YES if the Federal Reserve announces a federal funds rate cut at the June 2026 FOMC meeting.",
  },
  {
    id: "btc-150k-july",
    title: "Bitcoin above $150,000 by July 2026?",
    category: "Crypto",
    status: "Open",
    yesPrice: 0.52,
    noPrice: 0.48,
    volume24h: 3_100_000,
    totalVolume: 67_200_000,
    traders: 9_870,
    topTrader: "0xb4c2...1d8e",
    topTraderEntity: "Galaxy Trading",
    createdAt: "2026-01-15",
    endDate: "2026-07-31",
    description: "Resolves YES if BTC/USD reaches or exceeds $150,000 at any point before July 31, 2026.",
  },
  {
    id: "trump-approval-60",
    title: "Trump approval rating above 60% by August?",
    category: "Politics",
    status: "Open",
    yesPrice: 0.18,
    noPrice: 0.82,
    volume24h: 890_000,
    totalVolume: 14_500_000,
    traders: 3_120,
    topTrader: "0x3f91...b7c4",
    topTraderEntity: "Polymarket Whale",
    createdAt: "2026-02-10",
    endDate: "2026-08-31",
    description: "Resolves YES if any major national poll (Gallup, Pew, or 538 average) shows Trump approval at or above 60%.",
  },
  {
    id: "spacex-mars-2026",
    title: "SpaceX Starship lands on Mars by end of 2026?",
    category: "Science",
    status: "Open",
    yesPrice: 0.08,
    noPrice: 0.92,
    volume24h: 420_000,
    totalVolume: 9_100_000,
    traders: 2_780,
    topTrader: "0xd8e3...4a6f",
    topTraderEntity: "Space Capital",
    createdAt: "2025-12-01",
    endDate: "2026-12-31",
    description: "Resolves YES if SpaceX successfully lands a Starship vehicle on the surface of Mars before January 1, 2027.",
  },
  {
    id: "world-cup-2026",
    title: "Will Brazil win the 2026 FIFA World Cup?",
    category: "Sports",
    status: "Open",
    yesPrice: 0.14,
    noPrice: 0.86,
    volume24h: 1_870_000,
    totalVolume: 22_300_000,
    traders: 6_540,
    topTrader: "0x2b7d...e93a",
    topTraderEntity: "SportsEdge Bot",
    createdAt: "2025-11-20",
    endDate: "2026-07-19",
    description: "Resolves YES if Brazil wins the 2026 FIFA World Cup final.",
  },
  {
    id: "eth-flip-btc",
    title: "ETH market cap flips BTC by end of 2026?",
    category: "Crypto",
    status: "Open",
    yesPrice: 0.04,
    noPrice: 0.96,
    volume24h: 2_300_000,
    totalVolume: 41_000_000,
    traders: 5_430,
    topTrader: "0xf1a9...c2d7",
    topTraderEntity: "Polychain Capital",
    createdAt: "2026-01-05",
    endDate: "2026-12-31",
    description: "Resolves YES if ETH total market cap exceeds BTC total market cap at any point before January 1, 2027.",
  },
  {
    id: "us-recession-2026",
    title: "US enters recession in 2026?",
    category: "Finance",
    status: "Open",
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: 670_000,
    totalVolume: 11_400_000,
    traders: 2_890,
    topTrader: "0x5c8f...7b2e",
    topTraderEntity: "Citadel Macro",
    createdAt: "2026-01-20",
    endDate: "2026-12-31",
    description: "Resolves YES if NBER declares a US recession with start date in 2026.",
  },
  {
    id: "ai-pope-2026",
    title: "Next Pope elected by end of 2026?",
    category: "Politics",
    status: "Open",
    yesPrice: 0.41,
    noPrice: 0.59,
    volume24h: 310_000,
    totalVolume: 5_200_000,
    traders: 1_940,
    topTrader: "0xa3d6...f1b8",
    topTraderEntity: "Event Horizon",
    createdAt: "2026-04-10",
    endDate: "2026-12-31",
    description: "Resolves YES if a new Pope is elected before January 1, 2027.",
  },
  {
    id: "solana-400",
    title: "Solana above $400 by September 2026?",
    category: "Crypto",
    status: "Open",
    yesPrice: 0.38,
    noPrice: 0.62,
    volume24h: 1_540_000,
    totalVolume: 19_700_000,
    traders: 4_670,
    topTrader: "0xe7b2...9d4c",
    topTraderEntity: "Jump Trading",
    createdAt: "2026-03-01",
    endDate: "2026-09-30",
    description: "Resolves YES if SOL/USD reaches or exceeds $400 before October 1, 2026.",
  },
  {
    id: "nvidia-200",
    title: "NVIDIA stock above $200 by Q3 2026?",
    category: "Finance",
    status: "Open",
    yesPrice: 0.63,
    noPrice: 0.37,
    volume24h: 980_000,
    totalVolume: 16_800_000,
    traders: 3_450,
    topTrader: "0x1c4a...3e7f",
    topTraderEntity: "Point72 Quant",
    createdAt: "2026-02-15",
    endDate: "2026-09-30",
    description: "Resolves YES if NVIDIA (NVDA) share price reaches or exceeds $200 before October 1, 2026.",
  },
  {
    id: "elon-mars-tweet",
    title: "Elon tweets about Mars colony in May 2026?",
    category: "Science",
    status: "Resolved",
    yesPrice: 1.0,
    noPrice: 0.0,
    volume24h: 0,
    totalVolume: 3_400_000,
    traders: 2_100,
    topTrader: "0x8f2c...a1d3",
    topTraderEntity: "Memecoin Sniper",
    createdAt: "2026-04-01",
    endDate: "2026-05-31",
    resolvedOutcome: "YES",
    description: "Resolved YES. Elon Musk tweeted about Mars colony plans on May 12, 2026.",
  },
  {
    id: "formula1-2026",
    title: "Max Verstappen wins 2026 F1 Championship?",
    category: "Sports",
    status: "Open",
    yesPrice: 0.57,
    noPrice: 0.43,
    volume24h: 740_000,
    totalVolume: 8_900_000,
    traders: 3_780,
    topTrader: "0x6d4e...2c9a",
    topTraderEntity: "Apex Motors",
    createdAt: "2026-02-01",
    endDate: "2026-12-07",
    description: "Resolves YES if Max Verstappen wins the 2026 FIA Formula One World Championship.",
  },
  {
    id: "gpt6-launch",
    title: "OpenAI launches GPT-6 by October 2026?",
    category: "Science",
    status: "Open",
    yesPrice: 0.45,
    noPrice: 0.55,
    volume24h: 1_230_000,
    totalVolume: 21_600_000,
    traders: 5_210,
    topTrader: "0x9a3f...d6b1",
    topTraderEntity: "AI Ventures",
    createdAt: "2026-03-15",
    endDate: "2026-10-31",
    description: "Resolves YES if OpenAI publicly releases a model branded as GPT-6 before November 1, 2026.",
  },
  {
    id: "ukraine-peace-2026",
    title: "Russia-Ukraine ceasefire by end of 2026?",
    category: "Politics",
    status: "Open",
    yesPrice: 0.12,
    noPrice: 0.88,
    volume24h: 560_000,
    totalVolume: 12_800_000,
    traders: 3_890,
    topTrader: "0xc2f8...7e4d",
    topTraderEntity: "Macro Policy Fund",
    createdAt: "2025-12-15",
    endDate: "2026-12-31",
    description: "Resolves YES if an internationally recognized ceasefire agreement is in effect between Russia and Ukraine before January 1, 2027.",
  },
  {
    id: "nfl-chiefs-3peat",
    title: "Chiefs win Super Bowl LXI (3-peat)?",
    category: "Sports",
    status: "Upcoming",
    yesPrice: 0.11,
    noPrice: 0.89,
    volume24h: 420_000,
    totalVolume: 6_100_000,
    traders: 4_120,
    topTrader: "0x4e7b...a8c2",
    topTraderEntity: "Gridiron Analytics",
    createdAt: "2026-05-01",
    endDate: "2027-02-14",
    description: "Resolves YES if the Kansas City Chiefs win Super Bowl LXI.",
  },
];

// ---- Price History Generator ----

function generatePriceHistory(basePrice: number, volatility: number, days: number): PricePoint[] {
  const points: PricePoint[] = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const drift = (Math.random() - 0.48) * volatility;
    price = Math.max(0.02, Math.min(0.98, price + drift));
    points.push({
      timestamp: d.toISOString().split("T")[0],
      yesPrice: Math.round(price * 100) / 100,
      volume: Math.round(50_000 + Math.random() * 500_000),
    });
  }
  return points;
}

// ---- Order Book Generator ----

function generateOrderBook(currentPrice: number): OrderBook {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < 12; i++) {
    const bidPrice = Math.round((currentPrice - 0.01 * (i + 1)) * 100) / 100;
    const askPrice = Math.round((currentPrice + 0.01 * (i + 1)) * 100) / 100;
    const bidSize = Math.round(500 + Math.random() * 5000);
    const askSize = Math.round(500 + Math.random() * 5000);
    bidTotal += bidSize;
    askTotal += askSize;
    if (bidPrice > 0) bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
    if (askPrice < 1) asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  return {
    bids,
    asks,
    spread: asks.length > 0 && bids.length > 0
      ? Math.round((asks[0].price - bids[0].price) * 100) / 100
      : 0,
  };
}

// ---- Traders ----

export const TOP_TRADERS: Trader[] = [
  { rank: 1, address: "0x7a3e...9f21", entityName: "Paradigm Fund", entityType: "Fund", markets: 34, winRate: 0.74, lifetimePnl: 2_420_000, roi: 186.3, openPositions: 12, lastTrade: "2m ago" },
  { rank: 2, address: "0xb4c2...1d8e", entityName: "Galaxy Trading", entityType: "Fund", markets: 28, winRate: 0.71, lifetimePnl: 1_890_000, roi: 152.7, openPositions: 8, lastTrade: "5m ago" },
  { rank: 3, address: "0xf1a9...c2d7", entityName: "Polychain Capital", entityType: "Fund", markets: 42, winRate: 0.68, lifetimePnl: 1_540_000, roi: 134.2, openPositions: 15, lastTrade: "1m ago" },
  { rank: 4, address: "0x3f91...b7c4", entityName: "Polymarket Whale", entityType: "Whale", markets: 19, winRate: 0.79, lifetimePnl: 1_210_000, roi: 221.5, openPositions: 6, lastTrade: "8m ago" },
  { rank: 5, address: "0xe7b2...9d4c", entityName: "Jump Trading", entityType: "Fund", markets: 56, winRate: 0.62, lifetimePnl: 980_000, roi: 97.8, openPositions: 22, lastTrade: "3m ago" },
  { rank: 6, address: "0xd8e3...4a6f", entityName: "Space Capital", entityType: "Fund", markets: 14, winRate: 0.82, lifetimePnl: 870_000, roi: 289.1, openPositions: 4, lastTrade: "12m ago" },
  { rank: 7, address: "0x1c4a...3e7f", entityName: "Point72 Quant", entityType: "Fund", markets: 31, winRate: 0.65, lifetimePnl: 760_000, roi: 112.4, openPositions: 9, lastTrade: "4m ago" },
  { rank: 8, address: "0x2b7d...e93a", entityName: "SportsEdge Bot", entityType: "Bot", markets: 89, winRate: 0.58, lifetimePnl: 640_000, roi: 76.3, openPositions: 34, lastTrade: "20s ago" },
  { rank: 9, address: "0x5c8f...7b2e", entityName: "Citadel Macro", entityType: "Fund", markets: 22, winRate: 0.67, lifetimePnl: 520_000, roi: 94.7, openPositions: 7, lastTrade: "15m ago" },
  { rank: 10, address: "0x9a3f...d6b1", entityName: "AI Ventures", entityType: "Fund", markets: 17, winRate: 0.73, lifetimePnl: 410_000, roi: 145.2, openPositions: 5, lastTrade: "7m ago" },
  { rank: 11, address: "0xc2f8...7e4d", entityName: "Macro Policy Fund", entityType: "Fund", markets: 25, winRate: 0.61, lifetimePnl: 340_000, roi: 68.9, openPositions: 11, lastTrade: "22m ago" },
  { rank: 12, address: "0xa3d6...f1b8", entityName: "Event Horizon", entityType: "Fund", markets: 18, winRate: 0.7, lifetimePnl: 290_000, roi: 118.6, openPositions: 6, lastTrade: "30m ago" },
  { rank: 13, address: "0x6d4e...2c9a", entityName: "Apex Motors", entityType: "Fund", markets: 11, winRate: 0.75, lifetimePnl: 210_000, roi: 167.4, openPositions: 3, lastTrade: "1h ago" },
  { rank: 14, address: "0x4e7b...a8c2", entityName: "Gridiron Analytics", entityType: "Bot", markets: 67, winRate: 0.55, lifetimePnl: 180_000, roi: 52.1, openPositions: 28, lastTrade: "1m ago" },
  { rank: 15, address: "0x8f2c...a1d3", entityName: "Memecoin Sniper", entityType: "Whale", markets: 45, winRate: 0.49, lifetimePnl: -120_000, roi: -23.4, openPositions: 19, lastTrade: "45s ago" },
];

// ---- Trade Feed Generator ----

const TRADE_ENTITIES = [
  { name: "Paradigm Fund", type: "Fund" as EntityType },
  { name: "Galaxy Trading", type: "Fund" as EntityType },
  { name: "SportsEdge Bot", type: "Bot" as EntityType },
  { name: "Polymarket Whale", type: "Whale" as EntityType },
  { name: "Jump Trading", type: "Fund" as EntityType },
  { name: "anon_7f3a", type: "Retail" as EntityType },
  { name: "Memecoin Sniper", type: "Whale" as EntityType },
  { name: "AI Ventures", type: "Fund" as EntityType },
  { name: "SmartMoney_0x", type: "Insider" as EntityType },
  { name: "RetailTrader42", type: "Retail" as EntityType },
  { name: "Gridiron Analytics", type: "Bot" as EntityType },
  { name: "Quantum Capital", type: "Fund" as EntityType },
];

export function generateTrades(count: number): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const market = MARKETS[Math.floor(Math.random() * MARKETS.length)];
    const entity = TRADE_ENTITIES[Math.floor(Math.random() * TRADE_ENTITIES.length)];
    const direction: TradeDirection = Math.random() > 0.5 ? "YES" : "NO";
    const price = direction === "YES" ? market.yesPrice : market.noPrice;
    const shares = Math.round(10 + Math.random() * 2000);
    const jitter = (Math.random() - 0.5) * 0.04;
    const execPrice = Math.round(Math.max(0.01, Math.min(0.99, price + jitter)) * 100) / 100;
    trades.push({
      id: `trade-${i}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(now - i * (5_000 + Math.random() * 25_000)).toISOString(),
      marketId: market.id,
      marketTitle: market.title,
      direction,
      shares,
      price: execPrice,
      value: Math.round(shares * execPrice * 100) / 100,
      entity: entity.name,
      entityType: entity.type,
      category: market.category,
    });
  }
  return trades;
}

// ---- Market Detail ----

export function getMarketDetail(marketId: string): MarketDetail | null {
  const market = MARKETS.find((m) => m.id === marketId);
  if (!market) return null;

  return {
    ...market,
    priceHistory: generatePriceHistory(market.yesPrice, 0.03, 90),
    orderBook: generateOrderBook(market.yesPrice),
    topTraders: TOP_TRADERS.slice(0, 8),
    recentTrades: generateTrades(20),
    relatedMarkets: MARKETS
      .filter((m) => m.id !== marketId && m.category === market.category)
      .slice(0, 4)
      .map((m) => ({ id: m.id, title: m.title, yesPrice: m.yesPrice })),
  };
}

// ---- Category colors ----

export const CATEGORY_COLORS: Record<MarketCategory, string> = {
  Politics: "#8B5CF6",
  Crypto: "#00D4FF",
  Sports: "#00FF88",
  Science: "#FFB800",
  Finance: "#FF3D6B",
};
