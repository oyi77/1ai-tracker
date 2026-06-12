/**
 * CEX Client - Unified Interface
 * 
 * Single entry point for all CEX data across multiple exchanges.
 * Handles aggregation, deduplication, and routing to adapters.
 */

import { BinanceAdapter } from "./adapters/binance";
import { BybitAdapter } from "./adapters/bybit";
import { OkxAdapter } from "./adapters/okx";
import { HyperliquidAdapter } from "./adapters/hyperliquid";
import { KrakenAdapter } from "./adapters/kraken";
import {
  CexExchangeId,
  CexExchange,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "./types";
import { CexCache, cexCache } from "./cache";
import { CexRateLimiter, cexRateLimiter } from "./rate-limiter";
import { CexAdapter } from "./adapters/base";

export class CexClient {
  private cache: CexCache;
  private rateLimiter: CexRateLimiter;
  private adapters: Record<CexExchangeId, CexAdapter>;
  private enabledExchanges: Set<CexExchangeId> = new Set([
    "binance",
    "bybit",
    "okx",
    "hyperliquid",
    "kraken",
  ]);

  /** Inflight request deduplication: cacheKey → in-flight promise */
  private inflight: Map<string, Promise<unknown>> = new Map();

  constructor(
    cache: CexCache = cexCache,
    rateLimiter: CexRateLimiter = cexRateLimiter
  ) {
    this.cache = cache;
    this.rateLimiter = rateLimiter;

    // Initialize adapters
    this.adapters = {
      binance: new BinanceAdapter(cache, rateLimiter),
      bybit: new BybitAdapter(cache, rateLimiter),
      okx: new OkxAdapter(cache, rateLimiter),
      hyperliquid: new HyperliquidAdapter(cache, rateLimiter),
      kraken: new KrakenAdapter(cache, rateLimiter),
    };
  }

  /**
   * Deduplicate concurrent requests for the same cache key.
   * If a request for this key is already in-flight, join it instead of starting new API calls.
   */
  private dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fn().finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Enable/disable specific exchanges
   */
  setEnabledExchanges(exchanges: CexExchangeId[]): void {
    this.enabledExchanges = new Set(
      exchanges.filter((e) => this.adapters[e])
    );
  }

  /**
   * Get list of enabled exchanges
   */
  getEnabledExchanges(): CexExchangeId[] {
    return Array.from(this.enabledExchanges);
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get trading pairs from all enabled exchanges
   * Optional: filter by symbol or exchange
   */
  async getPairs(options?: {
    symbol?: string;
    exchange?: CexExchangeId;
    pairType?: "spot" | "linear" | "inverse";
  }): Promise<CexPair[]> {
    const { symbol, exchange, pairType } = options || {};
    const cacheKey = `cex:pairs:${symbol || "all"}:${exchange || "all"}`;

    const cached = this.cache.get<CexPair[]>(cacheKey);
    if (cached) return cached;

    return this.dedup(cacheKey, async () => {
      const promises: Promise<CexPair[]>[] = [];

      for (const exc of this.enabledExchanges) {
        if (exchange && exc !== exchange) continue;

        const adapter = this.adapters[exc];
        if (adapter) {
          promises.push(
            adapter.getPairs(symbol).catch((err) => {
              console.error(`[${exc}] getPairs error:`, err);
              return [];
            })
          );
        }
      }

      const results = await Promise.all(promises);
      let pairs = results.flat();

      if (pairType) {
        pairs = pairs.filter((p) => p.pairType === pairType);
      }

      pairs.sort((a, b) => b.volumeUsd24h - a.volumeUsd24h);

      this.cache.set(cacheKey, pairs, 60);
      return pairs;
    });
  }

  /**
   * Get a single pair across all exchanges
   */
  async getPair(baseSymbol: string, quoteSymbol: string): Promise<CexPair[]> {
    const symbol = `${baseSymbol}${quoteSymbol}`.toUpperCase();
    return this.getPairs({ symbol });
  }

  // ═══════════════════════════════════════════════════════════════
  // FUNDING RATES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get funding rates for a symbol across all enabled futures exchanges
   */
  async getFundingRates(symbol: string): Promise<CexFundingRate[]> {
    const normalized = symbol.toUpperCase().replace(/[-/]/g, "");
    const cacheKey = `cex:funding:${normalized}`;

    const cached = this.cache.get<CexFundingRate[]>(cacheKey);
    if (cached) return cached;

    return this.dedup(cacheKey, async () => {
      const promises: Promise<CexFundingRate[]>[] = [];

      for (const exc of this.enabledExchanges) {
        if (!this.enabledExchanges.has(exc)) continue;

        const adapter = this.adapters[exc];
        if (adapter) {
          promises.push(
            adapter.getFundingRates(normalized).catch((err) => {
              console.error(`[${exc}] getFundingRates error:`, err);
              return [];
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const rates = results.flat();

      rates.sort((a, b) => b.timestamp - a.timestamp);

      this.cache.set(cacheKey, rates, 30);
      return rates;
    });
  }

  /**
   * Get funding rate statistics across exchanges
   */
  async getFundingRateStats(
    symbol: string
  ): Promise<{
    symbol: string;
    averageRate: number;
    highRate: number;
    lowRate: number;
    byExchange: Record<string, number>;
  }> {
    const rates = await this.getFundingRates(symbol);

    if (rates.length === 0) {
      return {
        symbol,
        averageRate: 0,
        highRate: 0,
        lowRate: 0,
        byExchange: {},
      };
    }

    const byExchange: Record<string, number> = {};
    for (const rate of rates) {
      byExchange[rate.exchange] = rate.fundingRate;
    }

    const ratesArr = rates.map((r) => r.fundingRate);

    return {
      symbol,
      averageRate: ratesArr.reduce((a, b) => a + b, 0) / ratesArr.length,
      highRate: Math.max(...ratesArr),
      lowRate: Math.min(...ratesArr),
      byExchange,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // OPEN INTEREST
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get open interest data for a symbol
   */
  async getOpenInterest(symbol: string): Promise<CexOpenInterest[]> {
    const normalized = symbol.toUpperCase().replace(/[-/]/g, "");
    const cacheKey = `cex:oi:${normalized}`;

    const cached = this.cache.get<CexOpenInterest[]>(cacheKey);
    if (cached) return cached;

    return this.dedup(cacheKey, async () => {
      const promises: Promise<CexOpenInterest[]>[] = [];

      for (const exc of this.enabledExchanges) {
        if (!this.enabledExchanges.has(exc)) continue;

        const adapter = this.adapters[exc];
        if (adapter) {
          promises.push(
            adapter.getOpenInterest(normalized).catch((err) => {
              console.error(`[${exc}] getOpenInterest error:`, err);
              return [];
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const data = results.flat();

      this.cache.set(cacheKey, data, 120);
      return data;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LIQUIDATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get recent liquidations across exchanges
   * Filters by minimum size to focus on whale activity
   */
  async getLiquidations(options?: {
    hours?: number;
    exchanges?: CexExchangeId[];
    minUsd?: number;
    sides?: ("long" | "short")[];
  }): Promise<CexLiquidation[]> {
    const {
      hours = 24,
      exchanges,
      minUsd = 100000, // $100K minimum (whale tier)
      sides,
    } = options || {};

    const cacheKey = `cex:liquidations:${hours}h`;
    const cached = this.cache.get<CexLiquidation[]>(cacheKey);
    if (cached) {
      return this.filterLiquidations(cached, { exchanges, minUsd, sides });
    }

    return this.dedup(cacheKey, async () => {
      const promises: Promise<CexLiquidation[]>[] = [];

      // No exchange currently exposes liquidation data via public REST API
    const liquidationExchanges = [] as CexExchangeId[];

      for (const exc of liquidationExchanges) {
        if (!this.enabledExchanges.has(exc)) continue;
        if (exchanges && !exchanges.includes(exc)) continue;

        const adapter = this.adapters[exc];
        if (adapter) {
          promises.push(
            adapter.getLiquidations(hours).catch((err) => {
              console.error(`[${exc}] getLiquidations error:`, err);
              return [];
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const liquidations = results.flat();

      liquidations.sort((a, b) => b.timestamp - a.timestamp);

      this.cache.set(cacheKey, liquidations, 5);

      return this.filterLiquidations(liquidations, {
        exchanges,
        minUsd,
        sides,
      });
    });
  }

  /**
   * Get whale liquidations (high-impact event detection)
   */
  async getWhaleLiquidations(options?: {
    hours?: number;
    minUsd?: number;
  }): Promise<CexLiquidation[]> {
    const { hours = 24, minUsd = 1000000 } = options || {}; // $1M minimum

    const liq = await this.getLiquidations({ hours, minUsd });
    return liq.filter((l) => l.isWhaleLiquidation);
  }

  // ═══════════════════════════════════════════════════════════════
  // EXCHANGE STATUS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get status for all exchanges
   */
  async getExchangeStatus(): Promise<Record<CexExchangeId, CexExchange>> {
    const cacheKey = "cex:exchange-status";

    return this.dedup(cacheKey, async () => {
      const promises: Promise<{ exc: CexExchangeId; status: CexExchange }>[] = [];

      for (const exc of this.enabledExchanges) {
        const adapter = this.adapters[exc];
        if (adapter) {
          promises.push(
            adapter
              .getExchangeStatus()
              .then((status) => ({ exc, status }))
              .catch((err) => {
                console.error(`[${exc}] getExchangeStatus error:`, err);
                const statusBase: Omit<CexExchange, 'supports'> = {
                  id: exc,
                  name: exc,
                  timezone: "UTC",
                  serverTime: Date.now(),
                  makerFee: 0,
                  takerFee: 0,
                  spotVolumeUsd24h: 0,
                  futuresVolumeUsd24h: 0,
                  status: "offline" as const,
                  lastUpdate: Date.now(),
                };
                return {
                  exc,
                  status: {
                    ...statusBase,
                    supports: { fundingRates: false, openInterest: false, liquidations: false },
                  },
                };
              })
          );
        }
      }

      const results = await Promise.all(promises);
      const status = {} as Record<CexExchangeId, CexExchange>;

      for (const { exc, status: st } of results) {
        status[exc] = st;
      }

      return status;
    });
  }

  /**
   * Check if all exchanges are healthy
   */
  async areExchangesHealthy(): Promise<boolean> {
    const status = await this.getExchangeStatus();
    return Object.values(status).every((s) => s.status === "operational");
  }

  // ═══════════════════════════════════════════════════════════════
  // RATE LIMITER ACCESS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get rate limit status for all exchanges
   */
  getRateLimitStatus(): ReturnType<typeof cexRateLimiter.getAllStatus> {
    return this.rateLimiter.getAllStatus();
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE
  // ═══════════════════════════════════════════════════════════════

  private filterLiquidations(
    liquidations: CexLiquidation[],
    options?: {
      exchanges?: CexExchangeId[];
      minUsd?: number;
      sides?: ("long" | "short")[];
    }
  ): CexLiquidation[] {
    let filtered = liquidations;

    if (options?.exchanges) {
      filtered = filtered.filter((l) => options.exchanges!.includes(l.exchange));
    }

    if (options?.minUsd) {
      filtered = filtered.filter((l) => l.estimatedValueUsd >= options.minUsd!);
    }

    if (options?.sides) {
      filtered = filtered.filter((l) => options.sides!.includes(l.side));
    }

    return filtered;
  }
}

/**
 * Global CEX client instance
 */
export const cexClient = new CexClient();
