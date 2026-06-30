// ─────────────────────────────────────────────────────────────
// GET /api/v1/risk-intel — Credit Risk + Miner Flow + Narrative
// Zero API keys — all public endpoints
// ─────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { fetchCreditRisk } from "@/lib/modules/defi/credit-risk";
import { fetchMinerFlow } from "@/lib/modules/chain/miner-flow";
import { fetchNarrativeRotation } from "@/lib/modules/derived/narrative-rotation";

export const dynamic = "force-dynamic";

let cachedCredit: unknown = null;
let cachedMiner: unknown = null;
let cachedNarrative: unknown = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") ?? "all";
    const now = Date.now();

    if (action === "credit" || action === "all") {
      if (!cachedCredit || now - cacheTs > CACHE_TTL) {
        cachedCredit = await fetchCreditRisk();
      }
    }

    if (action === "miner" || action === "all") {
      if (!cachedMiner || now - cacheTs > CACHE_TTL) {
        cachedMiner = await fetchMinerFlow();
      }
    }

    if (action === "narrative" || action === "all") {
      if (!cachedNarrative || now - cacheTs > CACHE_TTL) {
        cachedNarrative = await fetchNarrativeRotation();
      }
    }

    cacheTs = now;

    const data = action === "credit"
      ? { creditRisk: cachedCredit }
      : action === "miner"
      ? { minerFlow: cachedMiner }
      : action === "narrative"
      ? { narrative: cachedNarrative }
      : { creditRisk: cachedCredit, minerFlow: cachedMiner, narrative: cachedNarrative };

    return cacheHeaders(apiSuccess(data), 300);
  } catch (error) {
    console.error("GET /api/v1/risk-intel error:", error);
    return apiError("Failed to fetch risk intelligence", 502);
  }
}
