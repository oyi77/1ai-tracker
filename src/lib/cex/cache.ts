/**
 * CEX Data Cache
 * 
 * TTL-based in-memory cache with automatic cleanup.
 * Reduces API calls and improves response times.
 */

import { CexPair, CexFundingRate, CexOpenInterest, CexLiquidation } from "./types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export class CexCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Store data with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  /**
   * Retrieve data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if key exists and is fresh
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear specific key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  // ─── Convenience Methods ──────────────────────────────

  getPairs(exchange?: string, symbol?: string): CexPair[] | null {
    const key = this.buildKey("pairs", exchange, symbol);
    return this.get<CexPair[]>(key);
  }

  setPairs(pairs: CexPair[], exchange?: string, symbol?: string): void {
    const key = this.buildKey("pairs", exchange, symbol);
    this.set(key, pairs, 60); // 60s TTL
  }

  getFundingRates(exchange?: string, symbol?: string): CexFundingRate[] | null {
    const key = this.buildKey("funding", exchange, symbol);
    return this.get<CexFundingRate[]>(key);
  }

  setFundingRates(
    rates: CexFundingRate[],
    exchange?: string,
    symbol?: string
  ): void {
    const key = this.buildKey("funding", exchange, symbol);
    this.set(key, rates, 30); // 30s TTL (volatile)
  }

  getOpenInterest(
    exchange?: string,
    symbol?: string
  ): CexOpenInterest[] | null {
    const key = this.buildKey("oi", exchange, symbol);
    return this.get<CexOpenInterest[]>(key);
  }

  setOpenInterest(
    data: CexOpenInterest[],
    exchange?: string,
    symbol?: string
  ): void {
    const key = this.buildKey("oi", exchange, symbol);
    this.set(key, data, 120); // 120s TTL
  }

  getLiquidations(exchange?: string): CexLiquidation[] | null {
    const key = this.buildKey("liquidations", exchange);
    return this.get<CexLiquidation[]>(key);
  }

  setLiquidations(data: CexLiquidation[], exchange?: string): void {
    const key = this.buildKey("liquidations", exchange);
    // Liquidations don't get cached (real-time), but keep interface consistent
    this.set(key, data, 5); // 5s minimum for duplicate detection
  }

  // ─── Private ──────────────────────────────────────

  private buildKey(...parts: (string | undefined)[]): string {
    return parts.filter(Boolean).join(":");
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    // Don't keep the process alive for this timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.debug(`[CexCache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Cleanup timer for graceful shutdown
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Global cache instance
 */
export const cexCache = new CexCache();
