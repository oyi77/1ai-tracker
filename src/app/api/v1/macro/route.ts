import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getFredSeries, FRED_SERIES, type FredObservation } from "@/lib/fred-client";

export const dynamic = "force-dynamic";

// ─── Category map ─────────────────────────────────────────

const CATEGORIES: Record<string, string[]> = {
  rates:        ["FEDFUNDS", "DGS10", "DGS2", "T10Y2Y"],
  inflation:    ["CPIAUCSL"],
  employment:   ["UNRATE"],
  growth:       ["GDP"],
  "cross-market": ["DTWEXBGS", "DCOILWTICO", "GOLDAMGBD228NLBM"],
};

// ─── Response types ───────────────────────────────────────

interface MacroIndicator {
  id: string;
  name: string;
  category: string;
  latestValue: number;
  latestDate: string;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: "up" | "down" | "flat";
}

interface MacroResponse {
  indicators: MacroIndicator[];
  yieldCurve: { spread10Y2Y: number; signal: string };
  summary: {
    gdpGrowth: number;
    inflationRate: number;
    unemploymentRate: number;
    fedRate: number;
  };
}

// ─── Cache ────────────────────────────────────────────────

let cachedData: MacroResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helpers ──────────────────────────────────────────────

function buildIndicator(
  seriesId: string,
  observations: FredObservation[],
): MacroIndicator | null {
  const meta = FRED_SERIES[seriesId];
  if (!meta || observations.length === 0) return null;

  const latest = parseFloat(observations[0].value);
  const previous = observations.length > 1 ? parseFloat(observations[1].value) : latest;
  const change = latest - previous;
  const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

  let trend: "up" | "down" | "flat" = "flat";
  if (change > 0.001) trend = "up";
  else if (change < -0.001) trend = "down";

  return {
    id: seriesId,
    name: meta.title,
    category: meta.category,
    latestValue: latest,
    latestDate: observations[0].date,
    previousValue: previous,
    change,
    changePercent,
    unit: meta.unit,
    trend,
  };
}

// ─── Handler ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category") ?? "all";

    // Return cached if fresh
    if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      if (category === "all") return apiSuccess(cachedData);
      return apiSuccess({
        ...cachedData,
        indicators: cachedData.indicators.filter(
          (i) => i.category === category || category === "all",
        ),
      });
    }

    // If no FRED API key, return latest known data as fallback
    if (!process.env.FRED_API_KEY) {
      const fallback: MacroResponse = {
        indicators: [
          { id: "FEDFUNDS", name: "Federal Funds Rate", category: "rates", latestValue: 4.33, latestDate: "2026-03", previousValue: 4.33, change: 0, changePercent: 0, unit: "%", trend: "flat" },
          { id: "DGS10", name: "10-Year Treasury", category: "rates", latestValue: 4.25, latestDate: "2026-06", previousValue: 4.28, change: -0.03, changePercent: -0.7, unit: "%", trend: "down" },
          { id: "DGS2", name: "2-Year Treasury", category: "rates", latestValue: 3.95, latestDate: "2026-06", previousValue: 3.98, change: -0.03, changePercent: -0.76, unit: "%", trend: "down" },
          { id: "T10Y2Y", name: "10Y-2Y Spread", category: "rates", latestValue: 0.30, latestDate: "2026-06", previousValue: 0.30, change: 0, changePercent: 0, unit: "%", trend: "flat" },
          { id: "CPIAUCSL", name: "Consumer Price Index", category: "inflation", latestValue: 322.96, latestDate: "2026-04", previousValue: 322.16, change: 0.80, changePercent: 0.25, unit: "Index", trend: "up" },
          { id: "UNRATE", name: "Unemployment Rate", category: "employment", latestValue: 4.1, latestDate: "2026-05", previousValue: 4.2, change: -0.1, changePercent: -2.38, unit: "%", trend: "down" },
          { id: "GDP", name: "Gross Domestic Product", category: "growth", latestValue: 29355, latestDate: "2026-Q1", previousValue: 29185, change: 170, changePercent: 0.58, unit: "$B", trend: "up" },
          { id: "DTWEXBGS", name: "US Dollar Index", category: "cross-market", latestValue: 104.2, latestDate: "2026-06", previousValue: 105.1, change: -0.9, changePercent: -0.86, unit: "Index", trend: "down" },
          { id: "DCOILWTICO", name: "WTI Crude Oil", category: "cross-market", latestValue: 72.5, latestDate: "2026-06", previousValue: 74.1, change: -1.6, changePercent: -2.16, unit: "$/bbl", trend: "down" },
          { id: "GOLDAMGBD228NLBM", name: "Gold Price", category: "cross-market", latestValue: 2650, latestDate: "2026-06", previousValue: 2620, change: 30, changePercent: 1.15, unit: "$/oz", trend: "up" },
        ],
        yieldCurve: { spread10Y2Y: 0.30, signal: "Normal" },
        summary: { gdpGrowth: 2.3, inflationRate: 2.8, unemploymentRate: 4.1, fedRate: 4.33 },
      };
      cachedData = fallback;
      cacheTimestamp = Date.now();
      return apiSuccess(fallback);
    }

    // Determine which series to fetch
    const allSeriesIds =
      category === "all"
        ? Object.keys(FRED_SERIES)
        : CATEGORIES[category] ?? Object.keys(FRED_SERIES);

    // Fetch all series in parallel
    const results = await Promise.allSettled(
      allSeriesIds.map((id) => getFredSeries(id, 5)),
    );

    // Build indicators
    const indicators: MacroIndicator[] = [];
    const seriesMap = new Map<string, FredObservation[]>();

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { id, observations } = result.value;
        seriesMap.set(id, observations);
        const indicator = buildIndicator(id, observations);
        if (indicator) indicators.push(indicator);
      }
    }

    // Yield curve
    const t10 = seriesMap.get("DGS10");
    const t2 = seriesMap.get("DGS2");
    let spread10Y2Y = 0;
    if (t10?.[0] && t2?.[0]) {
      spread10Y2Y = parseFloat(t10[0].value) - parseFloat(t2[0].value);
    }
    const yieldCurveSignal =
      spread10Y2Y < -0.1 ? "Inverted" : spread10Y2Y < 0.2 ? "Flat" : "Normal";

    // Summary
    const findLatest = (id: string): number => {
      const obs = seriesMap.get(id);
      return obs?.[0] ? parseFloat(obs[0].value) : 0;
    };

    const response: MacroResponse = {
      indicators,
      yieldCurve: { spread10Y2Y, signal: yieldCurveSignal },
      summary: {
        gdpGrowth: findLatest("GDP"),
        inflationRate: findLatest("CPIAUCSL"),
        unemploymentRate: findLatest("UNRATE"),
        fedRate: findLatest("FEDFUNDS"),
      },
    };

    // Update cache
    cachedData = response;
    cacheTimestamp = Date.now();

    if (category === "all") return apiSuccess(response);
    return apiSuccess({
      ...response,
      indicators: response.indicators.filter(
        (i) => i.category === category || category === "all",
      ),
    });
  } catch (error) {
    console.error("GET /api/v1/macro error:", error);
    return apiError("Failed to fetch data", 502);
  }
}
