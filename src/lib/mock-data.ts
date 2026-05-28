// ============================================================
// Mock data for NEXUS Smart Money & Token Analytics
// ============================================================

// --- Smart Money Feed ---

export type ActionType =
  | "Accumulated"
  | "Exited"
  | "Bridged"
  | "Staked"
  | "Unstaked"
  | "Provided Liquidity"
  | "Removed Liquidity"
  | "Swapped";

export type EntityCategory = "Exchange" | "Whale" | "Fund" | "Protocol" | "Degen";

export interface SmartMoneyEvent {
  id: string;
  entity: string;
  entityCategory: EntityCategory;
  action: ActionType;
  token: string;
  tokenSymbol: string;
  amount: number;
  usdValue: number;
  chain: string;
  timestamp: string;
  walletCount: number; // how many smart wallets did this
}

export const smartMoneyEvents: SmartMoneyEvent[] = [
  { id: "1", entity: "Jump Trading", entityCategory: "Fund", action: "Accumulated", token: "Ethereum", tokenSymbol: "ETH", amount: 4200, usdValue: 15_120_000, chain: "Ethereum", timestamp: "2026-05-28T09:12:00Z", walletCount: 4 },
  { id: "2", entity: "Wintermute", entityCategory: "Fund", action: "Swapped", token: "Solana", tokenSymbol: "SOL", amount: 185_000, usdValue: 9_250_000, chain: "Solana", timestamp: "2026-05-28T08:55:00Z", walletCount: 2 },
  { id: "3", entity: "Alameda Legacy", entityCategory: "Whale", action: "Exited", token: "Aave", tokenSymbol: "AAVE", amount: 12_400, usdValue: 3_720_000, chain: "Ethereum", timestamp: "2026-05-28T08:30:00Z", walletCount: 1 },
  { id: "4", entity: "Paradigm", entityCategory: "Fund", action: "Staked", token: "Ethereum", tokenSymbol: "ETH", amount: 8_000, usdValue: 28_800_000, chain: "Ethereum", timestamp: "2026-05-28T07:45:00Z", walletCount: 3 },
  { id: "5", entity: "Galaxy Digital", entityCategory: "Fund", action: "Bridged", token: "USD Coin", tokenSymbol: "USDC", amount: 50_000_000, usdValue: 50_000_000, chain: "Arbitrum", timestamp: "2026-05-28T07:20:00Z", walletCount: 2 },
  { id: "6", entity: "DegenSpartan", entityCategory: "Degen", action: "Accumulated", token: "Pepe", tokenSymbol: "PEPE", amount: 420_000_000_000, usdValue: 840_000, chain: "Ethereum", timestamp: "2026-05-28T06:50:00Z", walletCount: 5 },
  { id: "7", entity: "Cumberland", entityCategory: "Exchange", action: "Provided Liquidity", token: "Uniswap", tokenSymbol: "UNI", amount: 250_000, usdValue: 2_500_000, chain: "Ethereum", timestamp: "2026-05-28T06:15:00Z", walletCount: 3 },
  { id: "8", entity: "a]16z", entityCategory: "Fund", action: "Accumulated", token: "Optimism", tokenSymbol: "OP", amount: 2_000_000, usdValue: 5_600_000, chain: "Optimism", timestamp: "2026-05-28T05:40:00Z", walletCount: 2 },
  { id: "9", entity: "Whale 0x742d", entityCategory: "Whale", action: "Removed Liquidity", token: "Curve", tokenSymbol: "CRV", amount: 500_000, usdValue: 450_000, chain: "Ethereum", timestamp: "2026-05-28T05:00:00Z", walletCount: 1 },
  { id: "10", entity: "Pantera Capital", entityCategory: "Fund", action: "Unstaked", token: "Lido", tokenSymbol: "LDO", amount: 100_000, usdValue: 280_000, chain: "Ethereum", timestamp: "2026-05-28T04:30:00Z", walletCount: 2 },
  { id: "11", entity: "Jump Trading", entityCategory: "Fund", action: "Swapped", token: "Arbitrum", tokenSymbol: "ARB", amount: 5_000_000, usdValue: 6_500_000, chain: "Arbitrum", timestamp: "2026-05-28T04:00:00Z", walletCount: 4 },
  { id: "12", entity: "Wintermute", entityCategory: "Fund", action: "Accumulated", token: "Chainlink", tokenSymbol: "LINK", amount: 150_000, usdValue: 2_250_000, chain: "Ethereum", timestamp: "2026-05-28T03:30:00Z", walletCount: 3 },
  { id: "13", entity: "Whale 0xdead", entityCategory: "Whale", action: "Bridged", token: "Ethereum", tokenSymbol: "ETH", amount: 1_200, usdValue: 4_320_000, chain: "Base", timestamp: "2026-05-28T02:50:00Z", walletCount: 1 },
  { id: "14", entity: "Polychain Capital", entityCategory: "Fund", action: "Staked", token: "Solana", tokenSymbol: "SOL", amount: 50_000, usdValue: 2_500_000, chain: "Solana", timestamp: "2026-05-28T02:15:00Z", walletCount: 2 },
  { id: "15", entity: "GSR Markets", entityCategory: "Fund", action: "Exited", token: "Render", tokenSymbol: "RNDR", amount: 200_000, usdValue: 1_600_000, chain: "Ethereum", timestamp: "2026-05-28T01:40:00Z", walletCount: 1 },
];

