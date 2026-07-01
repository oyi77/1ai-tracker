// ─────────────────────────────────────────────────────────────
// GET /api/v1/ohlcv — Unified OHLCV endpoint
// Auto-routes to Binance (crypto) or Yahoo Finance (equities/forex)
// Zero API keys
// ─────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { fetchOHLCV, listOHLCVProviders } from "@/lib/modules/market";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") ?? "ohlcv";

    if (action === "providers") {
      const providers = await listOHLCVProviders();
      return cacheHeaders(apiSuccess({ providers }), 60);
    }

    const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
    const interval = (request.nextUrl.searchParams.get("interval") ?? "1h") as '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10);

    const result = await fetchOHLCV({ symbol, interval, limit: Math.min(limit, 1000) });

    return cacheHeaders(apiSuccess({
      candles: result.candles,
      symbol: result.symbol,
      interval: result.interval,
      provider: result.provider,
      count: result.candles.length,
    }), 15);
  } catch (error) {
    console.error("GET /api/v1/ohlcv error:", error);
    return apiError("Failed to fetch OHLCV data", 502);
  }
}
