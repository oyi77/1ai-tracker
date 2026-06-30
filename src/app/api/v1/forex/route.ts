export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { registerAllModules } from "@/lib/modules";

// 5-min in-memory cache
let cachedRates: Record<string, unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const base = searchParams.get("base") ?? "USD";

    const now = Date.now();
    if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
      return cacheHeaders(apiSuccess(cachedRates), 300);
    }

    const registry = registerAllModules();

    // Try fetching from exchange-rate module, fall back to yahoo-finance forex pairs
    let data: Record<string, unknown>;

    try {
      const result = await registry.fetchOne("exchange-rate", { base });
      data = result?.data as Record<string, unknown> ?? { rates: {}, base, timestamp: new Date().toISOString() };
    } catch {
      // Fallback: fetch major forex pairs via yahoo-finance
      const pairs = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDIDR=X", "USDCNY=X", "AUDUSD=X", "USDCAD=X"];
      const results = await Promise.allSettled(
        pairs.map((symbol) => registry.fetchOne("yahoo-finance", { symbol, action: "quote" })),
      );

      const rates: Record<string, number> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value?.data) {
          const quote = r.value.data as Record<string, unknown>;
          const symbol = (quote.symbol as string) ?? "";
          const price = (quote.price as number) ?? (quote.regularMarketPrice as number);
          if (symbol && price) {
            rates[symbol.replace("=X", "")] = price;
          }
        }
      }

      data = { rates, base, timestamp: new Date().toISOString() };
    }

    cachedRates = data;
    cacheTimestamp = now;

    return cacheHeaders(apiSuccess(data), 300);
  } catch (error) {
    console.error("GET /api/v1/forex error:", error);
    return apiError("Internal server error", 500);
  }
}