// --- Tokens ---

export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  smartMoneyFlow: number; // net inflow (+) or outflow (-)
  walletCount: number;
  holderDistribution: { top10: number; top11to50: number; top51to100: number; retail: number };
  chain: string;
  logoUrl?: string;
  trending?: boolean;
  watchlisted?: boolean;
}

export const tokenList: TokenData[] = [
  { id: "eth", name: "Ethereum", symbol: "ETH", price: 3600, priceChange24h: 2.4, marketCap: 432_000_000_000, volume24h: 18_500_000_000, smartMoneyFlow: 42_000_000, walletCount: 18, holderDistribution: { top10: 35, top11to50: 25, top51to100: 15, retail: 25 }, chain: "Ethereum", trending: true },
  { id: "sol", name: "Solana", symbol: "SOL", price: 185, priceChange24h: -1.2, marketCap: 82_000_000_000, volume24h: 4_200_000_000, smartMoneyFlow: 15_500_000, walletCount: 12, holderDistribution: { top10: 40, top11to50: 22, top51to100: 13, retail: 25 }, chain: "Solana", trending: true },
  { id: "link", name: "Chainlink", symbol: "LINK", price: 15.2, priceChange24h: 5.8, marketCap: 9_100_000_000, volume24h: 820_000_000, smartMoneyFlow: 8_200_000, walletCount: 8, holderDistribution: { top10: 45, top11to50: 20, top51to100: 12, retail: 23 }, chain: "Ethereum", trending: true },
  { id: "aave", name: "Aave", symbol: "AAVE", price: 300, priceChange24h: -3.1, marketCap: 4_500_000_000, volume24h: 310_000_000, smartMoneyFlow: -5_200_000, walletCount: 5, holderDistribution: { top10: 38, top11to50: 24, top51to100: 14, retail: 24 }, chain: "Ethereum" },
  { id: "arb", name: "Arbitrum", symbol: "ARB", price: 1.3, priceChange24h: 1.9, marketCap: 3_900_000_000, volume24h: 450_000_000, smartMoneyFlow: 12_000_000, walletCount: 10, holderDistribution: { top10: 50, top11to50: 20, top51to100: 12, retail: 18 }, chain: "Arbitrum", watchlisted: true },
  { id: "op", name: "Optimism", symbol: "OP", price: 2.8, priceChange24h: 4.2, marketCap: 3_100_000_000, volume24h: 280_000_000, smartMoneyFlow: 9_800_000, walletCount: 6, holderDistribution: { top10: 48, top11to50: 22, top51to100: 10, retail: 20 }, chain: "Optimism" },
  { id: "uni", name: "Uniswap", symbol: "UNI", price: 10.0, priceChange24h: 0.5, marketCap: 6_000_000_000, volume24h: 190_000_000, smartMoneyFlow: 3_500_000, walletCount: 7, holderDistribution: { top10: 42, top11to50: 23, top51to100: 13, retail: 22 }, chain: "Ethereum" },
  { id: "pepe", name: "Pepe", symbol: "PEPE", price: 0.000002, priceChange24h: 12.5, marketCap: 840_000_000, volume24h: 1_200_000_000, smartMoneyFlow: 2_100_000, walletCount: 14, holderDistribution: { top10: 55, top11to50: 18, top51to100: 10, retail: 17 }, chain: "Ethereum", trending: true },
  { id: "crv", name: "Curve", symbol: "CRV", price: 0.9, priceChange24h: -2.0, marketCap: 1_100_000_000, volume24h: 95_000_000, smartMoneyFlow: -1_800_000, walletCount: 4, holderDistribution: { top10: 52, top11to50: 20, top51to100: 10, retail: 18 }, chain: "Ethereum" },
  { id: "ldo", name: "Lido", symbol: "LDO", price: 2.8, priceChange24h: -0.8, marketCap: 2_500_000_000, volume24h: 120_000_000, smartMoneyFlow: -3_200_000, walletCount: 3, holderDistribution: { top10: 46, top11to50: 22, top51to100: 12, retail: 20 }, chain: "Ethereum" },
  { id: "rndr", name: "Render", symbol: "RNDR", price: 8.0, priceChange24h: 6.3, marketCap: 3_100_000_000, volume24h: 380_000_000, smartMoneyFlow: 4_500_000, walletCount: 9, holderDistribution: { top10: 44, top11to50: 21, top51to100: 13, retail: 22 }, chain: "Ethereum", trending: true },
  { id: "usdc", name: "USD Coin", symbol: "USDC", price: 1.0, priceChange24h: 0.0, marketCap: 33_000_000_000, volume24h: 8_000_000_000, smartMoneyFlow: 55_000_000, walletCount: 20, holderDistribution: { top10: 30, top11to50: 25, top51to100: 18, retail: 27 }, chain: "Ethereum" },
];

