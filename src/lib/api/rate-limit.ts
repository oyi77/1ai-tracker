import { getRedisClient } from "../redis";

export async function checkRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60000
): Promise<{ allowed: boolean; remaining: number }> {
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
    return { allowed: true, remaining: maxRequests - 1 };
  }

  const count = results[2][1] as number;
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  return { allowed, remaining };
}
