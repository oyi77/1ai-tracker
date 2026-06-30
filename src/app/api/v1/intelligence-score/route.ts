// ─────────────────────────────────────────────────────────────
// GET /api/v1/intelligence-score — Unified 0-100 intelligence score
// Combines all 14 modules into single composite score
// Zero API keys — all public endpoints
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { computeIntelligenceScore } from "@/lib/modules/derived/intelligence-score";

export const dynamic = "force-dynamic";

let cachedScore: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (!cachedScore || now - cacheTs > CACHE_TTL) {
      cachedScore = await computeIntelligenceScore();
      cacheTs = now;
    }
    return cacheHeaders(apiSuccess(cachedScore), 300);
  } catch (error) {
    console.error("GET /api/v1/intelligence-score error:", error);
    return apiError("Failed to compute intelligence score", 502);
  }
}
