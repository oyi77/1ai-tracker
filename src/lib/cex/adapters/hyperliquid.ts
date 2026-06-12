/**
 * Hyperliquid CEX Adapter
 *
 * Hyperliquid: Pure perpetuals-only exchange, smallest tick sizes, tight spreads
 * No public liquidation API (returns empty array)
 * Rate limit: Undocumented but conservative 20 req/s assumed
 * All requests use POST to /info endpoint
 */

import {
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "../types";
import { CexAdapter } from "./base";

const API_BASE = "https://api.hyperliquid.xyz";

/**
 * Hyperliquid asset context from metaAndAssetCtxs
 * Contains market data for a single instrument
 */
interface HyperliquidAssetCtx {
  markPx: string;
  midPx: string;
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium?: string;
  oraclePx?: string;
}

/**
 * Hyperliquid meta from metaAndAssetCtxs
 * Contains universe of available instruments
 */
interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    wlvl?: number;
    maxLeverage?: string;
  }>;
}

/**
 * Hyperliquid metaAndAssetCtxs response
 * [0] = meta object with universe array
 * [1] = array of asset contexts parallel to universe
 */
type HyperliquidMetaAndAssetCtxsResponse = [
  meta: HyperliquidMeta,
  assetCtxs: HyperliquidAssetCtx[]
];

export class HyperliquidAdapter extends CexAdapter {
  protected exchangeId = "hyperliquid" as const;
  protected baseUrl = API_BASE;

  /**
   * Check if exchange is operational via allMids endpoint
   */
  async getExchangeStatus(): Promise<CexExchange> {
    try {
      const mids = await this.hlFetch<Record<string, string>>({
        type: "allMids",
      });

      const isOperational = mids && Object.keys(mids).length > 0;

      return {
        id: "hyperliquid",
        name: "Hyperliquid",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0002,
        takerFee: 0.0005,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: isOperational ? "operational" : "degraded",
        lastUpdate: Date.now(),
        supports: { fundingRates: true, openInterest: true, liquidations: false },
      };
    } catch (error) {
      console.error("[Hyperliquid] Failed to get exchange status:", error);
      return {
        id: "hyperliquid",
        name: "Hyperliquid",
        timezone: "UTC",
        serverTime: Date.now(),
        makerFee: 0.0002,
        takerFee: 0.0005,
        spotVolumeUsd24h: 0,
        futuresVolumeUsd24h: 0,
        status: "offline",
        lastUpdate: Date.now(),
        supports: { fundingRates: true, openInterest: true, liquidations: false },
      };
    }
  }

  /**
   * Get all trading pairs with current prices, funding, and OI
   * Single efficient call to metaAndAssetCtxs
   */
  async getPairs(symbol?: string): Promise<CexPair[]> {
    const cacheKey = symbol
      ? `hyperliquid:pairs:${this.normalizeSymbol(symbol)}`
      : "hyperliquid:pairs:all";

    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    try {
      const [meta, assetCtxs] =
        await this.hlFetch<HyperliquidMetaAndAssetCtxsResponse>({
          type: "metaAndAssetCtxs",
        });

      if (!meta || !meta.universe || !assetCtxs || assetCtxs.length === 0) {
        return [];
      }

      const pairs: CexPair[] = [];

      for (let i = 0; i < Math.min(meta.universe.length, assetCtxs.length); i++) {
        const instrument = meta.universe[i];
        const ctx = assetCtxs[i];

        if (!instrument || !ctx) continue;

        const coinName = instrument.name;

        if (symbol) {
          const normalizedSymbol = this.normalizeSymbol(symbol);
          if (!normalizedSymbol.startsWith(coinName)) {
            continue;
          }
        }

        const markPrice = parseFloat(ctx.markPx);
        const prevPrice = parseFloat(ctx.prevDayPx);
        const midPrice = parseFloat(ctx.midPx);

        const priceChange24hPercent =
          prevPrice > 0 ? ((markPrice - prevPrice) / prevPrice) * 100 : 0;

        const pair: CexPair = {
          id: this.generateId(coinName),
          exchange: "hyperliquid",
          baseSymbol: coinName,
          quoteSymbol: "USD",
          symbol: `${coinName}USDT`,
          pairType: "linear",
          priceUsd: markPrice,
          priceChange24hPercent,
          priceHigh24h: markPrice,
          priceLow24h: prevPrice,
          priceOpen24h: prevPrice,
          volumeUsd24h: parseFloat(ctx.dayNtlVlm),
          volumeBase24h: parseFloat(ctx.dayNtlVlm) / markPrice,
          bidAskSpreadBps: 0,
          midPrice,
          fundingRateLatest: parseFloat(ctx.funding),
          openInterestUsd: parseFloat(ctx.openInterest),
          openInterestAmount: parseFloat(ctx.openInterest) / markPrice,
          isActive: true,
          minOrderSize: 0,
          maxOrderSize: 0,
          lastUpdate: Date.now(),
          confidence: 0.9,
        };

        pairs.push(pair);
      }

      this.cache.set(cacheKey, pairs, 60);
      return pairs;
    } catch (error) {
      console.error("[Hyperliquid] Failed to get pairs:", error);
      return [];
    }
  }

