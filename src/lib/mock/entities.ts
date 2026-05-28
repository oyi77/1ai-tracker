export interface Entity {
  slug: string;
  name: string;
  type: "Exchange" | "Whale" | "Fund" | "Protocol" | "Government" | "Unknown";
  logo: string;
  verified: boolean;
  chains: string[];
  totalValue: number;
  change24h: number;
  pnl7d: number;
  riskScore: number;
  lastActive: string;
  tags: string[];
  description: string;
}

export interface TokenHolding {
  token: string;
  symbol: string;
  amount: number;
  usdValue: number;
  percent: number;
  change24h: number;
  chain: string;
}

export interface NetFlow {
  date: string;
  inflow: number;
  outflow: number;
}

export interface Transaction {
  id: string;
  type: "inflow" | "outflow" | "swap" | "bridge";
  token: string;
  amount: number;
  usdValue: number;
  chain: string;
  from: string;
  to: string;
  timestamp: string;
  hash: string;
}

export interface LabeledAddress {
  address: string;
  label: string;
  chain: string;
  balance: number;
}

export interface ConnectedEntity {
  slug: string;
  name: string;
  type: string;
  relationship: string;
  strength: number;
  volume: number;
}

export interface WalletProfile {
  address: string;
  entity: Entity | null;
  pnlHistory: PnlPoint[];
  tokenAccumulation: TokenAccumulation[];
  copySignal: string;
}

export interface PnlPoint {
  date: string;
  realized: number;
  unrealized: number;
  total: number;
}

export interface TokenAccumulation {
  date: string;
  token: string;
  amount: number;
  usdValue: number;
}

export const mockEntities: Entity[] = [
  {
    slug: "binance",
    name: "Binance",
    type: "Exchange",
    logo: "🟡",
    verified: true,
    chains: ["ethereum", "bitcoin", "solana", "arbitrum", "base"],
    totalValue: 18_450_000_000,
    change24h: 2.34,
    pnl7d: 5.12,
    riskScore: 15,
    lastActive: "2026-05-28T10:30:00Z",
    tags: ["exchange", "cex", "top-volume"],
    description: "World's largest cryptocurrency exchange by trading volume.",
  },
  {
    slug: "jump-trading",
    name: "Jump Trading",
    type: "Fund",
    logo: "🟢",
    verified: true,
    chains: ["ethereum", "solana", "arbitrum", "base"],
    totalValue: 3_200_000_000,
    change24h: -1.23,
    pnl7d: -3.45,
    riskScore: 35,
    lastActive: "2026-05-28T09:15:00Z",
    tags: ["market-maker", "quant", "high-frequency"],
    description: "Global proprietary trading firm and market maker.",
  },
  {
    slug: "a16z",
    name: "a16z Crypto",
    type: "Fund",
    logo: "🔵",
    verified: true,
    chains: ["ethereum", "solana", "base"],
    totalValue: 7_800_000_000,
    change24h: 0.87,
    pnl7d: 2.15,
    riskScore: 20,
    lastActive: "2026-05-27T18:00:00Z",
    tags: ["vc", "venture-capital", "long-term"],
    description: "Andreessen Horowitz's crypto-focused venture fund.",
  },
  {
    slug: "wintermute",
    name: "Wintermute",
    type: "Fund",
    logo: "⚪",
    verified: true,
    chains: ["ethereum", "arbitrum", "optimism", "base"],
    totalValue: 1_450_000_000,
    change24h: 3.56,
    pnl7d: 8.92,
    riskScore: 28,
    lastActive: "2026-05-28T11:00:00Z",
    tags: ["market-maker", "liquidity", "algo-trading"],
    description: "Leading global algorithmic market maker in digital assets.",
  },
  {
    slug: "uniswap-labs",
    name: "Uniswap Labs",
    type: "Protocol",
    logo: "🦄",
    verified: true,
    chains: ["ethereum", "arbitrum", "optimism", "base", "polygon"],
    totalValue: 2_100_000_000,
    change24h: -0.45,
    pnl7d: 1.23,
    riskScore: 12,
    lastActive: "2026-05-28T08:45:00Z",
    tags: ["dex", "amm", "defi"],
    description: "Decentralized trading protocol on Ethereum and L2s.",
  },
  {
    slug: "us-government",
    name: "US Government",
    type: "Government",
    logo: "🏛️",
    verified: true,
    chains: ["bitcoin", "ethereum"],
    totalValue: 15_200_000_000,
    change24h: 0,
    pnl7d: 0,
    riskScore: 5,
    lastActive: "2026-05-20T12:00:00Z",
    tags: ["government", "seized", "long-term-hold"],
    description: "Cryptocurrency holdings seized by US federal agencies.",
  },
  {
    slug: "whale-0x7a2",
    name: "Whale 0x7a2...e9f",
    type: "Whale",
    logo: "🐋",
    verified: false,
    chains: ["ethereum", "arbitrum"],
    totalValue: 890_000_000,
    change24h: 5.67,
    pnl7d: 12.34,
    riskScore: 72,
    lastActive: "2026-05-28T11:30:00Z",
    tags: ["whale", "active-trader", "defi-user"],
    description: "High-value unidentified wallet with significant DeFi activity.",
  },
  {
    slug: "paradigm",
    name: "Paradigm",
    type: "Fund",
    logo: "🟣",
    verified: true,
    chains: ["ethereum", "solana", "base"],
    totalValue: 4_500_000_000,
    change24h: 1.12,
    pnl7d: 3.78,
    riskScore: 18,
    lastActive: "2026-05-27T22:00:00Z",
    tags: ["vc", "venture-capital", "research"],
    description: "Research-driven technology investment firm focused on crypto.",
  },
  {
    slug: "coinbase",
    name: "Coinbase",
    type: "Exchange",
    logo: "🔷",
    verified: true,
    chains: ["ethereum", "bitcoin", "base", "solana"],
    totalValue: 12_300_000_000,
    change24h: 1.89,
    pnl7d: 4.56,
    riskScore: 10,
    lastActive: "2026-05-28T10:00:00Z",
    tags: ["exchange", "cex", "public-company"],
    description: "US-based publicly traded cryptocurrency exchange.",
  },
  {
    slug: "maker-dao",
    name: "MakerDAO",
    type: "Protocol",
    logo: "⬛",
    verified: true,
    chains: ["ethereum"],
    totalValue: 8_900_000_000,
    change24h: 0.34,
    pnl7d: 0.89,
    riskScore: 14,
    lastActive: "2026-05-28T07:00:00Z",
    tags: ["defi", "stablecoin", "dao"],
    description: "Decentralized autonomous organization behind DAI stablecoin.",
  },
];

