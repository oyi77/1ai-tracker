import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with status "ok"', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getStatus()).toBe('ok');
  });

  it('enters cooldown after reaching failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 60_000 });
    const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
    const fallback = vi.fn().mockReturnValue('fallback');

    // First failure — still ok (threshold not reached)
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('ok');

    // Second failure — enters cooldown
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('cooldown');
  });

  it('exits cooldown after cooldownMs elapses and becomes "degraded"', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 5_000 });
    const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
    const fallback = vi.fn().mockReturnValue('fb');

    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('cooldown');

    // Advance past cooldown
    vi.advanceTimersByTime(5_001);
    expect(breaker.getStatus()).toBe('degraded');

    // After degraded, a success resets to ok
    const successFn = vi.fn().mockResolvedValue('ok');
    await breaker.execute(successFn, fallback);
    expect(breaker.getStatus()).toBe('ok');
  });

  it('serves cached data during cooldown', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 60_000 });
    const successFn = vi.fn().mockResolvedValue('fresh');
    const fallback = vi.fn().mockReturnValue('fallback');

    // Warm the cache
    const result1 = await breaker.execute(successFn, fallback, { cacheKey: 'k' });
    expect(result1).toBe('fresh');

    // Trigger cooldown
    const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('cooldown');

    // During cooldown, should return cached data
    const result2 = await breaker.execute(
      vi.fn().mockResolvedValue('new'),
      fallback,
      { cacheKey: 'k' },
    );
    expect(result2).toBe('fresh');
  });

  it('returns fallback when no cache is available during cooldown', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 60_000 });
    const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
    const fallback = vi.fn().mockReturnValue('fallback-value');

    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('cooldown');

    // No cacheKey → fallback
    const result = await breaker.execute(failingFn, fallback);
    expect(result).toBe('fallback-value');
  });

  it('reset failures on success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });
    const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
    const successFn = vi.fn().mockResolvedValue('ok');
    const fallback = vi.fn().mockReturnValue('fb');

    // Two failures
    await breaker.execute(failingFn, fallback);
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('ok');

    // Success resets failure count
    await breaker.execute(successFn, fallback);
    expect(breaker.getStatus()).toBe('ok');

    // Two more failures should NOT trigger cooldown (counter was reset)
    await breaker.execute(failingFn, fallback);
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('ok');

    // Third failure now triggers cooldown
    await breaker.execute(failingFn, fallback);
    expect(breaker.getStatus()).toBe('cooldown');
  });

  it('evicts oldest cache entry when max size is exceeded', async () => {
    const breaker = new CircuitBreaker({ cacheMaxSize: 2, failureThreshold: 10 });
    const fallback = vi.fn().mockReturnValue('fb');

    await breaker.execute(async () => 'a', fallback, { cacheKey: 'a' });
    await breaker.execute(async () => 'b', fallback, { cacheKey: 'b' });
    await breaker.execute(async () => 'c', fallback, { cacheKey: 'c' });

    // 'a' was evicted (LRU with maxSize=2)
    expect(breaker.getCached('a')).toBeUndefined();
    expect(breaker.getCached('b')).toBe('b');
    expect(breaker.getCached('c')).toBe('c');
  });

  it('drops cache entries past 2× TTL', async () => {
    const breaker = new CircuitBreaker({ cacheTtlMs: 1_000 });
    const fallback = vi.fn().mockReturnValue('fb');

    await breaker.execute(async () => 'data', fallback, { cacheKey: 'k' });
    expect(breaker.getCached('k')).toBe('data');

    // Past 2× TTL
    vi.advanceTimersByTime(2_001);
    expect(breaker.getCached('k')).toBeUndefined();
  });
});
