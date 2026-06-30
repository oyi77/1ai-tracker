export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { calculateAllCorrelations } from "@/lib/modules/derived/cross-asset-correlation";

// In-memory cache (30s)
let cachedCorrelations: unknown[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();
    if (cachedCorrelations && now - cacheTimestamp < CACHE_TTL) {
      const r = apiSuccess(cachedCorrelations);
      r.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return r;
    }

    const correlations = await calculateAllCorrelations();
    cachedCorrelations = correlations;
    cacheTimestamp = now;

    const r = apiSuccess(correlations);
    r.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return r;
  } catch (error) {
    console.error("GET /api/v1/correlations error:", error);
    return apiError("Internal server error", 500);
  }
}