// --- Token Detail ---

export interface CandlestickPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SmartMoneyMarker {
  time: string;
  price: number;
  side: "buy" | "sell";
  entity: string;
}

export function generateCandlestickData(basePrice: number, days: number): CandlestickPoint[] {
  const data: CandlestickPoint[] = [];
  let price = basePrice * 0.85;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const open = price;
    const change = (Math.random() - 0.48) * basePrice * 0.04;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.015;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.015;
    const volume = 500_000_000 + Math.random() * 2_000_000_000;
    data.push({ time: date.toISOString().split("T")[0], open, high, low, close, volume });
    price = close;
  }
  return data;
}

export const ethCandlestick = generateCandlestickData(3600, 90);

export const smartMoneyMarkers: SmartMoneyMarker[] = [
  { time: "2026-05-20", price: 3480, side: "buy", entity: "Jump Trading" },
  { time: "2026-05-18", price: 3520, side: "sell", entity: "Wintermute" },
  { time: "2026-05-15", price: 3350, side: "buy", entity: "Paradigm" },
  { time: "2026-05-12", price: 3600, side: "sell", entity: "GSR Markets" },
  { time: "2026-05-10", price: 3250, side: "buy", entity: "a]16z" },
  { time: "2026-05-05", price: 3400, side: "buy", entity: "Galaxy Digital" },
];

export interface HolderInfo {
  address: string;
  label: string;
  balance: number;
  percent: number;
  type: "Exchange" | "Fund" | "Whale" | "Protocol" | "Retail";
}

