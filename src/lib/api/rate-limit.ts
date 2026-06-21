import { getRedisClient } from "../redis";

export async function checkRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zadd(redisKey, now, `${now}:${Math.random()}`);
    multi.zcard(redisKey);
    multi.pexpire(redisKey, windowMs);

    const results = await multi.exec();
    if (!results) {
      // Redis returned null (transaction failed) — fail closed
      console.warn("[RateLimit] Redis transaction failed — denying request");
      return { allowed: false, remaining: 0 };
    }

    const count = results[2][1] as number;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining };
  } catch (err) {
    // Redis connection error — fail closed to prevent abuse
    console.error("[RateLimit] Redis error — denying request:", (err as Error).message);
    return { allowed: false, remaining: 0 };
  }
}
