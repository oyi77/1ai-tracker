export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { registerAllModules } from "@/lib/modules";

// Commodity symbols grouped by category
const COMMODITY_GROUPS: Record<string, Array<{ symbol: string; name: string }>> = {
  precious_metals: [
    { symbol: "GC=F", name: "Gold" },
    { symbol: "SI=F", name: "Silver" },
    { symbol: "PL=F", name: "Platinum" },
  ],
  energy: [
    { symbol: "CL=F", name: "Crude Oil (WTI)" },
    { symbol: "BZ=F", name: "Brent Crude" },
    { symbol: "NG=F", name: "Natural Gas" },
  ],
  agriculture: [
    { symbol: "ZC=F", name: "Corn" },
    { symbol: "ZS=F", name: "Soybeans" },
    { symbol: "ZW=F", name: "Wheat" },
    { symbol: "KC=F", name: "Coffee" },
    { symbol: "CT=F", name: "Cotton" },
  ],
  metals: [
    { symbol: "HG=F", name: "Copper" },
  ],
};

// 5-min in-memory cache
let cachedCommodities: Record<string, unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();
    if (cachedCommodities && now - cacheTimestamp < CACHE_TTL) {
      return cacheHeaders(apiSuccess(cachedCommodities), 300);
    }

    const registry = registerAllModules();

    // Fetch all commodity quotes in parallel
    const allSymbols = Object.values(COMMODITY_GROUPS).flat();
    const results = await Promise.allSettled(
      allSymbols.map((item) =>
        registry.fetchOne("yahoo-finance", { symbol: item.symbol, action: "quote" })
      ),
    );

    const commodities: Array<Record<string, unknown>> = [];
    for (let i = 0; i < allSymbols.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value?.data) {
        const quote = r.value.data as Record<string, unknown>;
        commodities.push({
          symbol: allSymbols[i].symbol,
          name: allSymbols[i].name,
          price: quote.price ?? quote.regularMarketPrice,
          change: quote.change ?? quote.regularMarketChange,
          changePercent: quote.changePercent ?? quote.regularMarketChangePercent,
          volume: quote.volume ?? quote.regularMarketVolume,
        });
      }
    }

    const data = {
      commodities,
      categories: COMMODITY_GROUPS,
      timestamp: new Date().toISOString(),
    };

    cachedCommodities = data;
    cacheTimestamp = now;

    return cacheHeaders(apiSuccess(data), 300);
  } catch (error) {
    console.error("GET /api/v1/commodities error:", error);
    return apiError("Internal server error", 500);
  }
}
