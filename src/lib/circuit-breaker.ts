import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BreakerStatus = "ok" | "cooldown" | "degraded";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before entering cooldown (default: 2) */
  failureThreshold?: number;
  /** Cooldown duration in ms before the breaker resets (default: 300_000 = 5 min) */
  cooldownMs?: number;
  /** Maximum number of entries in the LRU cache (default: 100) */
  cacheMaxSize?: number;
  /** TTL in ms for cache entries (default: 600_000 = 10 min) */
  cacheTtlMs?: number;
  /** Name for logging context */
  name?: string;
}

export interface SwrOptions {
  /** Polling interval in ms (default: 60_000) */
  refreshInterval?: number;
  /** Enable localStorage persistence (default: true) */
  persist?: boolean;
  /** Namespace prefix for localStorage keys (default: "swr") */
  persistPrefix?: string;
}

// ---------------------------------------------------------------------------
// LRU Cache (no external deps)
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

class LruCache<T = unknown> {
  private map = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    // Promote to most-recently-used
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first key in insertion order)
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, entry);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }
}

// ---------------------------------------------------------------------------
// Circuit Breaker (server-side)
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  private failures = 0;
  private cooldownUntil = 0;
  private cache: LruCache;
  private cacheTtlMs: number;
  private failureThreshold: number;
  private cooldownMs: number;
  private name: string;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 2;
    this.cooldownMs = options?.cooldownMs ?? 300_000;
    this.cacheTtlMs = options?.cacheTtlMs ?? 600_000;
    this.name = options?.name ?? "CircuitBreaker";
    this.cache = new LruCache(options?.cacheMaxSize ?? 100);
  }

  /** Current breaker status. */
  getStatus(): BreakerStatus {
    if (this.cooldownUntil === 0) return "ok";
    if (Date.now() >= this.cooldownUntil) {
      // Cooldown expired — reset
      this.failures = 0;
      this.cooldownUntil = 0;
      return "degraded";
    }
    return "cooldown";
  }

  /**
   * Execute an async call through the circuit breaker.
   *
   * - On success: caches the result and returns it.
   * - On failure when cooldown active: returns stale cached data.
   * - On failure when no cache: calls `fallback`.
   * - On failure counting up: enters cooldown after threshold.
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>,
    options?: { cacheKey?: string; cacheTtlMs?: number },
  ): Promise<T> {
    const status = this.getStatus();

    // During cooldown, prefer stale data
    if (status === "cooldown") {
      const cached = options?.cacheKey ? this.getCached<T>(options.cacheKey) : undefined;
      if (cached !== undefined) return cached;
      return fallback();
    }

    try {
      const result = await fn();
      this.onSuccess(result, options?.cacheKey, options?.cacheTtlMs);
      return result;
    } catch (err) {
      this.onFailure();
      // Try stale cache on failure
      const cached = options?.cacheKey ? this.getCached<T>(options.cacheKey) : undefined;
      if (cached !== undefined) return cached;
      return fallback();
    }
  }

  /**
   * Read stale data from cache. Returns `undefined` when the key is
   * missing or the entry has expired past its TTL.
   */
  getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    // Always return data if we have it (SWR allows stale reads),
    // but drop truly ancient entries past 2× TTL
    if (Date.now() > entry.storedAt + this.cacheTtlMs * 2) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Manually warm the cache with fresh data. */
  recordSuccess<T>(data: T, key: string): void {
    const now = Date.now();
    this.cache.set(key, {
      value: data,
      storedAt: now,
      expiresAt: now + this.cacheTtlMs,
    });
    this.failures = 0;
    this.cooldownUntil = 0;
  }

  private onSuccess<T>(data: T, key?: string, ttlMs?: number): void {
    this.failures = 0;
    this.cooldownUntil = 0;
    if (key) {
      const now = Date.now();
      this.cache.set(key, {
        value: data,
        storedAt: now,
        expiresAt: now + (ttlMs ?? this.cacheTtlMs),
      });
    }
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.cooldownUntil = Date.now() + this.cooldownMs;
      console.warn(
        `[${this.name}] Entered cooldown for ${this.cooldownMs}ms after ${this.failures} failures`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton for API routes (server-side only)
// ---------------------------------------------------------------------------

let defaultBreaker: CircuitBreaker | undefined;

export function getDefaultBreaker(): CircuitBreaker {
  if (!defaultBreaker) {
    defaultBreaker = new CircuitBreaker({ name: "default" });
  }
  return defaultBreaker;
}

// ---------------------------------------------------------------------------
// Client-side SWR hook
// ---------------------------------------------------------------------------

interface SwrState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
}

interface SwrResult<T> extends SwrState<T> {
  refresh: () => void;
}

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

function getBackoffMs(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
}

function readLocalStorage<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or private mode — silently ignore
  }
}

/**
 * Client-side SWR hook with localStorage persistence, exponential backoff,
 * and tab-pause (stops polling when the tab is hidden).
 */
export function useSwrFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: SwrOptions,
): SwrResult<T> {
  const refreshInterval = options?.refreshInterval ?? 60_000;
  const persist = options?.persist !== false;
  const persistPrefix = options?.persistPrefix ?? "swr";

  const storageKey = persist && key ? `${persistPrefix}:${key}` : null;

  const [state, setState] = useState<SwrState<T>>(() => {
    const cached = storageKey ? readLocalStorage<T>(storageKey) : undefined;
    return {
      data: cached,
      error: undefined,
      isLoading: !cached,
      isStale: false,
    };
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const backoffAttempt = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const activeRef = useRef(true);

  const doFetch = useCallback(
    async (_isBackground: boolean) => {
      if (!key) return;
      try {
        const data = await fetcherRef.current();
        backoffAttempt.current = 0;
        if (storageKey) writeLocalStorage(storageKey, data);
        setState((_prev) => ({
          data,
          error: undefined,
          isLoading: false,
          isStale: false,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        backoffAttempt.current += 1;
        setState((prev) => ({
          ...prev,
          error,
          isLoading: false,
          isStale: true,
        }));

        // Schedule retry with backoff
        if (activeRef.current) {
          const delay = getBackoffMs(backoffAttempt.current);
          timerRef.current = setTimeout(() => {
            if (activeRef.current) void doFetch(false);
          }, delay);
        }
      }
    },
    [key, storageKey],
  );

  // Initial + key-change fetch
  useEffect(() => {
    activeRef.current = true;
    if (key) {
      setState((prev) => ({ ...prev, isLoading: !prev.data }));
      void doFetch(false);
    }
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, doFetch]);

  // Polling interval with tab-pause
  useEffect(() => {
    if (!key || refreshInterval <= 0) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timerRef.current);
      } else {
        // Immediately refresh on tab focus, then resume polling
        if (activeRef.current) {
          setState((prev) => ({ ...prev, isStale: true }));
          void doFetch(true);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const poll = () => {
      timerRef.current = setTimeout(() => {
        if (!activeRef.current || document.hidden) return;
        setState((prev) => ({ ...prev, isStale: true }));
        void doFetch(true).then(poll);
      }, refreshInterval);
    };

    poll();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(timerRef.current);
    };
  }, [key, refreshInterval, doFetch]);

  const refresh = useCallback(() => {
    backoffAttempt.current = 0;
    setState((prev) => ({ ...prev, isLoading: true, isStale: true }));
    void doFetch(false);
  }, [doFetch]);

  return { ...state, refresh };
}
