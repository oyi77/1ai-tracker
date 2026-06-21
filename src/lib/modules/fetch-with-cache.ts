// ─────────────────────────────────────────────────────────────
// Cached fetch with single-flight deduplication
// Two-layer cache: Redis (distributed, persists restart) + in-memory (fast local)
// ─────────────────────────────────────────────────────────────

import type { ModuleResult } from './types'

const inflight = new Map<string, Promise<unknown>>()
const memoryCache = new Map<string, { data: unknown; expires: number }>()

// Lazy Redis import to avoid circular deps and allow graceful degradation
let redisClient: import('ioredis').Redis | null = null
let redisChecked = false

function getRedis() {
  if (redisChecked) return redisClient
  redisChecked = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRedisClient } = require('../redis')
    redisClient = getRedisClient()
  } catch {
    redisClient = null
  }
  return redisClient
}

function cacheKey(moduleId: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  return `nexus:mod:${moduleId}:${JSON.stringify(sorted)}`
}

function memoryGet<T>(key: string): T | undefined {
  const entry = memoryCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expires) {
    memoryCache.delete(key)
    return undefined
  }
  return entry.data as T
}

function memorySet<T>(key: string, data: T, ttlMs: number) {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs })
  // Evict expired entries periodically
  if (memoryCache.size > 500) {
    const now = Date.now()
    for (const [k, v] of memoryCache) {
      if (now > v.expires) memoryCache.delete(k)
    }
  }
}

async function redisGet<T>(key: string): Promise<T | undefined> {
  const redis = getRedis()
  if (!redis) return undefined
  try {
    const data = await redis.get(key)
    if (!data) return undefined
    return JSON.parse(data) as T
  } catch {
    return undefined
  }
}

async function redisSet<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(data), 'PX', ttlMs)
  } catch {
    // Redis write failure — not critical, in-memory cache still works
  }
}

/**
 * Fetch with two-layer caching and single-flight deduplication.
 * Layer 1: In-memory (fast, per-process)
 * Layer 2: Redis (distributed, survives restart)
 * If 50 concurrent requests hit the same key, only 1 upstream call goes out.
 */
export async function cachedFetch<T>(
  moduleId: string,
  params: Record<string, unknown>,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<ModuleResult<T>> {
  const key = cacheKey(moduleId, params)

  // Layer 1: Check in-memory cache
  const memCached = memoryGet<T>(key)
  if (memCached !== undefined) {
    return { data: memCached, source: moduleId, cached: true, timestamp: Date.now(), ttl: ttlMs }
  }

  // Layer 2: Check Redis cache
  const redisCached = await redisGet<T>(key)
  if (redisCached !== undefined) {
    // Promote to memory cache
    memorySet(key, redisCached, ttlMs)
    return { data: redisCached, source: moduleId, cached: true, timestamp: Date.now(), ttl: ttlMs }
  }

  // Single-flight: if another request is already in-flight for this key, wait for it
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) {
    const data = await existing
    return { data, source: moduleId, cached: true, timestamp: Date.now(), ttl: ttlMs }
  }

  // Make the actual call
  const promise = fetcher()
  inflight.set(key, promise)

  try {
    const data = await promise
    // Write to both caches
    memorySet(key, data, ttlMs)
    void redisSet(key, data, ttlMs) // Fire-and-forget Redis write
    return { data, source: moduleId, cached: false, timestamp: Date.now(), ttl: ttlMs }
  } finally {
    inflight.delete(key)
  }
}

/** Clear all caches — for testing only */
export function _clearCaches() {
  memoryCache.clear()
  inflight.clear()
  redisChecked = false
  redisClient = null
}
