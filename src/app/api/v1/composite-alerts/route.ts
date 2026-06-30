// ─────────────────────────────────────────────────────────────
// GET /api/v1/composite-alerts — Cross-module compound signals
// Combines ETF, derivatives, sentiment, credit, miner, narrative
// Zero API keys — all public endpoints
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { evaluateCompositeSignals } from "@/lib/modules/derived/composite-signals";

export const dynamic = "force-dynamic";

let cachedSignals: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (!cachedSignals || now - cacheTs > CACHE_TTL) {
      cachedSignals = await evaluateCompositeSignals();
      cacheTs = now;
    }

    return cacheHeaders(apiSuccess({ signals: cachedSignals }), 300);
  } catch (error) {
    console.error("GET /api/v1/composite-alerts error:", error);
    return apiError("Failed to evaluate composite signals", 502);
  }
}
