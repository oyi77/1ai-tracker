/**
 * Binance CEX Adapter
 * 
 * Binance: Largest CEX, has spot + USDM futures + inverse perpetuals
 * No public liquidation API (skip for now)
 * Free tier: 1200 requests/min
 */

import {
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "../types";
import { CexAdapter } from "./base";

const REST_BASE = "https://api.binance.com";
const FAPI_BASE = "https://fapi.binance.com"; // Futures USDM


interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteAssetVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

interface BinanceOpenInterest {
  symbol: string;
  openInterest: string;
  time: number;
}

interface BinanceExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: Array<{
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    status: string;
    baseAssetPrecision: number;
    quotePrecision: number;
    orderTypes: string[];
    icebergAllowed: boolean;
    filters: Array<{
      filterType: string;
      [key: string]: unknown;
    }>;
  }>;
}

export class BinanceAdapter extends CexAdapter {
  protected exchangeId = "binance" as const;
  protected baseUrl = REST_BASE;

  async getExchangeStatus(): Promise<CexExchange> {
    const info = await this.fetch<BinanceExchangeInfo>(`${REST_BASE}/api/v3/exchangeInfo`);

    return {
      id: "binance",
      name: "Binance",
      timezone: info.timezone,
      serverTime: info.serverTime,
      makerFee: 0.001,
      takerFee: 0.001,
      spotVolumeUsd24h: 0,
      futuresVolumeUsd24h: 0,
      status: "operational",
      lastUpdate: Date.now(),
      supports: { fundingRates: true, openInterest: true, liquidations: false },
    };
  }

  async getPairs(symbol?: string): Promise<CexPair[]> {
    const cacheKey = symbol ? `binance:pairs:${symbol}` : "binance:pairs:all";
    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    const [spotTickers, futuresTickers] = await Promise.all([
      this.getSpotTickers(symbol),
      this.getFuturesTickers(symbol),
    ]);

    const pairs = [...spotTickers, ...futuresTickers];
    this.cache.set(cacheKey, pairs, 60); // 60s cache

    return pairs;
  }

  async getFundingRates(symbol: string): Promise<CexFundingRate[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `binance:funding:${normalized}`;
    const cached = this.cache.get<CexFundingRate[]>(cacheKey);
    if (cached) return cached;

    // Binance returns an array; use the most recent entry
    const items = await this.fetch<BinanceFundingRate[]>(
      `${FAPI_BASE}/fapi/v1/fundingRate?symbol=${normalized}&limit=1`,
      { tokens: 1 }
    );

    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const entry = items[0];
    const fundingRate = parseFloat(entry.fundingRate);

    const rates: CexFundingRate[] = [
      {
        id: this.generateId(normalized, entry.fundingTime),
        exchange: "binance",
        symbol: normalized,
        fundingRate,
        fundingTimestamp: entry.fundingTime,
        nextFundingTime: entry.fundingTime + 28800000, // +8 hours
        timestamp: Date.now(),
        isPositive: fundingRate > 0,
        magnitude: this.estimateFundingMagnitude(fundingRate),
      },
    ];

    this.cache.set(cacheKey, rates, 30); // 30s cache (volatile)
    return rates;
  }

  async getOpenInterest(symbol: string): Promise<CexOpenInterest[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `binance:oi:${normalized}`;
    const cached = this.cache.get<CexOpenInterest[]>(cacheKey);
    if (cached) return cached;

    const response = await this.fetch<BinanceOpenInterest>(
      `${FAPI_BASE}/fapi/v1/openInterest?symbol=${normalized}`,
      { tokens: 1 }
    );

    const oi: CexOpenInterest[] = [
      {
        id: this.generateId(normalized, response.time),
        exchange: "binance",
        symbol: normalized,
        openInterestUsd: parseFloat(response.openInterest), // Already in USD equivalent
        openInterestAmount: parseFloat(response.openInterest),
        timestamp: response.time,
        change24h: 0, // Would need historical data
        change24hPercent: 0,
        changeRecordedAt: response.time,
        isSpike: false,
        spikeRatio: 1,
      },
    ];

    this.cache.set(cacheKey, oi, 120); // 120s cache
    return oi;
  }

  async getLiquidations(_hours: number): Promise<CexLiquidation[]> {
    void _hours;
    return [];
  }

  // ─── Private Methods ───────────────────────────────

  private async getSpotTickers(symbol?: string): Promise<CexPair[]> {
    const url = symbol
      ? `${REST_BASE}/api/v3/ticker/24hr?symbol=${this.normalizeSymbol(symbol)}`
      : `${REST_BASE}/api/v3/ticker/24hr`;

    const data = symbol
      ? await this.fetch<BinanceTicker>(url, { tokens: 40 })
      : await this.fetch<BinanceTicker[]>(url, { tokens: 40 });

    const tickers = symbol ? [data as BinanceTicker] : (data as BinanceTicker[]);

    return tickers
      .filter((t) => t.symbol && t.lastPrice)
      .map((ticker) => this.normalizeTicker(ticker, "spot"));
  }

  private async getFuturesTickers(symbol?: string): Promise<CexPair[]> {
    const url = symbol
      ? `${FAPI_BASE}/fapi/v1/ticker/24hr?symbol=${this.normalizeSymbol(symbol)}`
      : `${FAPI_BASE}/fapi/v1/ticker/24hr`;

    const data = symbol
      ? await this.fetch<BinanceTicker>(url, { tokens: 40 })
      : await this.fetch<BinanceTicker[]>(url, { tokens: 40 });

    const tickers = symbol ? [data as BinanceTicker] : (data as BinanceTicker[]);

    return tickers
      .filter((t) => t.symbol && t.lastPrice)
      .map((ticker) => this.normalizeTicker(ticker, "linear"));
  }

  private normalizeTicker(ticker: BinanceTicker, pairType: "spot" | "linear"): CexPair {
    const { base, quote } = this.extractPairParts(ticker.symbol);
    const lastPrice = parseFloat(ticker.lastPrice);
    const bidPrice = parseFloat(ticker.bidPrice || ticker.lastPrice);
    const askPrice = parseFloat(ticker.askPrice || ticker.lastPrice);

    return {
      id: this.generateId(ticker.symbol),
      exchange: "binance",
      baseSymbol: base,
      quoteSymbol: quote,
      symbol: ticker.symbol,
      pairType,

      // Prices
      priceUsd: lastPrice,
      priceChange24hPercent: parseFloat(ticker.priceChangePercent),
      priceHigh24h: parseFloat(ticker.highPrice),
      priceLow24h: parseFloat(ticker.lowPrice),
      priceOpen24h: parseFloat(ticker.openPrice),

      // Volume & Liquidity
      volumeUsd24h: parseFloat(ticker.quoteAssetVolume),
      volumeBase24h: parseFloat(ticker.volume),
      bidAskSpreadBps: this.calculateSpreadBps(bidPrice, askPrice),
      midPrice: (bidPrice + askPrice) / 2,

      // Exchange-specific
      isActive: true,
      minOrderSize: 0.0001, // Binance min
      maxOrderSize: 10000000,

      // Metadata
      lastUpdate: Date.now(),
      confidence: 0.95,
    };
  }

  private calculateSpreadBps(bid: number, ask: number): number {
    if (bid <= 0 || ask <= 0) return 0;
    const spread = ask - bid;
    const mid = (bid + ask) / 2;
    return (spread / mid) * 10000; // basis points
  }
}
