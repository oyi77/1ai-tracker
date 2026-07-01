// ─────────────────────────────────────────────────────────────
// GET /api/v1/dev-activity — Crypto developer activity
// npm download trends for blockchain packages
// Zero API keys — public npm registry API
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { fetchDevActivity } from "@/lib/modules/dev/dev-activity";

export const dynamic = "force-dynamic";

let cached: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 min

export async function GET() {
  try {
    const now = Date.now();
    if (!cached || now - cacheTs > CACHE_TTL) {
      cached = await fetchDevActivity();
      cacheTs = now;
    }
    return cacheHeaders(apiSuccess(cached), 900);
  } catch (error) {
    console.error("GET /api/v1/dev-activity error:", error);
    return apiError("Failed to fetch dev activity", 502);
  }
}
