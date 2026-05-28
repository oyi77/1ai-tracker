import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    client.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    client.on("connect", () => {
      console.log("[Redis] Connected to", REDIS_URL);
    });

    client.on("reconnecting", (delay: number) => {
      console.warn("[Redis] Reconnecting in", delay, "ms");
    });
  }

  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
