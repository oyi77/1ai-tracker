/**
 * Bybit CEX Adapter
 *
 * Bybit: Major derivatives exchange with USDM perpetuals, inverse contracts, and spot
 * V5 Public API (no auth required for market data)
 * Rate limit: 10 req/s per IP for public endpoints
 */

import {
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "../types";
import { CexAdapter } from "./base";

const BASE_URL = "https://api.bybit.com";

/**
 * Bybit V5 API Responses
 * All endpoints follow pattern: { retCode: 0, result: {...}, retMsg: "OK" }
 */

interface BybitTickerItem {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
  turnover24h: string;
  bid1Price: string;
  ask1Price: string;
  bid1Size: string;
  ask1Size: string;
}

interface BybitTickerResponse {
  retCode: number;
  result: {
    list: BybitTickerItem[];
  };
  retMsg: string;
}

interface BybitFundingRateItem {
  symbol: string;
  fundingRate: string;
  fundingRateTimestamp: string;
}

interface BybitFundingRateResponse {
  retCode: number;
  result: {
    list: BybitFundingRateItem[];
  };
  retMsg: string;
}

interface BybitOpenInterestItem {
  symbol: string;
  openInterest: string;
  timestamp: string;
}

interface BybitOpenInterestResponse {
  retCode: number;
  result: {
    list: BybitOpenInterestItem[];
  };
  retMsg: string;
}

interface BybitInstrumentItem {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
}

interface BybitInstrumentResponse {
  retCode: number;
  result: {
    list: BybitInstrumentItem[];
    nextPageCursor: string;
  };
  retMsg: string;
}

export class BybitAdapter extends CexAdapter {
  protected exchangeId = "bybit" as const;
  protected baseUrl = BASE_URL;

  /**
   * Get exchange metadata and operational status
   */
  async getExchangeStatus(): Promise<CexExchange> {
    try {
      // Verify API connectivity with a lightweight call
      const response = await this.fetch<BybitInstrumentResponse>(
        `${BASE_URL}/v5/market/instruments-info?category=linear&limit=1`,
        { tokens: 1 }
      );

      if (response.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.retMsg}`);
      }

      return {
        id: "bybit",
        name: "Bybit",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0001,
        takerFee: 0.0002,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "operational",
        lastUpdate: Date.now(),
        // liquidations data not exposed via public REST API
        supports: { fundingRates: true, openInterest: true, liquidations: false },
      };
    } catch (error) {
      console.error("[bybit] getExchangeStatus failed:", error);
      throw error;
    }
  }

  /**
   * Get all trading pairs (spot and linear futures)
   */
  async getPairs(symbol?: string): Promise<CexPair[]> {
    const cacheKey = symbol ? `bybit:pairs:${symbol}` : "bybit:pairs:all";
    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    try {
      const [spotTickers, linearTickers] = await Promise.all([
        this.getSpotTickers(symbol),
        this.getLinearTickers(symbol),
      ]);

      const pairs = [...spotTickers, ...linearTickers];
      this.cache.set(cacheKey, pairs, 60); // 60s cache

      return pairs;
    } catch (error) {
      console.error("[bybit] getPairs failed:", error);
      return [];
    }
  }

  /**
   * Get current funding rate for a symbol
   */
  async getFundingRates(symbol: string): Promise<CexFundingRate[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `bybit:funding:${normalized}`;
    const cached = this.cache.get<CexFundingRate[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetch<BybitFundingRateResponse>(
        `${BASE_URL}/v5/market/funding/history?category=linear&symbol=${normalized}&limit=1`,
        { tokens: 1 }
      );

      if (response.retCode !== 0 || !response.result.list.length) {
        console.warn(`[bybit] No funding rate for ${normalized}`);
        return [];
      }

      const item = response.result.list[0];
      const fundingRate = parseFloat(item.fundingRate);
      const fundingTimestamp = parseInt(item.fundingRateTimestamp);

      const rates: CexFundingRate[] = [
        {
          id: this.generateId(normalized, fundingTimestamp),
          exchange: "bybit",
          symbol: normalized,
          fundingRate,
          fundingTimestamp,
          nextFundingTime: fundingTimestamp + 28800000, // +8 hours (Bybit cycle)
          timestamp: Date.now(),
          isPositive: fundingRate > 0,
          magnitude: this.estimateFundingMagnitude(fundingRate),
        },
      ];

      this.cache.set(cacheKey, rates, 30); // 30s cache (volatile)
      return rates;
    } catch (error) {
      console.error(`[bybit] getFundingRates failed for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get current open interest for a symbol
   */
  async getOpenInterest(symbol: string): Promise<CexOpenInterest[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `bybit:oi:${normalized}`;
    const cached = this.cache.get<CexOpenInterest[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetch<BybitOpenInterestResponse>(
        `${BASE_URL}/v5/market/open-interest?category=linear&symbol=${normalized}&intervalTime=5min&limit=1`,
        { tokens: 1 }
      );

      if (response.retCode !== 0 || !response.result.list.length) {
        console.warn(`[bybit] No open interest for ${normalized}`);
        return [];
      }

      const item = response.result.list[0];
      const openInterestUsd = parseFloat(item.openInterest);
      const timestamp = parseInt(item.timestamp);

      const oi: CexOpenInterest[] = [
        {
          id: this.generateId(normalized, timestamp),
          exchange: "bybit",
          symbol: normalized,
          openInterestUsd,
          openInterestAmount: openInterestUsd, // Bybit OI is in USD
          timestamp,
          change24h: 0, // Would require historical data
          change24hPercent: 0,
          changeRecordedAt: timestamp,
          isSpike: false,
          spikeRatio: 1,
        },
      ];

      this.cache.set(cacheKey, oi, 120); // 120s cache
      return oi;
    } catch (error) {
      console.error(`[bybit] getOpenInterest failed for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get recent liquidations
   * Note: Bybit does not expose liquidation data via public REST API
   * Would require WebSocket connection or premium API access
   */
  async getLiquidations(_hours: number): Promise<CexLiquidation[]> {
    void _hours;
    return [];
  }

  // ─── Private Methods ───────────────────────────────

  /**
   * Fetch spot market tickers
   */
  private async getSpotTickers(symbol?: string): Promise<CexPair[]> {
    try {
      const url = symbol
        ? `${BASE_URL}/v5/market/tickers?category=spot&symbol=${this.normalizeSymbol(symbol)}`
        : `${BASE_URL}/v5/market/tickers?category=spot`;

      const response = await this.fetch<BybitTickerResponse>(url, { tokens: 40 });

      if (response.retCode !== 0) {
        console.warn(`[bybit] Spot tickers API error: ${response.retMsg}`);
        return [];
      }

      return response.result.list
        .filter((item) => item.symbol && item.lastPrice)
        .map((item) => this.normalizeTicker(item, "spot"));
    } catch (error) {
      console.error("[bybit] getSpotTickers failed:", error);
      return [];
    }
  }

  /**
   * Fetch linear (USDM) futures tickers
   */
  private async getLinearTickers(symbol?: string): Promise<CexPair[]> {
    try {
      const url = symbol
        ? `${BASE_URL}/v5/market/tickers?category=linear&symbol=${this.normalizeSymbol(symbol)}`
        : `${BASE_URL}/v5/market/tickers?category=linear`;

      const response = await this.fetch<BybitTickerResponse>(url, { tokens: 40 });

      if (response.retCode !== 0) {
        console.warn(`[bybit] Linear tickers API error: ${response.retMsg}`);
        return [];
      }

      return response.result.list
        .filter((item) => item.symbol && item.lastPrice)
        .map((item) => this.normalizeTicker(item, "linear"));
    } catch (error) {
      console.error("[bybit] getLinearTickers failed:", error);
      return [];
    }
  }

  /**
   * Normalize Bybit ticker response to unified CexPair format
   */
  private normalizeTicker(
    ticker: BybitTickerItem,
    pairType: "spot" | "linear"
  ): CexPair {
    const { base, quote } = this.extractPairParts(ticker.symbol);
    const lastPrice = parseFloat(ticker.lastPrice);
    const bidPrice = parseFloat(ticker.bid1Price || ticker.lastPrice);
    const askPrice = parseFloat(ticker.ask1Price || ticker.lastPrice);
    const priceChangePercent = parseFloat(ticker.price24hPcnt) * 100; // Bybit returns as decimal (0.05 = 5%)

    return {
      id: this.generateId(ticker.symbol),
      exchange: "bybit",
      baseSymbol: base,
      quoteSymbol: quote,
      symbol: ticker.symbol,
      pairType,

      // Prices
      priceUsd: lastPrice,
      priceChange24hPercent: priceChangePercent,
      priceHigh24h: parseFloat(ticker.highPrice24h),
      priceLow24h: parseFloat(ticker.lowPrice24h),
      priceOpen24h: lastPrice - (lastPrice * priceChangePercent) / 100, // Reverse calculate from change%

      // Volume & Liquidity
      volumeUsd24h: parseFloat(ticker.turnover24h),
      volumeBase24h: parseFloat(ticker.volume24h),
      bidAskSpreadBps: this.calculateSpreadBps(bidPrice, askPrice),
      midPrice: (bidPrice + askPrice) / 2,

      // Exchange-specific
      isActive: true,
      minOrderSize: 0.0001,
      maxOrderSize: 10000000,

      // Metadata
      lastUpdate: Date.now(),
      confidence: 0.95,
    };
  }

  /**
   * Calculate bid-ask spread in basis points
   */
  private calculateSpreadBps(bid: number, ask: number): number {
    if (bid <= 0 || ask <= 0) return 0;
    const spread = ask - bid;
    const mid = (bid + ask) / 2;
    return (spread / mid) * 10000; // basis points
  }
}
