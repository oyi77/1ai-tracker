/**
 * CEX Rate Limiter
 * 
 * Token bucket implementation for per-exchange rate limiting.
 * Uses monotonic clock (performance.now()) to prevent clock-skew issues.
 * Ensures we stay within API limits without requesting in queue.
 */

import { CexExchangeId } from "./types";

/**
 * Monotonic clock that is immune to system clock adjustments (NTP, manual changes).
 * Uses performance.now() relative to an initial Date.now() baseline.
 */
const monotonicNow: () => number = (() => {
  const baseline = Date.now();
  const startPerf = performance.now();
  return () => baseline + Math.round(performance.now() - startPerf);
})();

interface RateLimitConfig {
  ratePerSecond: number; // tokens per second
  capacity: number; // max burst
  minWaitMs?: number; // minimum wait before retry
}

const RATE_LIMIT_CONFIGS: Record<CexExchangeId, RateLimitConfig> = {
  binance: {
    ratePerSecond: 20, // 1200/min
    capacity: 120,
    minWaitMs: 50,
  },
  bybit: {
    ratePerSecond: 16.67, // 1000/min
    capacity: 100,
    minWaitMs: 60,
  },
  okx: {
    ratePerSecond: 30,
    capacity: 300,
    minWaitMs: 33,
  },
  hyperliquid: {
    ratePerSecond: Infinity, // unlimited
    capacity: Infinity,
  },
  kraken: {
    ratePerSecond: 15,
    capacity: 150,
    minWaitMs: 67,
  },
};

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number = monotonicNow();

  constructor(
    private ratePerSecond: number,
    private capacity: number,
    private minWaitMs: number = 0
  ) {
    this.tokens = capacity;
  }

  /**
   * Attempt to acquire tokens.
   * Returns wait time in ms if insufficient tokens, else 0.
   */
  acquire(count: number = 1): number {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return 0; // Can proceed immediately
    }

    // Calculate how long to wait
    const deficit = count - this.tokens;
    const waitMs = (deficit / this.ratePerSecond) * 1000;

    // Ensure minimum wait time
    return Math.max(Math.ceil(waitMs), this.minWaitMs);
  }

  private refill(): void {
    const now = monotonicNow();
    const elapsedMs = now - this.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;

    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.ratePerSecond
    );

    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return Math.min(this.tokens, this.capacity);
  }

  /**
   * Reset bucket to full
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = monotonicNow();
  }
}

/**
 * Per-exchange rate limiting manager
 */
export class CexRateLimiter {
  private buckets: Map<CexExchangeId, TokenBucket> = new Map();
  private requestLog: Map<CexExchangeId, number[]> = new Map(); // timestamps

  constructor() {
    // Initialize buckets for all exchanges
    for (const [exchange, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
      const bucket = new TokenBucket(
        config.ratePerSecond,
        config.capacity,
        config.minWaitMs
      );
      this.buckets.set(exchange as CexExchangeId, bucket);
      this.requestLog.set(exchange as CexExchangeId, []);
    }
  }

  /**
   * Wait for rate limit, then acquire token
   * Throws if rate limit cannot be satisfied
   */
  async wait(exchange: CexExchangeId, tokens: number = 1): Promise<void> {
    const bucket = this.getBucket(exchange);
    const waitMs = bucket.acquire(tokens);

    if (waitMs > 0) {
      console.warn(
        `[RateLimit] ${exchange} rate limited, waiting ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // Log request for monitoring
    this.logRequest(exchange);
  }

  /**
   * Check if we can make a request without waiting
   */
  canProceed(exchange: CexExchangeId, tokens: number = 1): boolean {
    const bucket = this.getBucket(exchange);
    return bucket.acquire(tokens) === 0;
  }

  /**
   * Get current rate limit status
   */
  getStatus(exchange: CexExchangeId): {
    tokensAvailable: number;
    ratePerSecond: number;
    capacity: number;
    recentRequests: number;
  } {
    const bucket = this.getBucket(exchange);
    const config = RATE_LIMIT_CONFIGS[exchange];
    const now = monotonicNow();
    const recentRequests = (this.requestLog.get(exchange) || []).filter(
      (ts) => now - ts < 60000 // last minute
    ).length;

    return {
      tokensAvailable: bucket.getTokens(),
      ratePerSecond: config.ratePerSecond,
      capacity: config.capacity,
      recentRequests,
    };
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset(exchange?: CexExchangeId): void {
    if (exchange) {
      this.getBucket(exchange).reset();
      this.requestLog.set(exchange, []);
    } else {
      for (const bucket of this.buckets.values()) {
        bucket.reset();
      }
      for (const [key] of this.buckets) {
        this.requestLog.set(key, []);
      }
    }
  }

  /**
   * Get metrics for all exchanges
   */
  getAllStatus(): Record<CexExchangeId, {
    tokensAvailable: number;
    ratePerSecond: number;
    capacity: number;
    recentRequests: number;
  }> {
    const result = {} as Record<CexExchangeId, {
      tokensAvailable: number;
      ratePerSecond: number;
      capacity: number;
      recentRequests: number;
    }>;
    for (const exchange of Object.keys(RATE_LIMIT_CONFIGS) as CexExchangeId[]) {
      result[exchange] = this.getStatus(exchange);
    }
    return result;
  }

  // ─── Private ──────────────────────────────────

  private getBucket(exchange: CexExchangeId): TokenBucket {
    const bucket = this.buckets.get(exchange);
    if (!bucket) {
      throw new Error(`Unknown exchange: ${exchange}`);
    }
    return bucket;
  }

  private logRequest(exchange: CexExchangeId): void {
    const log = this.requestLog.get(exchange) || [];
    log.push(monotonicNow());

    // Keep only last 1 hour of logs
    const oneHourAgo = monotonicNow() - 3600000;
    const recentLogs = log.filter((ts) => ts > oneHourAgo);

    this.requestLog.set(exchange, recentLogs);
  }
}

/**
 * Global rate limiter instance
 */
export const cexRateLimiter = new CexRateLimiter();
