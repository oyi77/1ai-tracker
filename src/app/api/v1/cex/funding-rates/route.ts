/**
 * GET /api/v1/cex/funding-rates - Current Funding Rates
 * 
 * Query parameters:
 *  - symbol: Symbol to query (required, e.g., "BTCUSDT")
 *  - stat: Get stats instead of raw rates (stat=true)
 */

import { type NextRequest } from "next/server";
import { cexClient } from "@/lib/cex/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol");
    const getStat = request.nextUrl.searchParams.get("stat") === "true";

    if (!symbol) {
      return apiError("Missing required parameter: symbol");
    }

    if (getStat) {
      const stats = await cexClient.getFundingRateStats(symbol);
      return apiSuccess({
        data: stats,
        timestamp: Date.now(),
      });
    }

    const rates = await cexClient.getFundingRates(symbol);

    return apiSuccess({
      data: rates,
      count: rates.length,
      symbol,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("GET /api/v1/cex/funding-rates error:", error);
    return apiError(
      error instanceof Error
        ? error.message
        : "Failed to fetch funding rates"
    );
  }
}
