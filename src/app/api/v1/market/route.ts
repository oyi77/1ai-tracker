import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { type MarketOverview, getMarketOverview } from "@/lib/cross-market";

export const dynamic = "force-dynamic";

type Section = "forex" | "commodities" | "crypto" | "all";

// ─── Cache ─────────────────────────────────────────────────

let cachedData: MarketOverview | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// ─── Handler ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const section = (request.nextUrl.searchParams.get("section") ?? "all") as Section;
    const validSections: Section[] = ["forex", "commodities", "crypto", "all"];
    if (!validSections.includes(section)) {
      return apiError(`Invalid section. Must be one of: ${validSections.join(", ")}`);
    }

    const now = Date.now();
    if (!cachedData || now - cacheTimestamp >= CACHE_TTL_MS) {
      cachedData = await getMarketOverview();
      cacheTimestamp = now;
    }

    if (section === "all") {
      return apiSuccess(cachedData);
    }

    // Return only the requested section
    if (section === "forex") {
      return apiSuccess({ forex: cachedData.forex, timestamp: cachedData.timestamp });
    }
    if (section === "commodities") {
      return apiSuccess({ commodities: cachedData.commodities, timestamp: cachedData.timestamp });
    }
    if (section === "crypto") {
      return apiSuccess({ crypto: cachedData.crypto, timestamp: cachedData.timestamp });
    }

    return apiSuccess(cachedData);
  } catch (error) {
    console.error("GET /api/v1/market error:", error);
    return apiError("Failed to fetch market overview", 502);
  }
}
