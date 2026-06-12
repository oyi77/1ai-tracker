/**
 * NEXUS CEX Data Types
 * 
 * Unified type definitions for all exchange data sources.
 * All exchanges normalize to these types for consistent handling.
 */

export type CexExchangeId = "binance" | "bybit" | "okx" | "hyperliquid" | "kraken";
export type PairType = "spot" | "linear" | "inverse";
export type LiquidationSide = "long" | "short";
export type FundingMagnitude = "extreme" | "high" | "normal" | "low";

/**
 * Exchange metadata and status
 */
export interface CexExchange {
  id: CexExchangeId;
  name: string;
  timezone: string;
  serverTime: number;
  makerFee: number; // 0.001 = 0.1%
  takerFee: number;
  spotVolumeUsd24h: number;
  futuresVolumeUsd24h: number;
  status: "operational" | "degraded" | "offline";
  lastUpdate: number; // timestamp ms
  /** Which data features this exchange supports */
  supports: {
    fundingRates: boolean;
    openInterest: boolean;
    liquidations: boolean;
  };
}

/**
 * Trading pair across all exchanges
 * Unified schema for spot, linear, and inverse perpetuals
 */
export interface CexPair {
  // Identification
  id: string; // "binance_BTCUSDT"
  exchange: CexExchangeId;
  baseSymbol: string; // "BTC"
  quoteSymbol: string; // "USDT"
  symbol: string; // "BTCUSDT" (exchange-native)
  pairType: PairType;

  // Prices
  priceUsd: number;
  priceChange24hPercent: number;
  priceChange1hPercent?: number;
  priceHigh24h: number;
  priceLow24h: number;
  priceOpen24h: number;

  // Volume & Liquidity
  volumeUsd24h: number;
  volumeBase24h: number;
  bidAskSpreadBps: number; // basis points
  midPrice: number; // (bid + ask) / 2

  // Futures-only metrics
  fundingRateLatest?: number;
  fundingRateNext?: { rate: number; timestamp: number };
  openInterestUsd?: number;
  openInterestAmount?: number;
  longPositionRatio?: number;
  shortPositionRatio?: number;
  liquidationPriceHigh?: number;
  liquidationPriceLow?: number;

  // Exchange-specific
  isActive: boolean;
  minOrderSize: number;
  maxOrderSize: number;

  // Metadata
  lastUpdate: number;
  confidence: number; // 0.0-1.0
}

/**
 * Current and historical funding rates
 * Key signal for whale positioning
 */
export interface CexFundingRate {
  id: string; // "binance_BTCUSDT_1234567890"
  exchange: CexExchangeId;
  symbol: string;
  fundingRate: number; // 0.00015 = 0.015% per 8h
  fundingTimestamp: number;
  nextFundingTime?: number;
  timestamp: number;
  
  // Derived signals
  isPositive: boolean;
  magnitude: FundingMagnitude;
  trend?: "increasing" | "decreasing" | "stable";
}

/**
 * Open Interest tracking
 * Indicates capital flowing in/out of futures
 */
export interface CexOpenInterest {
  id: string; // "bybit_BTCUSDT_1234567890"
  exchange: CexExchangeId;
  symbol: string;
  openInterestUsd: number;
  openInterestAmount: number;
  timestamp: number;
  
  // Change metrics
  change24h: number;
  change24hPercent: number;
  changeRecordedAt: number;
  
  // Whale signals
  isSpike: boolean;
  spikeRatio: number;
}

/**
 * Liquidations - Top whale activity signal
 * When margin traders get liquidated, it reveals positioning
 */
export interface CexLiquidation {
  id: string;
  exchange: "bybit" | "okx" | "hyperliquid"; // Only these expose it
  symbol: string;
  side: LiquidationSide;
  quantity: number; // in base units
  liquidationPrice: number;
  orderPrice?: number;
  estimatedValueUsd: number;
  timestamp: number;
  
  // Whale signal
  isWhaleLiquidation: boolean; // > $1M or > 10 BTC
  whaleTier?: "tier1" | "tier2" | "tier3";
  cascadeRisk?: number; // 0.0-1.0
}

/**
 * Exchange-level aggregate metrics
 */
export interface CexFlowMetrics {
  exchange: CexExchangeId;
  timestamp: number;
  
  // 24h aggregates
  totalVolume24hUsd: number;
  totalLiquidations24hUsd: number;
  totalLiquidationCount24h: number;
  longLiquidations24hPercent: number;
  
  // Funding pressure
  avgFundingRate8h: number;
  fundingWeightedByOi: number;
  
  // Liquidity snapshot
  bidAskSpreadMedianBps: number;
  orderBookDepth1pct: number; // USD at top 1%
  
  // Health
  isHealthy: boolean;
  statusMessage?: string;
}

/**
 * Composite market state across all exchanges
 */
export interface CexMarketState {
  timestamp: number;
  exchanges: CexExchange[];
  pairs: CexPair[];
  fundingRates: CexFundingRate[];
  openInterest: CexOpenInterest[];
  liquidations: CexLiquidation[];
  flowMetrics: CexFlowMetrics[];
  
  // Composite signals
  globalFundingAvg: number;
  globalOiUsd: number;
  totalLiquidations24hUsd: number;
  whaleActivityScore: number; // 0-100
}

/**
 * Whale liquidation tier definitions
 */
export const WHALE_TIERS = {
  tier1: { minUsd: 10000000, minBtc: 100 }, // $10M+
  tier2: { minUsd: 1000000, minBtc: 10 }, // $1M+
  tier3: { minUsd: 100000, minBtc: 1 }, // $100K+
} as const;

/**
 * Error types for CEX operations
 */
export class CexError extends Error {
  constructor(
    public exchange: CexExchangeId,
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(`[${exchange}] ${code}: ${message}`);
    this.name = "CexError";
  }
}

export class RateLimitError extends CexError {
  constructor(exchange: CexExchangeId, public retryAfterMs: number) {
    super(exchange, "RATE_LIMIT", `Rate limited, retry after ${retryAfterMs}ms`);
    this.name = "RateLimitError";
  }
}

export class ExchangeOfflineError extends CexError {
  constructor(exchange: CexExchangeId) {
    super(exchange, "OFFLINE", "Exchange is offline or unreachable");
    this.name = "ExchangeOfflineError";
  }
}

export class DataValidationError extends CexError {
  constructor(exchange: CexExchangeId, field: string, actual: unknown) {
    super(
      exchange,
      "VALIDATION",
      `Invalid data in field "${field}": ${JSON.stringify(actual)}`
    );
    this.name = "DataValidationError";
  }
}
