/**
 * GET /api/v1/cex/open-interest - Open Interest Data
 *
 * Returns open interest metrics for futures pairs across exchanges.
 *
 * Query parameters:
 *  - symbol: Symbol to query (required, e.g., "BTCUSDT")
 *  - exchange: Filter by exchange (optional)
 *  - limit: Max results (default 50)
 */

import { type NextRequest } from "next/server";
import { cexClient } from "@/lib/cex/client";
import { apiSuccess, apiError } from "@/lib/api/response";
import type { CexExchangeId } from "@/lib/cex/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol");
    const exchange = request.nextUrl.searchParams.get("exchange") as CexExchangeId | undefined;
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)));

    if (!symbol) {
      return apiError("Missing required parameter: symbol");
    }

    const normalized = symbol.toUpperCase().replace(/[-/]/g, "");
    const oiData = await cexClient.getOpenInterest(normalized);

    // Filter by exchange if specified
    let filtered = oiData;
    if (exchange) {
      filtered = filtered.filter((o) => o.exchange === exchange);
    }

    // Sort by timestamp (newest first) and take latest per exchange
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Take latest entry per exchange
    const latestByExchange = new Map<string, (typeof filtered)[number]>();
    for (const entry of filtered) {
      if (!latestByExchange.has(entry.exchange)) {
        latestByExchange.set(entry.exchange, entry);
      }
    }

    const latest = Array.from(latestByExchange.values()).slice(0, limit);
    const totalOiUsd = latest.reduce((sum, o) => sum + o.openInterestUsd, 0);
    const hasSpikes = latest.some((o) => o.isSpike);

    return apiSuccess({
      data: latest,
      aggregates: {
        totalOiUsd,
        exchangeCount: latest.length,
        hasSpikes,
        spikeExchanges: latest.filter((o) => o.isSpike).map((o) => o.exchange),
      },
      params: { symbol: normalized, exchange: exchange ?? "all", limit },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("GET /api/v1/cex/open-interest error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch open interest"
    );
  }
}
