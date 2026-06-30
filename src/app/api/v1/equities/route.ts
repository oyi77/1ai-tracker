export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { registerAllModules } from "@/lib/modules";

// Major indices
const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^RUT", name: "Russell 2000" },
  { symbol: "^JKSE", name: "IHSG (Jakarta)" },
];

// 1-min in-memory cache (shorter for equities — more volatile)
let cachedEquities: Record<string, unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const symbolsParam = searchParams.get("symbols");

    const now = Date.now();
    if (cachedEquities && now - cacheTimestamp < CACHE_TTL) {
      return cacheHeaders(apiSuccess(cachedEquities), 60);
    }

    const registry = registerAllModules();

    // Determine which stocks to fetch
    const stockSymbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "JPM", "V"];

    // Fetch stocks + indices in parallel
    const allSymbols = [
      ...stockSymbols.map((s) => ({ symbol: s, isIndex: false })),
      ...INDICES.map((i) => ({ symbol: i.symbol, isIndex: true })),
    ];

    const results = await Promise.allSettled(
      allSymbols.map((item) =>
        registry.fetchOne("yahoo-finance", { symbol: item.symbol, action: "quote" })
      ),
    );

    const stocks: Array<Record<string, unknown>> = [];
    const indices: Array<Record<string, unknown>> = [];

    for (let i = 0; i < allSymbols.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value?.data) {
        const quote = r.value.data as Record<string, unknown>;
        const entry = {
          symbol: allSymbols[i].symbol,
          name: (quote.shortName as string) ?? (quote.longName as string) ?? allSymbols[i].symbol,
          price: quote.price ?? quote.regularMarketPrice,
          change: quote.change ?? quote.regularMarketChange,
          changePercent: quote.changePercent ?? quote.regularMarketChangePercent,
          volume: quote.volume ?? quote.regularMarketVolume,
          marketCap: quote.marketCap,
          sector: quote.sector,
        };
        if (allSymbols[i].isIndex) {
          const meta = INDICES.find((idx) => idx.symbol === allSymbols[i].symbol);
          if (meta) entry.name = meta.name;
          indices.push(entry);
        } else {
          stocks.push(entry);
        }
      }
    }

    const data = {
      stocks,
      indices,
      summary: {
        total: stocks.length + indices.length,
        stocksCount: stocks.length,
        indicesCount: indices.length,
      },
      timestamp: new Date().toISOString(),
    };

    cachedEquities = data;
    cacheTimestamp = now;

    return cacheHeaders(apiSuccess(data), 60);
  } catch (error) {
    console.error("GET /api/v1/equities error:", error);
    return apiError("Internal server error", 500);
  }
}
