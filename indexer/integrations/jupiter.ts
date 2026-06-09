// ─────────────────────────────────────────────────────────────
// Jupiter Price API for the indexer sidecar
// Free, no auth — Solana token pricing with in-memory cache
// Uses shared HTTP client
// ─────────────────────────────────────────────────────────────

import { type IntegrationConfig } from "./config";
import { fetchJson } from "./http-client";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const CACHE_TTL_MS = 30_000; // 30 seconds

interface JupiterPriceEntry {
  id: string;
  type: string;
  price: string;
}

interface PriceCacheEntry {
  price: number;
  fetchedAt: number;
}

// Runtime cache — prices are hot data, Map is the right structure
const priceCache = new Map<string, PriceCacheEntry>();

export async function getTokenPrices(
  config: IntegrationConfig,
  ids: string[]
): Promise<Record<string, number>> {
  const now = Date.now();
  const uncached = ids.filter((id) => {
    const entry = priceCache.get(id);
    return !entry || now - entry.fetchedAt > CACHE_TTL_MS;
  });

  if (uncached.length > 0) {
    try {
      const data = await fetchJson<{ data?: Record<string, JupiterPriceEntry> }>(
        `${config.jupiter.priceUrl}?ids=${uncached.join(",")}`
      );

      const entries = data.data ?? {};
      for (const [id, entry] of Object.entries(entries)) {
        priceCache.set(id, { price: parseFloat(entry.price), fetchedAt: now });
      }
    } catch (err) {
      console.warn("[jupiter] price fetch failed:", (err as Error).message);
    }
  }

  const result: Record<string, number> = {};
  for (const id of ids) {
    const entry = priceCache.get(id);
    if (entry) result[id] = entry.price;
  }
  return result;
}

export async function getSolPrice(config: IntegrationConfig): Promise<number> {
  const prices = await getTokenPrices(config, [SOL_MINT]);
  return prices[SOL_MINT] ?? 0;
}

export async function healthCheck(config: IntegrationConfig): Promise<{
  ok: boolean;
  solPrice?: number;
  error?: string;
}> {
  try {
    const solPrice = await getSolPrice(config);
    return { ok: true, solPrice };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