export const mockHoldings: Record<string, TokenHolding[]> = {
  binance: [
    { token: "Bitcoin", symbol: "BTC", amount: 245_000, usdValue: 16_420_000_000, percent: 88.9, change24h: 2.1, chain: "bitcoin" },
    { token: "Ethereum", symbol: "ETH", amount: 520_000, usdValue: 1_560_000_000, percent: 8.5, change24h: 3.2, chain: "ethereum" },
    { token: "Solana", symbol: "SOL", amount: 2_800_000, usdValue: 280_000_000, percent: 1.5, change24h: -1.5, chain: "solana" },
    { token: "USD Coin", symbol: "USDC", amount: 120_000_000, usdValue: 120_000_000, percent: 0.7, change24h: 0, chain: "ethereum" },
    { token: "Arbitrum", symbol: "ARB", amount: 45_000_000, usdValue: 45_000_000, percent: 0.2, change24h: 4.5, chain: "arbitrum" },
    { token: "Optimism", symbol: "OP", amount: 15_000_000, usdValue: 25_000_000, percent: 0.1, change24h: 2.8, chain: "optimism" },
  ],
  "jump-trading": [
    { token: "Ethereum", symbol: "ETH", amount: 380_000, usdValue: 1_140_000_000, percent: 35.6, change24h: 3.2, chain: "ethereum" },
    { token: "Solana", symbol: "SOL", amount: 12_000_000, usdValue: 1_200_000_000, percent: 37.5, change24h: -1.5, chain: "solana" },
    { token: "Bitcoin", symbol: "BTC", amount: 8_500, usdValue: 567_000_000, percent: 17.7, change24h: 2.1, chain: "bitcoin" },
    { token: "USD Coin", symbol: "USDC", amount: 180_000_000, usdValue: 180_000_000, percent: 5.6, change24h: 0, chain: "ethereum" },
    { token: "Arbitrum", symbol: "ARB", amount: 80_000_000, usdValue: 80_000_000, percent: 2.5, change24h: 4.5, chain: "arbitrum" },
    { token: "Base ETH", symbol: "ETH", amount: 22_000, usdValue: 33_000_000, percent: 1.0, change24h: 3.2, chain: "base" },
  ],
};

export const mockNetFlows: Record<string, NetFlow[]> = {
  binance: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    inflow: Math.floor(Math.random() * 500_000_000 + 100_000_000),
    outflow: Math.floor(Math.random() * 450_000_000 + 80_000_000),
  })),
  "jump-trading": Array.from({ length: 30 }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    inflow: Math.floor(Math.random() * 80_000_000 + 10_000_000),
    outflow: Math.floor(Math.random() * 90_000_000 + 15_000_000),
  })),
};