  /**
   * Get current funding rate for a symbol
   */
  async getFundingRates(symbol: string): Promise<CexFundingRate[]> {
    const resolved = this.resolveFuturesSymbol(symbol);
    const coinName = this.extractCoinName(resolved);

    const cacheKey = `hyperliquid:funding:${coinName}`;
    const cached = this.cache.get<CexFundingRate[]>(cacheKey);
    if (cached) return cached;

    try {
      const [meta, assetCtxs] =
        await this.hlFetch<HyperliquidMetaAndAssetCtxsResponse>({
          type: "metaAndAssetCtxs",
        });

      if (!meta || !meta.universe || !assetCtxs) return [];

      const coinIndex = meta.universe.findIndex((u) => u.name === coinName);
      if (coinIndex < 0 || coinIndex >= assetCtxs.length) return [];

      const ctx = assetCtxs[coinIndex];
      const fundingRate = parseFloat(ctx.funding);
      const timestamp = Date.now();

      const rates: CexFundingRate[] = [
        {
          id: this.generateId(coinName, timestamp),
          exchange: "hyperliquid",
          symbol: resolved,
          fundingRate,
          fundingTimestamp: timestamp,
          timestamp,
          isPositive: fundingRate > 0,
          magnitude: this.estimateFundingMagnitude(fundingRate),
        },
      ];

      this.cache.set(cacheKey, rates, 30); // 30s cache for funding rates
      return rates;
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get funding rates for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get current open interest for a symbol
   */
  async getOpenInterest(symbol: string): Promise<CexOpenInterest[]> {
    const resolved = this.resolveFuturesSymbol(symbol);
    const coinName = this.extractCoinName(resolved);

    const cacheKey = `hyperliquid:oi:${coinName}`;
    const cached = this.cache.get<CexOpenInterest[]>(cacheKey);
    if (cached) return cached;

    try {
      const [meta, assetCtxs] =
        await this.hlFetch<HyperliquidMetaAndAssetCtxsResponse>({
          type: "metaAndAssetCtxs",
        });

    if (!meta || !meta.universe || !assetCtxs) return [];

    const coinIndex = meta.universe.findIndex((u) => u.name === coinName);
    if (coinIndex < 0 || coinIndex >= assetCtxs.length) return [];

    const ctx = assetCtxs[coinIndex];
    const openInterestUsd = parseFloat(ctx.openInterest);
    const markPrice = parseFloat(ctx.markPx);
    const timestamp = Date.now();

    const oi: CexOpenInterest[] = [
      {
        id: this.generateId(coinName, timestamp),
        exchange: "hyperliquid",
        symbol: resolved,
        openInterestUsd,
        openInterestAmount:
          markPrice > 0 ? openInterestUsd / markPrice : 0,
        timestamp,
        change24h: 0, // Would need historical data
        change24hPercent: 0,
        changeRecordedAt: timestamp,
        isSpike: false,
        spikeRatio: 1,
      },
    ];

    this.cache.set(cacheKey, oi, 120); // 120s cache for open interest
    return oi;
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get open interest for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get recent liquidations
   * Hyperliquid does not expose liquidations via public API
   */
  async getLiquidations(_hours: number): Promise<CexLiquidation[]> {
    void _hours;
    return [];
  }

  // ─── Private Methods ───────────────────────────────

  /**
   * Fetch from Hyperliquid POST /info endpoint
   * Hyperliquid uses POST with JSON body, not GET requests
   */
  private async hlFetch<T>(
    payload: Record<string, unknown>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        await this.rateLimiter.wait("hyperliquid", 1);

        const response = await fetch(`${this.baseUrl}/info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "NEXUS-1ai-tracker/1.0",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const isRetryable = response.status >= 429;
          if (isRetryable && attempt < 3) {
            lastError = new Error(`Hyperliquid API error: ${response.status} ${response.statusText}`);
            const delay = 1000 * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            console.warn(`[Hyperliquid] Retry ${attempt + 1}/3 after ${Math.round(delay)}ms: ${response.status}`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new Error(
            `Hyperliquid API error: ${response.status} ${response.statusText}`
          );
        }

        return (await response.json()) as T;
      } catch (err) {
        const isTimeout = err instanceof Error && (
          err.name === "TimeoutError" || err.name === "AbortError"
        );
        if (isTimeout && attempt < 3) {
          lastError = err as Error;
          const delay = 1000 * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          console.warn(`[Hyperliquid] Retry ${attempt + 1}/3 after timeout`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Hyperliquid fetch failed after 3 retries");
  }

  /**
   * Extract coin name from normalized symbol
   * BTCUSDT → BTC, ETHUSDT → ETH, etc.
   */
  private extractCoinName(normalizedSymbol: string): string {
    // Hyperliquid uses raw coin names: BTC, ETH, SOL, etc.
    // Strip USDT or USD suffix if present
    if (normalizedSymbol.endsWith("USDT")) {
      return normalizedSymbol.slice(0, -4);
    }
    if (normalizedSymbol.endsWith("USD")) {
      return normalizedSymbol.slice(0, -3);
    }
    // Already in coin name format (BTC, ETH, etc.)
    return normalizedSymbol;
  }
}
