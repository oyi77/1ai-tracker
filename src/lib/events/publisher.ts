import { getRedisClient } from "../redis";
import type { ChannelName, NexusEvent } from "./types";

export async function publishEvent<T>(
  channel: ChannelName,
  eventType: string,
  data: T,
  source?: string
): Promise<void> {
  const redis = getRedisClient();

  const event: NexusEvent<T> = {
    type: eventType,
    channel,
    data,
    timestamp: Math.floor(Date.now() / 1000),
    source,
  };

  await redis.publish(channel, JSON.stringify(event));
}
