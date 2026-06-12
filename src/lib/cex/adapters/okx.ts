/**
 * OKX CEX Adapter
 *
 * OKX: Major global exchange with spot + SWAP (linear) futures
 * Public API: no authentication required
 * Rate limit: 20 req/s
 * Liquidations: NOT exposed via public API → return []
 */

import {
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "../types";
import { CexAdapter } from "./base";

const BASE_URL = "https://www.okx.com/api/v5";

/**
 * OKX API Response Format
 * All responses have: { code: "0", data: [...], msg: "" }
 * code "0" = success, anything else = error
 */
interface OkxResponse<T> {
  code: string;
  data: T;
  msg: string;
}

interface OkxTicker {
  instId: string; // "BTC-USDT"
  last: string; // last price
  lastSz: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  volCcy24h: string; // quote volume (USD)
  vol24h: string; // base volume
  ts: string; // timestamp in ms
}

interface OkxInstrument {
  instId: string; // "BTC-USDT"
  baseCcy: string; // "BTC"
  quoteCcy: string; // "USDT"
  instType: "SPOT" | "SWAP" | "FUTURES" | "OPTION";
  ctType?: "linear" | "inverse";
  lever?: string;
  lotSz?: string;
  minSz?: string;
  tickSz?: string;
  state: "live" | "suspend" | "preopen";
}

interface OkxFundingRateResponse {
  instId: string;
  fundingRate: string; // e.g., "0.00015"
  nextFundingRate?: string;
  fundingTime: string; // timestamp in ms
  nextFundingTime?: string;
}

interface OkxOpenInterestResponse {
  instId: string;
  oi: string; // amount in contracts
  oiCcy: string; // USD value
  ts: string; // timestamp in ms
}

export class OkxAdapter extends CexAdapter {
  protected exchangeId = "okx" as const;
  protected baseUrl = BASE_URL;

  /**
   * Get OKX exchange status and metadata
   */
  async getExchangeStatus(): Promise<CexExchange> {
    try {
      // Verify API connectivity by fetching a simple endpoint
      const response = await this.fetch<OkxResponse<OkxInstrument[]>>(
        `${BASE_URL}/public/instruments?instType=SPOT&limit=1`,
        { tokens: 1 }
      );

      if (response.code !== "0") {
        throw new Error(`OKX API error: ${response.msg}`);
      }

      return {
        id: "okx",
        name: "OKX",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0002,
        takerFee: 0.0003,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "operational",
        lastUpdate: Date.now(),
        supports: { fundingRates: true, openInterest: true, liquidations: false },
      };
    } catch (error) {
      console.error("[OKX] Failed to get exchange status:", error);
      return {
        id: "okx",
        name: "OKX",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0002,
        takerFee: 0.0003,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "degraded",
        lastUpdate: Date.now(),
        supports: { fundingRates: true, openInterest: true, liquidations: false },
      };
    }
  }

  /**
   * Get all trading pairs (spot + linear futures) or specific pair data
   */
  async getPairs(symbol?: string): Promise<CexPair[]> {
    const cacheKey = symbol ? `okx:pairs:${symbol}` : "okx:pairs:all";
    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    try {
      const [spotPairs, swapPairs] = await Promise.all([
        this.getSpotPairs(symbol),
        this.getSwapPairs(symbol),
      ]);

      const pairs = [...spotPairs, ...swapPairs];
      this.cache.set(cacheKey, pairs, 60); // 60s cache

      return pairs;
    } catch (error) {
      console.error("[OKX] Failed to get pairs:", error);
      return [];
    }
  }

  /**
   * Get current and historical funding rates for a symbol
   */
  async getFundingRates(symbol: string): Promise<CexFundingRate[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `okx:funding:${normalized}`;
    const cached = this.cache.get<CexFundingRate[]>(cacheKey);
    if (cached) return cached;

    try {
      const okxSymbol = this.toSwapInstId(normalized);

      const response = await this.fetch<OkxResponse<OkxFundingRateResponse[]>>(
        `${BASE_URL}/public/funding-rate?instId=${okxSymbol}`,
        { tokens: 1 }
      );

      if (response.code !== "0" || response.data.length === 0) {
        return [];
      }

      const fundingData = response.data[0];
      const fundingRate = parseFloat(fundingData.fundingRate);

      const rates: CexFundingRate[] = [
        {
          id: this.generateId(normalized, fundingData.fundingTime),
          exchange: "okx",
          symbol: normalized,
          fundingRate,
          fundingTimestamp: parseInt(fundingData.fundingTime),
          nextFundingTime: fundingData.nextFundingTime
            ? parseInt(fundingData.nextFundingTime)
            : undefined,
          timestamp: Date.now(),
          isPositive: fundingRate > 0,
          magnitude: this.estimateFundingMagnitude(fundingRate),
        },
      ];

      this.cache.set(cacheKey, rates, 30); // 30s cache (volatile)
      return rates;
    } catch (error) {
      console.error(`[OKX] Failed to get funding rates for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get current open interest for a symbol
   */
  async getOpenInterest(symbol: string): Promise<CexOpenInterest[]> {
    const normalized = this.resolveFuturesSymbol(symbol);
    const cacheKey = `okx:oi:${normalized}`;
    const cached = this.cache.get<CexOpenInterest[]>(cacheKey);
    if (cached) return cached;

    try {
      const okxSymbol = this.toSwapInstId(normalized);

      const response = await this.fetch<OkxResponse<OkxOpenInterestResponse[]>>(
        `${BASE_URL}/public/open-interest?instId=${okxSymbol}`,
        { tokens: 1 }
      );

      if (response.code !== "0" || response.data.length === 0) {
        return [];
      }

      const oiData = response.data[0];
      const openInterestUsd = parseFloat(oiData.oiCcy);
      const openInterestAmount = parseFloat(oiData.oi);

      const oi: CexOpenInterest[] = [
        {
          id: this.generateId(normalized, oiData.ts),
          exchange: "okx",
          symbol: normalized,
          openInterestUsd,
          openInterestAmount,
          timestamp: parseInt(oiData.ts),
          change24h: 0, // Would need historical data
          change24hPercent: 0,
          changeRecordedAt: parseInt(oiData.ts),
          isSpike: false,
          spikeRatio: 1,
        },
      ];

      this.cache.set(cacheKey, oi, 120); // 120s cache
      return oi;
    } catch (error) {
      console.error(`[OKX] Failed to get open interest for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get recent liquidations
   *
   * OKX does NOT expose liquidation data via public API.
   * Only bybit, hyperliquid, and some others expose liquidations.
   * Return empty array for OKX.
   */
  async getLiquidations(_hours: number): Promise<CexLiquidation[]> {
    void _hours;
    return [];
  }

  // ─── Private Methods ───────────────────────────────

  /**
   * Convert internal format (BTCUSDT) to OKX format (BTC-USDT)
   * Used for API requests to OKX
   */
  private denormalizeSymbol(normalized: string): string {
    const { base, quote } = this.extractPairParts(normalized);
    return `${base}-${quote}`;
  }

  /**
   * Convert internal futures symbol to OKX swap instrument ID.
   * BTCUSDT → BTC-USDT-SWAP
   */
  private toSwapInstId(normalized: string): string {
    const { base, quote } = this.extractPairParts(normalized);
    return `${base}-${quote}-SWAP`;
  }

  /**
   * Fetch spot trading pairs — uses batch tickers endpoint to avoid N+1 API calls
   */
  private async getSpotPairs(symbol?: string): Promise<CexPair[]> {
    try {
      // Use batch tickers endpoint — single call instead of per-instrument
      const response = await this.fetch<
        OkxResponse<OkxTicker[]>
      >(`${BASE_URL}/market/tickers?instType=SPOT`, { tokens: 1 });

      if (response.code !== "0" || !response.data?.length) {
        return [];
      }

      let tickers = response.data;

      // Filter by specific symbol if provided
      if (symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const okxSymbol = this.denormalizeSymbol(normalized);
        tickers = tickers.filter((t) => t.instId === okxSymbol);
      }

      return tickers.map((t) => this.normalizeTicker(t, "spot"));
    } catch (error) {
      console.error("[OKX] Failed to get spot pairs:", error);
      return [];
    }
  }

  /**
   * Fetch SWAP (linear futures) trading pairs — uses batch tickers endpoint
   */
  private async getSwapPairs(symbol?: string): Promise<CexPair[]> {
    try {
      // Use batch tickers endpoint — single call instead of per-instrument
      const response = await this.fetch<
        OkxResponse<OkxTicker[]>
      >(`${BASE_URL}/market/tickers?instType=SWAP`, { tokens: 1 });

      if (response.code !== "0" || !response.data?.length) {
        return [];
      }

      let tickers = response.data;

      // Filter by specific symbol if provided
      if (symbol) {
        const okxSymbol = this.toSwapInstId(this.resolveFuturesSymbol(symbol));
        tickers = tickers.filter((t) => t.instId === okxSymbol);
      }

      return tickers.map((t) => this.normalizeTicker(t, "linear"));
    } catch (error) {
      console.error("[OKX] Failed to get swap pairs:", error);
      return [];
    }
  }

  /**
   * Normalize OKX ticker data into unified CexPair format
   */
  private normalizeTicker(ticker: OkxTicker, pairType: "spot" | "linear"): CexPair {
    const { base, quote } = this.extractPairParts(ticker.instId);
    const lastPrice = parseFloat(ticker.last);
    const bidPrice = parseFloat(ticker.bidPx || ticker.last);
    const askPrice = parseFloat(ticker.askPx || ticker.last);
    const volumeUsd24h = parseFloat(ticker.volCcy24h);
    const volumeBase24h = parseFloat(ticker.vol24h);

    return {
      id: this.generateId(this.normalizeSymbol(ticker.instId)),
      exchange: "okx",
      baseSymbol: base,
      quoteSymbol: quote,
      symbol: this.normalizeSymbol(ticker.instId),
      pairType,

      // Prices
      priceUsd: lastPrice,
      priceChange24hPercent: 0, // OKX API requires separate calculation
      priceHigh24h: parseFloat(ticker.high24h),
      priceLow24h: parseFloat(ticker.low24h),
      priceOpen24h: parseFloat(ticker.open24h),

      // Volume & Liquidity
      volumeUsd24h,
      volumeBase24h,
      bidAskSpreadBps: this.calculateSpreadBps(bidPrice, askPrice),
      midPrice: (bidPrice + askPrice) / 2,

      // Exchange-specific
      isActive: true,
      minOrderSize: 0.0001, // OKX minimum
      maxOrderSize: 10000000,

      // Metadata
      lastUpdate: Date.now(),
      confidence: 0.95,
    };
  }

  /**
   * Calculate spread between bid and ask in basis points
   */
  private calculateSpreadBps(bid: number, ask: number): number {
    if (bid <= 0 || ask <= 0) return 0;
    const spread = ask - bid;
    const mid = (bid + ask) / 2;
    return (spread / mid) * 10000; // convert to basis points
  }
}
