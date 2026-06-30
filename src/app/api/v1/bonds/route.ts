// ─────────────────────────────────────────────────────────────
// GET /api/v1/bonds — US Treasury yields (proxied)
// Fetches from treasury.gov server-side so client never hits external URLs
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";

export const dynamic = "force-dynamic";

let cached: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour — treasury rates update daily

export async function GET() {
  try {
    const now = Date.now();
    if (!cached || now - cacheTs > CACHE_TTL) {
      const res = await fetch(
        'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve&field_tdr_date_value=2026&page&_format=csv',
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!res.ok) return apiError("Treasury API unavailable", 502);
      const text = await res.text();
      cached = { csv: text };
      cacheTs = now;
    }
    return cacheHeaders(apiSuccess(cached), 3600);
  } catch (error) {
    console.error("GET /api/v1/bonds error:", error);
    return apiError("Failed to fetch bond data", 502);
  }
}
