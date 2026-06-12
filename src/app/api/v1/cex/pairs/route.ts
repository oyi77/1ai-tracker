/**
 * GET /api/v1/cex/pairs - Trading Pairs from All Exchanges
 * 
 * Query parameters:
 *  - symbol: Filter by symbol (e.g., "BTCUSDT")
 *  - exchange: Filter by exchange (e.g., "binance")
 *  - type: Filter by pair type (spot|linear|inverse)
 *  - min_volume: Minimum 24h volume in USD
 *  - limit: Max results (default 100)
 */

import { type NextRequest } from "next/server";
import { cexClient } from "@/lib/cex/client";
import { apiSuccess, apiError } from "@/lib/api/response";
import type { CexExchangeId } from "@/lib/cex/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol") || undefined;
    const exchange = request.nextUrl.searchParams.get("exchange") as
      | CexExchangeId
      | undefined;
    const pairType = request.nextUrl.searchParams.get("type") as
      | "spot"
      | "linear"
      | "inverse"
      | undefined;
    const minVolume = parseInt(
      request.nextUrl.searchParams.get("min_volume") || "0"
    );
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");

    let pairs = await cexClient.getPairs({
      symbol,
      exchange,
      pairType,
    });

    // Filter by volume
    if (minVolume > 0) {
      pairs = pairs.filter((p) => p.volumeUsd24h >= minVolume);
    }

    // Sort by volume (descending)
    pairs.sort((a, b) => b.volumeUsd24h - a.volumeUsd24h);

    // Apply limit
    pairs = pairs.slice(0, limit);

    return apiSuccess({
      data: pairs,
      count: pairs.length,
      timestamp: Date.now(),
      filters: {
        symbol,
        exchange,
        pairType,
        minVolume,
        limit,
      },
    });
  } catch (error) {
    console.error("GET /api/v1/cex/pairs error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch pairs"
    );
  }
}
