/**
 * Base CEX Adapter Interface
 * 
 * All exchange adapters must implement this interface.
 */

import {
  CexExchange,
  CexExchangeId,
  CexPair,
  CexFundingRate,
  CexOpenInterest,
  CexLiquidation,
} from "../types";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

/**
 * Abstract base class for CEX adapters
 */
export abstract class CexAdapter {
  protected abstract exchangeId: CexExchangeId;
  protected abstract baseUrl: string;

  /** Inflight per-cache-key dedup for adapter-level concurrent requests */
  private inflight: Map<string, Promise<unknown>> = new Map();

  constructor(
    protected cache: CexCache,
    protected rateLimiter: CexRateLimiter
  ) {}

  /**
   * Get exchange metadata and status
   */
  abstract getExchangeStatus(): Promise<CexExchange>;

  /**
   * Get all trading pairs or specific pair data
   */
  abstract getPairs(symbol?: string): Promise<CexPair[]>;

  /**
   * Get current and historical funding rates
   * (futures-only exchanges)
   */
  abstract getFundingRates(symbol: string): Promise<CexFundingRate[]>;

  /**
   * Get current open interest
   * (futures-only exchanges)
   */
  abstract getOpenInterest(symbol: string): Promise<CexOpenInterest[]>;

  /**
   * Get recent liquidations
   * (only bybit, okx, hyperliquid expose this)
   */
  abstract getLiquidations(hours: number): Promise<CexLiquidation[]>;

  /**
   * Adapter-level inflight dedup — prevents concurrent API calls for the same cache key.
   * Subclasses call this for their per-adapter caching (e.g. pairs/funding/OI).
   */
  protected dedupCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(cacheKey) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fn().finally(() => {
      this.inflight.delete(cacheKey);
    });
    this.inflight.set(cacheKey, promise);
    return promise;
  }

  /**
   * Check if exchange is operational
   */
  async isHealthy(): Promise<boolean> {
    try {
      const status = await this.getExchangeStatus();
      return status.status === "operational";
    } catch {
      return false;
    }
  }

  /**
   * Protected fetch helper with rate limiting and exponential backoff retry.
   * Retries up to MAX_RETRIES on 5xx/429/timeout with jittered backoff.
   */
  protected async fetch<T>(
    url: string,
    options?: {
      tokens?: number;
      timeout?: number;
    }
  ): Promise<T> {
    let lastError: Error | null = null;

    // Apply rate limiting ONCE before the retry loop, not on every attempt.
    // Calling it on every retry would cascade delays: after a 429 we already
    // wait exponential backoff, so an extra rate-limiter pause is redundant.
    await this.rateLimiter.wait(
      this.exchangeId,
      options?.tokens ?? 1
    );

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(options?.timeout ?? 10000),
          headers: {
            Accept: "application/json",
            "User-Agent": "NEXUS-1ai-nexus/1.0",
          },
        });

        if (!response.ok) {
          const isRetryable = response.status >= 429;
          const err = new Error(
            `${this.exchangeId} API error: ${response.status} ${response.statusText}`
          );
          if (isRetryable && attempt < MAX_RETRIES) {
            lastError = err;
            const delay = BASE_RETRY_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            console.warn(`[${this.exchangeId}] Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(delay)}ms: ${response.status}`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw err;
        }

        return (await response.json()) as T;
      } catch (err) {
        if (
          err instanceof Error &&
          (err.name === "TimeoutError" || err.message.includes("aborted")) &&
          attempt < MAX_RETRIES
        ) {
          lastError = err;
          const delay = BASE_RETRY_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          console.warn(`[${this.exchangeId}] Retry ${attempt + 1}/${MAX_RETRIES} after timeout`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error(`${this.exchangeId} fetch failed after ${MAX_RETRIES} retries`);
  }

  /**
   * Normalize symbol format (BTCUSDT, BTC-USDT, BTC/USDT → internal format)
   */
  protected normalizeSymbol(symbol: string): string {
    return symbol.toUpperCase().replace(/[-/]/g, "");
  }

  /**
   * Resolve a potentially short symbol (e.g. "BTC") to a full futures pair
   * by appending "USDT" if no known quote currency is present.
   */
  protected resolveFuturesSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    const knownQuotes = ["USDT", "USDC", "BUSD", "USD", "EUR"];
    for (const q of knownQuotes) {
      if (normalized.endsWith(q)) return normalized;
    }
    return normalized + "USDT";
  }

  /**
   * Extract base and quote from symbol
   */
  protected extractPairParts(symbol: string): {
    base: string;
    quote: string;
  } {
    // Common patterns: BTCUSDT, BTC-USDT, BTC/USDT
    const normalized = this.normalizeSymbol(symbol);

    // Try common stablecoins first (they're often longer)
    const stablecoins = ["USDT", "USDC", "BUSD", "USDX", "USDD", "GUSD"];
    for (const stable of stablecoins) {
      if (normalized.endsWith(stable)) {
        return {
          base: normalized.slice(0, -stable.length),
          quote: stable,
        };
      }
    }

    // Try other common quotes
    const quotes = ["USD", "EUR", "GBP", "JPY", "BTC", "ETH", "BNB"];
    for (const quote of quotes) {
      if (normalized.endsWith(quote)) {
        return {
          base: normalized.slice(0, -quote.length),
          quote,
        };
      }
    }

    // Fallback: assume last 3-4 chars are quote
    if (normalized.length > 6) {
      const possibleQuote = normalized.slice(-4);
      return {
        base: normalized.slice(0, -4),
        quote: possibleQuote,
      };
    }

    // Last resort: split in half
    const mid = Math.ceil(normalized.length / 2);
    return {
      base: normalized.slice(0, mid),
      quote: normalized.slice(mid),
    };
  }

  /**
   * Calculate funding rate magnitude
   */
  protected estimateFundingMagnitude(
    rate: number
  ): "extreme" | "high" | "normal" | "low" {
    const absRate = Math.abs(rate);
    if (absRate > 0.001) return "extreme"; // > 0.1% per 8h
    if (absRate > 0.0005) return "high"; // > 0.05%
    if (absRate > 0.0001) return "normal"; // > 0.01%
    return "low";
  }

  /**
   * Determine if liquidation is "whale-sized"
   */
  protected isWhaleLiquidation(usdValue: number): boolean {
    return usdValue >= 100000; // $100K+
  }

  /**
   * Generate unique ID for data records
   */
  protected generateId(...parts: (string | number)[]): string {
    return [this.exchangeId, ...parts].join("_");
  }
}