export const mockTransactions: Record<string, Transaction[]> = {
  binance: [
    { id: "tx1", type: "inflow", token: "BTC", amount: 1200, usdValue: 80_040_000, chain: "bitcoin", from: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", to: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo", timestamp: "2026-05-28T10:30:00Z", hash: "0xabc1...def1" },
    { id: "tx2", type: "outflow", token: "ETH", amount: 15000, usdValue: 45_000_000, chain: "ethereum", from: "0x28C6c06298d514Db089934071355E5743bf21d60", to: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", timestamp: "2026-05-28T09:15:00Z", hash: "0xabc2...def2" },
    { id: "tx3", type: "swap", token: "ETH→USDC", amount: 5000, usdValue: 15_000_000, chain: "ethereum", from: "0x28C6c06298d514Db089934071355E5743bf21d60", to: "0x28C6c06298d514Db089934071355E5743bf21d60", timestamp: "2026-05-28T08:45:00Z", hash: "0xabc3...def3" },
    { id: "tx4", type: "inflow", token: "SOL", amount: 500000, usdValue: 50_000_000, chain: "solana", from: "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eSTYAGR6oRQxr", to: "H8sMJSCQFETfm5ALZBN4VE2nCamGGyZMRRXfJGp1hbE", timestamp: "2026-05-28T07:30:00Z", hash: "5Kj9...abc4" },
    { id: "tx5", type: "bridge", token: "ETH", amount: 8000, usdValue: 24_000_000, chain: "arbitrum", from: "0x28C6c06298d514Db089934071355E5743bf21d60", to: "0x1c4b70a3968436B9A0a9cf5205c787eb81Bb558c", timestamp: "2026-05-28T06:00:00Z", hash: "0xabc5...def5" },
    { id: "tx6", type: "outflow", token: "USDC", amount: 100_000_000, usdValue: 100_000_000, chain: "base", from: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", to: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", timestamp: "2026-05-27T23:00:00Z", hash: "0xabc6...def6" },
  ],
};

export const mockLabeledAddresses: Record<string, LabeledAddress[]> = {
  binance: [
    { address: "0x28C6c06298d514Db089934071355E5743bf21d60", label: "Hot Wallet", chain: "ethereum", balance: 520_000_000 },
    { address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", label: "Cold Wallet", chain: "ethereum", balance: 2_100_000_000 },
    { address: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo", label: "BTC Cold Storage", chain: "bitcoin", balance: 8_900_000_000 },
    { address: "H8sMJSCQFETfm5ALZBN4VE2nCamGGyZMRRXfJGp1hbE", label: "SOL Hot Wallet", chain: "solana", balance: 180_000_000 },
    { address: "0x1c4b70a3968436B9A0a9cf5205c787eb81Bb558c", label: "ARB Hot Wallet", chain: "arbitrum", balance: 45_000_000 },
    { address: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", label: "BASE Wallet", chain: "base", balance: 25_000_000 },
  ],
};

export const mockConnectedEntities: Record<string, ConnectedEntity[]> = {
  binance: [
    { slug: "jump-trading", name: "Jump Trading", type: "Fund", relationship: "Market Maker", strength: 0.9, volume: 2_300_000_000 },
    { slug: "wintermute", name: "Wintermute", type: "Fund", relationship: "Market Maker", strength: 0.85, volume: 1_800_000_000 },
    { slug: "uniswap-labs", name: "Uniswap Labs", type: "Protocol", relationship: "DEX Integration", strength: 0.6, volume: 450_000_000 },
    { slug: "a16z", name: "a16z Crypto", type: "Fund", relationship: "Investor", strength: 0.4, volume: 120_000_000 },
    { slug: "whale-0x7a2", name: "Whale 0x7a2", type: "Whale", relationship: "Large Depositor", strength: 0.7, volume: 890_000_000 },
    { slug: "coinbase", name: "Coinbase", type: "Exchange", relationship: "Competitor/Peer", strength: 0.5, volume: 560_000_000 },
    { slug: "paradigm", name: "Paradigm", type: "Fund", relationship: "OTC Counterparty", strength: 0.55, volume: 340_000_000 },
  ],
};

export const mockWalletProfile: WalletProfile = {
  address: "0x28C6c06298d514Db089934071355E5743bf21d60",
  entity: mockEntities[0],
  pnlHistory: Array.from({ length: 90 }, (_, i) => {
    const base = 100_000_000;
    const realized = base + i * 2_000_000 + Math.sin(i * 0.3) * 10_000_000;
    const unrealized = base * 0.3 + Math.cos(i * 0.2) * 15_000_000;
    return {
      date: `2026-${String(Math.floor(i / 30) + 3).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
      realized,
      unrealized,
      total: realized + unrealized,
    };
  }),
  tokenAccumulation: [
    { date: "2026-03-01", token: "ETH", amount: 120_000, usdValue: 360_000_000 },
    { date: "2026-03-15", token: "ETH", amount: 185_000, usdValue: 555_000_000 },
    { date: "2026-04-01", token: "ETH", amount: 250_000, usdValue: 750_000_000 },
    { date: "2026-04-15", token: "SOL", amount: 3_000_000, usdValue: 300_000_000 },
    { date: "2026-05-01", token: "ETH", amount: 380_000, usdValue: 1_140_000_000 },
    { date: "2026-05-15", token: "SOL", amount: 5_500_000, usdValue: 550_000_000 },
    { date: "2026-05-28", token: "ETH", amount: 520_000, usdValue: 1_560_000_000 },
  ],
  copySignal: "Accumulating ETH aggressively over 90d. Inflow pattern matches Jump Trading market-making cycle. Consider mirroring ETH long with 2x leverage entry at $2,950-$3,050 support zone.",
};
