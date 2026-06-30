// ─────────────────────────────────────────────────────────────
// GET /api/v1/dex/boosted — DexScreener boosted tokens (proxied)
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";

export const dynamic = "force-dynamic";

let cached: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (!cached || now - cacheTs > CACHE_TTL) {
      const res = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return apiError("DexScreener unavailable", 502);
      cached = await res.json();
      cacheTs = now;
    }
    return cacheHeaders(apiSuccess(cached), 300);
  } catch (error) {
    console.error("GET /api/v1/dex/boosted error:", error);
    return apiError("Failed to fetch boosted tokens", 502);
  }
}
