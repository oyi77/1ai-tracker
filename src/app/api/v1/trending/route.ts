export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import * as geckoterminal from "@/lib/geckoterminal";
import * as coinpaprika from "@/lib/coinpaprika";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source") ?? "geckoterminal";
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const network = searchParams.get("network") ?? undefined;

    switch (source) {
      case "geckoterminal": {
        const pools = await geckoterminal.getFormattedTrending(limit);
        return apiSuccess(pools, { total: pools.length });
      }

      case "coinpaprika": {
        const tickers = await coinpaprika.getTickers(limit);
        return apiSuccess(
          tickers.map((t) => ({
            name: t.name,
            symbol: t.symbol,
            rank: t.rank,
            price: t.price,
            change24h: t.change24h,
            change7d: t.change7d,
            marketCap: t.marketCap,
            volume24h: t.volume24h,
          })),
          { total: tickers.length }
        );
      }

      case "new-pools": {
        const pools = await geckoterminal.getNewPools(network, limit);
        return apiSuccess(pools, { total: pools.length });
      }

      default:
        return apiError(`Unknown source: ${source}. Use: geckoterminal, coinpaprika, new-pools`, 400);
    }
  } catch (error) {
    console.error("GET /api/v1/trending error:", error);
    return apiError("Failed to fetch trending data", 502);
  }
}
