export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import * as coinpaprika from "@/lib/coinpaprika";
import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  getSignals,
  type Candle,
  type TechnicalSignal,
} from "@/lib/technical-analysis";

// ─── Period → days mapping ────────────────────────────────────

const PERIOD_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const ALL_INDICATORS = ["sma", "ema", "rsi", "macd", "bollinger"] as const;

// ─── Response types ───────────────────────────────────────────

interface OhlcvResponse {
  coin: { id: string; name: string; symbol: string };
  candles: Candle[];
  indicators: {
    sma20?: number[];
    ema12?: number[];
    rsi14?: number[];
    macd?: { macdLine: number[]; signalLine: number[]; histogram: number[] };
    bollinger?: { upper: number[]; middle: number[]; lower: number[] };
  };
  signals: TechnicalSignal[];
}

// ─── Route handler ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const coinId = searchParams.get("coinId");
    if (!coinId) return apiError("Missing required parameter: coinId", 400);

    const periodParam = searchParams.get("period") ?? "30d";
    const days = PERIOD_DAYS[periodParam];
    if (days === undefined) {
      return apiError(`Invalid period '${periodParam}'. Use: 1d, 7d, 30d, 90d`, 400);
    }

    const requestedIndicators = searchParams.get("indicators")
      ? searchParams.get("indicators")!.split(",").map((s) => s.trim().toLowerCase())
      : [...ALL_INDICATORS];

    // Validate requested indicators
    for (const ind of requestedIndicators) {
      if (!(ALL_INDICATORS as readonly string[]).includes(ind)) {
        return apiError(
          `Unknown indicator '${ind}'. Available: ${ALL_INDICATORS.join(", ")}`,
          400
        );
      }
    }

    // Fetch coin metadata + OHLCV data in parallel
    const [ticker, rawOhlcv] = await Promise.all([
      coinpaprika.getTicker(coinId),
      coinpaprika.getOhlcv(coinId, days),
    ]);

    if (!rawOhlcv || rawOhlcv.length === 0) {
      return apiError(`No OHLCV data found for '${coinId}'`, 404);
    }

    // Map to Candle[]
    const candles: Candle[] = rawOhlcv.map((bar) => ({
      time: new Date(bar.time_open).getTime(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));

    // Extract price arrays once
    const closes = candles.map((c) => c.close);

    // Compute only requested indicators
    const indicators: OhlcvResponse["indicators"] = {};

    if (requestedIndicators.includes("sma")) {
      indicators.sma20 = SMA(closes, 20);
    }
    if (requestedIndicators.includes("ema")) {
      indicators.ema12 = EMA(closes, 12);
    }
    if (requestedIndicators.includes("rsi")) {
      indicators.rsi14 = RSI(closes, 14);
    }
    if (requestedIndicators.includes("macd")) {
      indicators.macd = MACD(closes);
    }
    if (requestedIndicators.includes("bollinger")) {
      indicators.bollinger = BollingerBands(closes);
    }

    // Generate trading signals from all indicators regardless of selection
    const signals = getSignals(candles);

    const response: OhlcvResponse = {
      coin: { id: ticker.id, name: ticker.name, symbol: ticker.symbol },
      candles,
      indicators,
      signals,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error("GET /api/v1/ohlcv error:", error);
    return apiError("Failed to fetch data", 502);
  }
}
