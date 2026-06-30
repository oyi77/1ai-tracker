export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";

// ─── World Bank fetcher ──────────────────────────────────

interface WorldBankObs {
  date: string;
  value: number | null;
  indicator: { id: string; value: string };
}

const COUNTRIES = [
  { code: "USA", name: "United States", flag: "🇺🇸", wbCode: "US" },
  { code: "CHN", name: "China", flag: "🇨🇳", wbCode: "CN" },
  { code: "JPN", name: "Japan", flag: "🇯🇵", wbCode: "JP" },
  { code: "DEU", name: "Germany", flag: "🇩🇪", wbCode: "DE" },
  { code: "GBR", name: "United Kingdom", flag: "🇬🇧", wbCode: "GB" },
  { code: "IND", name: "India", flag: "🇮🇳", wbCode: "IN" },
  { code: "FRA", name: "France", flag: "🇫🇷", wbCode: "FR" },
  { code: "ITA", name: "Italy", flag: "🇮🇹", wbCode: "IT" },
  { code: "BRA", name: "Brazil", flag: "🇧🇷", wbCode: "BR" },
  { code: "CAN", name: "Canada", flag: "🇨🇦", wbCode: "CA" },
  { code: "KOR", name: "South Korea", flag: "🇰🇷", wbCode: "KR" },
  { code: "AUS", name: "Australia", flag: "🇦🇺", wbCode: "AU" },
  { code: "IDN", name: "Indonesia", flag: "🇮🇩", wbCode: "ID" },
  { code: "MEX", name: "Mexico", flag: "🇲🇽", wbCode: "MX" },
  { code: "SGP", name: "Singapore", flag: "🇸🇬", wbCode: "SG" },
  { code: "THA", name: "Thailand", flag: "🇹🇭", wbCode: "TH" },
  { code: "MYS", name: "Malaysia", flag: "🇲🇾", wbCode: "MY" },
  { code: "PHL", name: "Philippines", flag: "🇵🇭", wbCode: "PH" },
  { code: "VNM", name: "Vietnam", flag: "🇻🇳", wbCode: "VN" },
];

const INDICATORS = [
  { wbId: "NY.GDP.MKTP.CD", name: "GDP", transform: (v: number) => `$${(v / 1e9).toFixed(0)}B` },
  { wbId: "NY.GDP.MKTP.KD.ZG", name: "GDP Growth", transform: (v: number) => `${v.toFixed(1)}%` },
  { wbId: "FP.CPI.TOTL", name: "CPI", transform: (v: number) => v.toFixed(1) },
  { wbId: "FP.CPI.TOTL.ZG", name: "Inflation", transform: (v: number) => `${v.toFixed(1)}%` },
  { wbId: "SL.UEM.TOTL.ZS", name: "Unemployment", transform: (v: number) => `${v.toFixed(1)}%` },
  { wbId: "SP.POP.TOTL", name: "Population", transform: (v: number) => `${(v / 1e6).toFixed(0)}M` },
  { wbId: "FR.INR.RINR", name: "Real Interest", transform: (v: number) => `${v.toFixed(1)}%` },
];

// 30-min in-memory cache
let cachedData: Record<string, Record<string, string>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000;

async function fetchWorldBank(
  wbCode: string,
  indicatorId: string,
): Promise<{ date: string; value: number | null } | null> {
  const url = `https://api.worldbank.org/v2/country/${wbCode}/indicator/${indicatorId}?format=json&per_page=5`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const obs = json[1] as WorldBankObs[];
  const latest = obs.find((o) => o.value !== null);
  return latest ? { date: latest.date, value: latest.value } : null;
}

async function fetchAllMacro(): Promise<Record<string, Record<string, string>>> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) return cachedData;

  const results: Record<string, Record<string, string>> = {};

  // Build all fetch tasks
  const tasks: Array<{ country: string; indicator: string; wbCode: string; wbId: string; transform: (v: number) => string }> = [];
  for (const country of COUNTRIES) {
    results[country.code] = {};
    for (const indicator of INDICATORS) {
      tasks.push({
        country: country.code,
        indicator: indicator.name,
        wbCode: country.wbCode,
        wbId: indicator.wbId,
        transform: indicator.transform,
      });
    }
  }

  // Fetch all in parallel with batch limiting (20 at a time)
  const BATCH_SIZE = 20;
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((t) => fetchWorldBank(t.wbCode, t.wbId)),
    );
    for (let j = 0; j < batch.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled" && result.value?.value != null) {
        results[batch[j].country][batch[j].indicator] = batch[j].transform(result.value.value);
      }
    }
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < tasks.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  cachedData = results;
  cacheTimestamp = now;
  return results;
}

// ─── Handler ─────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const data = await fetchAllMacro();
    const count = Object.values(data).reduce((s, c) => s + Object.keys(c).length, 0);
    const resp = cacheHeaders(
      apiSuccess(data, { total: count }),
      1800,
    );
    return resp;
  } catch (error) {
    console.error("GET /api/v1/global-macro error:", error);
    return apiError("Internal server error", 500);
  }
}