export const topHolders: HolderInfo[] = [
  { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", label: "Binance", balance: 1_200_000, percent: 8.2, type: "Exchange" },
  { address: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", label: "Coinbase", balance: 980_000, percent: 6.7, type: "Exchange" },
  { address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", label: "Jump Trading", balance: 420_000, percent: 2.9, type: "Fund" },
  { address: "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2", label: "Paradigm", balance: 350_000, percent: 2.4, type: "Fund" },
  { address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489", label: "Wintermute", balance: 280_000, percent: 1.9, type: "Fund" },
  { address: "0x8103683202aa8DA10536036EDef04CDd865c225E", label: "Lido: stETH", balance: 250_000, percent: 1.7, type: "Protocol" },
  { address: "0x47173B170C64d16393a52e6C480b3Ad8c302ba1e", label: "Galaxy Digital", balance: 220_000, percent: 1.5, type: "Fund" },
  { address: "0x56Eddb7aa87536c09CCc2793473599fD21A8b17F", label: "Whale 0x56Ed", balance: 180_000, percent: 1.2, type: "Whale" },
  { address: "0xA7efAe728D2936e78BDA97dc267687568dD593f3", label: "Cumberland", balance: 150_000, percent: 1.0, type: "Exchange" },
  { address: "0x28C6c06298d514Db089934071355E5743bf21d60", label: "Binance 2", balance: 130_000, percent: 0.9, type: "Exchange" },
];

export interface ExchangeFlow {
  name: string;
  inflow: number;
  outflow: number;
  type: "CEX" | "DEX";
}

export const exchangeFlows: ExchangeFlow[] = [
  { name: "Binance", inflow: 12_500_000, outflow: 8_200_000, type: "CEX" },
  { name: "Coinbase", inflow: 8_000_000, outflow: 5_500_000, type: "CEX" },
  { name: "Uniswap", inflow: 4_200_000, outflow: 6_800_000, type: "DEX" },
  { name: "dYdX", inflow: 3_000_000, outflow: 2_100_000, type: "DEX" },
  { name: "OKX", inflow: 5_500_000, outflow: 4_000_000, type: "CEX" },
  { name: "Curve", inflow: 2_800_000, outflow: 1_900_000, type: "DEX" },
];

export interface LiquidityPool {
  name: string;
  dex: string;
  tvl: number;
  volume24h: number;
  feeApy: number;
  topLp: string;
  topLpShare: number;
}

export const liquidityPools: LiquidityPool[] = [
  { name: "ETH/USDC", dex: "Uniswap V3", tvl: 420_000_000, volume24h: 180_000_000, feeApy: 18.5, topLp: "Jump Trading", topLpShare: 12.3 },
  { name: "ETH/WETH", dex: "Curve", tvl: 350_000_000, volume24h: 95_000_000, feeApy: 8.2, topLp: "Wintermute", topLpShare: 8.7 },
  { name: "SOL/USDC", dex: "Raydium", tvl: 180_000_000, volume24h: 75_000_000, feeApy: 22.1, topLp: "Alameda Legacy", topLpShare: 15.2 },
  { name: "LINK/ETH", dex: "Uniswap V3", tvl: 95_000_000, volume24h: 28_000_000, feeApy: 14.3, topLp: "Cumberland", topLpShare: 9.4 },
  { name: "ARB/USDC", dex: "Camelot", tvl: 65_000_000, volume24h: 22_000_000, feeApy: 25.8, topLp: "Galaxy Digital", topLpShare: 18.1 },
];

// --- Wallet Comparison ---

export interface WalletProfile {
  id: string;
  label: string;
  address: string;
  pnl: number;
  winRate: number;
  activity: number; // trades per week
  diversification: number; // 0-100
  riskScore: number; // 0-100
  totalValue: number;
  chain: string;
}

export const comparisonWallets: WalletProfile[] = [
  { id: "w1", label: "Jump Trading", address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", pnl: 142.5, winRate: 72, activity: 45, diversification: 85, riskScore: 28, totalValue: 42_000_000, chain: "Ethereum" },
  { id: "w2", label: "Wintermute", address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489", pnl: 98.3, winRate: 68, activity: 120, diversification: 90, riskScore: 35, totalValue: 38_000_000, chain: "Ethereum" },
  { id: "w3", label: "Paradigm", address: "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2", pnl: 210.8, winRate: 81, activity: 12, diversification: 60, riskScore: 22, totalValue: 95_000_000, chain: "Ethereum" },
  { id: "w4", label: "DegenSpartan", address: "0xdead...beef", pnl: 340.2, winRate: 45, activity: 200, diversification: 30, riskScore: 88, totalValue: 2_500_000, chain: "Solana" },
];

export interface SharedHolding {
  token: string;
  symbol: string;
  chain: string;
  balances: Record<string, number>; // walletId -> balance
  usdValues: Record<string, number>;
}

export const sharedHoldings: SharedHolding[] = [
  { token: "Ethereum", symbol: "ETH", chain: "Ethereum", balances: { w1: 5000, w2: 3200, w3: 12000, w4: 50 }, usdValues: { w1: 18_000_000, w2: 11_520_000, w3: 43_200_000, w4: 180_000 } },
  { token: "Solana", symbol: "SOL", chain: "Solana", balances: { w1: 80000, w2: 45000, w3: 5000, w4: 1200 }, usdValues: { w1: 14_800_000, w2: 8_325_000, w3: 925_000, w4: 222_000 } },
  { token: "Chainlink", symbol: "LINK", chain: "Ethereum", balances: { w1: 50000, w2: 30000, w3: 100000, w4: 5000 }, usdValues: { w1: 760_000, w2: 456_000, w3: 1_520_000, w4: 76_000 } },
  { token: "Aave", symbol: "AAVE", chain: "Ethereum", balances: { w1: 8000, w2: 5000, w3: 15000, w4: 0 }, usdValues: { w1: 2_400_000, w2: 1_500_000, w3: 4_500_000, w4: 0 } },
];

export interface TimelineOverlap {
  date: string;
  wallets: string[];
  action: string;
  token: string;
  similarity: number; // 0-100
}

export const timelineOverlaps: TimelineOverlap[] = [
  { date: "2026-05-20", wallets: ["w1", "w2", "w3"], action: "Accumulated", token: "ETH", similarity: 92 },
  { date: "2026-05-18", wallets: ["w1", "w2"], action: "Swapped", token: "ARB", similarity: 78 },
  { date: "2026-05-15", wallets: ["w2", "w4"], action: "Accumulated", token: "PEPE", similarity: 65 },
  { date: "2026-05-12", wallets: ["w1", "w3"], action: "Staked", token: "ETH", similarity: 88 },
  { date: "2026-05-10", wallets: ["w1", "w2", "w3", "w4"], action: "Swapped", token: "SOL", similarity: 95 },
];

// --- DeFi Protocols ---

export type DeFiCategory = "Lending" | "DEX" | "Yield" | "Perpetuals" | "Bridge" | "Liquid Staking";

export interface DeFiProtocol {
  id: string;
  name: string;
  chain: string;
  category: DeFiCategory;
  tvl: number;
  tvlChange24h: number;
  volume24h: number;
  uniqueUsers: number;
  smartMoneyInflow: number;
  description: string;
  riskScore: number;
  yieldRate?: number;
}

export const defiProtocols: DeFiProtocol[] = [
  { id: "aave", name: "Aave V3", chain: "Ethereum", category: "Lending", tvl: 12_500_000_000, tvlChange24h: 1.2, volume24h: 850_000_000, uniqueUsers: 45_000, smartMoneyInflow: 18_000_000, description: "Decentralized lending protocol", riskScore: 22, yieldRate: 4.2 },
  { id: "uniswap", name: "Uniswap V3", chain: "Ethereum", category: "DEX", tvl: 6_200_000_000, tvlChange24h: -0.5, volume24h: 2_100_000_000, uniqueUsers: 120_000, smartMoneyInflow: 12_500_000, description: "Automated market maker DEX", riskScore: 15 },
  { id: "lido", name: "Lido", chain: "Ethereum", category: "Liquid Staking", tvl: 28_000_000_000, tvlChange24h: 0.3, volume24h: 0, uniqueUsers: 950_000, smartMoneyInflow: -5_000_000, description: "Liquid staking for Ethereum", riskScore: 18, yieldRate: 3.8 },
  { id: "makerdao", name: "MakerDAO", chain: "Ethereum", category: "Lending", tvl: 8_500_000_000, tvlChange24h: 0.8, volume24h: 320_000_000, uniqueUsers: 28_000, smartMoneyInflow: 8_200_000, description: "Decentralized credit facility", riskScore: 20, yieldRate: 5.1 },
  { id: "gmx", name: "GMX", chain: "Arbitrum", category: "Perpetuals", tvl: 1_200_000_000, tvlChange24h: 2.5, volume24h: 680_000_000, uniqueUsers: 18_000, smartMoneyInflow: 6_500_000, description: "Decentralized perpetual exchange", riskScore: 45, yieldRate: 12.5 },
  { id: "curve", name: "Curve Finance", chain: "Ethereum", category: "DEX", tvl: 3_800_000_000, tvlChange24h: -1.1, volume24h: 420_000_000, uniqueUsers: 35_000, smartMoneyInflow: -2_200_000, description: "Stableswap AMM", riskScore: 25, yieldRate: 8.3 },
  { id: "rocket-pool", name: "Rocket Pool", chain: "Ethereum", category: "Liquid Staking", tvl: 4_500_000_000, tvlChange24h: 0.6, volume24h: 0, uniqueUsers: 32_000, smartMoneyInflow: 3_800_000, description: "Decentralized ETH staking", riskScore: 20, yieldRate: 3.6 },
  { id: "jupiter", name: "Jupiter", chain: "Solana", category: "DEX", tvl: 850_000_000, tvlChange24h: 3.2, volume24h: 1_500_000_000, uniqueUsers: 85_000, smartMoneyInflow: 9_200_000, description: "Solana DEX aggregator", riskScore: 30 },
  { id: "stargate", name: "Stargate", chain: "Ethereum", category: "Bridge", tvl: 680_000_000, tvlChange24h: -0.3, volume24h: 120_000_000, uniqueUsers: 15_000, smartMoneyInflow: 2_100_000, description: "Cross-chain bridge", riskScore: 55 },
  { id: "yearn", name: "Yearn Finance", chain: "Ethereum", category: "Yield", tvl: 420_000_000, tvlChange24h: 1.5, volume24h: 0, uniqueUsers: 8_500, smartMoneyInflow: 1_500_000, description: "Yield aggregation", riskScore: 35, yieldRate: 9.8 },
  { id: "raydium", name: "Raydium", chain: "Solana", category: "DEX", tvl: 520_000_000, tvlChange24h: 1.8, volume24h: 380_000_000, uniqueUsers: 42_000, smartMoneyInflow: 4_500_000, description: "Solana AMM", riskScore: 32, yieldRate: 15.2 },
  { id: "dydx", name: "dYdX", chain: "Ethereum", category: "Perpetuals", tvl: 350_000_000, tvlChange24h: -0.8, volume24h: 950_000_000, uniqueUsers: 22_000, smartMoneyInflow: 5_800_000, description: "Decentralized perpetuals", riskScore: 40, yieldRate: 7.2 },
];

// Protocol TVL history for detail page
export function generateTvlHistory(baseTvl: number, days: number): { date: string; tvl: number }[] {
  const data: { date: string; tvl: number }[] = [];
  let tvl = baseTvl * 0.82;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    tvl += tvl * (Math.random() * 0.02 - 0.008);
    data.push({ date: date.toISOString().split("T")[0], tvl });
  }
  return data;
}

export interface ProtocolDepositor {
  address: string;
  label: string;
  deposited: number;
  percent: number;
}

export const topDepositors: ProtocolDepositor[] = [
  { address: "0x742d...3E18", label: "Jump Trading", deposited: 450_000_000, percent: 3.6 },
  { address: "0xBE0e...bD18", label: "Paradigm", deposited: 380_000_000, percent: 3.0 },
  { address: "0x2FAF...6AD2", label: "Galaxy Digital", deposited: 220_000_000, percent: 1.8 },
  { address: "0x40B3...4889", label: "Wintermute", deposited: 180_000_000, percent: 1.4 },
  { address: "0x47ac...D503", label: "Coinbase", deposited: 150_000_000, percent: 1.2 },
  { address: "0x28C6...d53f", label: "Cumberland", deposited: 120_000_000, percent: 1.0 },
  { address: "0x56Ee...93f3", label: "Whale 0x56Ed", deposited: 95_000_000, percent: 0.8 },
  { address: "0xA7ef...d22e", label: "Polychain", deposited: 85_000_000, percent: 0.7 },
];

export const chains = ["Ethereum", "Arbitrum", "Base", "Optimism", "Solana", "Bitcoin"] as const;
export const actionTypes: ActionType[] = ["Accumulated", "Exited", "Bridged", "Staked", "Unstaked", "Provided Liquidity", "Removed Liquidity", "Swapped"];
export const entityCategories: EntityCategory[] = ["Exchange", "Whale", "Fund", "Protocol", "Degen"];
export const defiCategories: DeFiCategory[] = ["Lending", "DEX", "Yield", "Perpetuals", "Bridge", "Liquid Staking"];
