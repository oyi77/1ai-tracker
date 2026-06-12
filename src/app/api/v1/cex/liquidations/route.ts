/**
 * GET /api/v1/cex/liquidations - Whale Liquidations
 *
 * Returns recent liquidations across all enabled CEX sources.
 * Focuses on whale-scale liquidations ($100K+ by default).
 *
 * Query parameters:
 *  - hours: Lookback window (default 24)
 *  - min_usd: Minimum liquidation value (default 100000)
 *  - whale_only: Only whale-tier liquidations (default false, $1M+)
 *  - exchanges: Filter by exchange (comma-separated)
 *  - sides: Filter by side (long, short; comma-separated)
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
    const { searchParams } = request.nextUrl;

    const hours = Math.min(168, Math.max(1, Number(searchParams.get("hours") ?? 24)));
    const minUsd = Number(searchParams.get("min_usd") ?? 100000);
    const whaleOnly = searchParams.get("whale_only") === "true";
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 100)));

    const exchangesParam = searchParams.get("exchanges");
    const exchanges = exchangesParam
      ? (exchangesParam.split(",").map((e) => e.trim()) as CexExchangeId[])
      : undefined;

    const sidesParam = searchParams.get("sides");
    const sides = sidesParam
      ? (sidesParam.split(",").map((s) => s.trim()) as ("long" | "short")[])
      : undefined;

    let liquidations;

    if (whaleOnly) {
      liquidations = await cexClient.getWhaleLiquidations({ hours, minUsd: minUsd * 10 });
    } else {
      liquidations = await cexClient.getLiquidations({ hours, minUsd, exchanges, sides });
    }

    // Apply limit
    liquidations = liquidations.slice(0, limit);

    // Compute aggregates
    const totalValueUsd = liquidations.reduce((sum, l) => sum + l.estimatedValueUsd, 0);
    const longLiqs = liquidations.filter((l) => l.side === "long");
    const shortLiqs = liquidations.filter((l) => l.side === "short");
    const whaleLiqs = liquidations.filter((l) => l.isWhaleLiquidation);

    const byExchange: Record<string, { count: number; totalUsd: number }> = {};
    for (const l of liquidations) {
      if (!byExchange[l.exchange]) byExchange[l.exchange] = { count: 0, totalUsd: 0 };
      byExchange[l.exchange].count++;
      byExchange[l.exchange].totalUsd += l.estimatedValueUsd;
    }

    return apiSuccess({
      data: liquidations,
      aggregates: {
        totalCount: liquidations.length,
        totalValueUsd,
        longCount: longLiqs.length,
        shortCount: shortLiqs.length,
        whaleCount: whaleLiqs.length,
        byExchange,
      },
      params: { hours, minUsd, whaleOnly, exchanges: exchanges ?? "all", sides: sides ?? "all", limit },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("GET /api/v1/cex/liquidations error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch liquidations"
    );
  }
}
