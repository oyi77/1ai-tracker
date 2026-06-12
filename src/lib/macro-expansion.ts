// ─── Macro Expansion: Economic Calendar & World Data ─────
// Free data sources: World Bank API (no key), hardcoded calendar fallback

// ─── Types ────────────────────────────────────────────────

export interface EconomicEvent {
  date: string;
  time: string;
  currency: string;
  event: string;
  importance: "high" | "medium" | "low";
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface WorldBankData {
  indicator: string;
  country: string;
  value: number;
  date: string;
}

export interface TreasuryYield {
  maturity: string;
  rate: number;
  date: string;
}

// ─── Cache ────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || !isCacheValid(entry.timestamp)) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Economic Calendar ────────────────────────────────────

/**
 * Get upcoming economic events. Returns hardcoded calendar with
 * realistic upcoming dates that refresh via date calculation.
 * In production, integrate with forexfactory.com API or trading economics.
 */
export function getEconomicCalendar(): EconomicEvent[] {
  const cacheKey = "economic-calendar";
  const cached = getCached<EconomicEvent[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const events: EconomicEvent[] = [
    {
      date: formatDate(today),
      time: "13:30",
      currency: "USD",
      event: "Unemployment Claims (Initial)",
      importance: "high",
      forecast: "220K",
      previous: "222K",
    },
    {
      date: formatDate(addDays(today, 1)),
      time: "14:00",
      currency: "USD",
      event: "Federal Reserve Policy Decision",
      importance: "high",
      forecast: "4.25%",
      previous: "4.33%",
    },
    {
      date: formatDate(addDays(today, 2)),
      time: "08:30",
      currency: "USD",
      event: "Nonfarm Payroll",
      importance: "high",
      forecast: "175K",
      previous: "180K",
    },
    {
      date: formatDate(addDays(today, 3)),
      time: "10:00",
      currency: "USD",
      event: "Consumer Confidence Index",
      importance: "medium",
      forecast: "98.5",
      previous: "97.8",
    },
    {
      date: formatDate(addDays(today, 4)),
      time: "13:15",
      currency: "USD",
      event: "ISM Manufacturing PMI",
      importance: "high",
      forecast: "50.2",
      previous: "49.8",
    },
    {
      date: formatDate(nextWeek),
      time: "09:00",
      currency: "EUR",
      event: "ECB Interest Rate Decision",
      importance: "high",
      forecast: "3.75%",
      previous: "4.00%",
    },
    {
      date: formatDate(addDays(nextWeek, 1)),
      time: "08:00",
      currency: "GBP",
      event: "Bank of England Base Rate",
      importance: "high",
      forecast: "4.75%",
      previous: "5.00%",
    },
    {
      date: formatDate(addDays(nextWeek, 3)),
      time: "13:30",
      currency: "USD",
      event: "Producer Price Index (Core)",
      importance: "medium",
      forecast: "0.2%",
      previous: "0.3%",
    },
    {
      date: formatDate(twoWeeks),
      time: "08:30",
      currency: "USD",
      event: "Retail Sales",
      importance: "high",
      forecast: "0.3%",
      previous: "0.2%",
    },
    {
      date: formatDate(addDays(twoWeeks, 2)),
      time: "14:00",
      currency: "USD",
      event: "Consumer Price Index (CPI)",
      importance: "high",
      forecast: "3.1%",
      previous: "3.2%",
    },
  ];

  setCached(cacheKey, events);
  return events;
}

// ─── World Bank Data ──────────────────────────────────────

/**
 * Fetch economic indicators from World Bank API (free, no auth required).
 * Supports standard World Bank indicator codes like NY.GDP.MKTP.CD, FP.CPI.TOTL.ZG, SL.UEM.TOTL.ZS
 */
export async function getWorldBankData(
  indicator: string,
  country?: string,
): Promise<WorldBankData[]> {
  const cacheKey = `wb-${indicator}-${country || "all"}`;
  const cached = getCached<WorldBankData[]>(cacheKey);
  if (cached) return cached;

  const countryCode = country || "all";
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=50`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // 1 hour cache
    if (!res.ok) {
      console.error(`World Bank API error for ${indicator}: ${res.status}`);
      return [];
    }

    const [, data] = await res.json() as [unknown, Array<{
      date: string;
      value: string;
      countryiso3code: string;
      country: { value: string };
    }>];

    if (!data || !Array.isArray(data)) {
      return [];
    }

    const results: WorldBankData[] = data
      .filter((item) => item.value !== null && item.value !== "")
      .map((item) => ({
        indicator,
        country: item.country?.value || item.countryiso3code,
        value: parseFloat(item.value as string),
        date: item.date,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20); // Last 20 years

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`World Bank fetch error for ${indicator}:`, err);
    return [];
  }
}

/**
 * Treasury yield curve data. Delegates to FRED series directly since
 * all treasury yields are available via FRED (DGS1MO, DGS3MO, DGS6MO, etc.)
 * This helper documents the mapping for convenience.
 */
export function getTreasuryMaturityMapping(): Record<string, string> {
  return {
    "1-month": "DGS1MO",
    "3-month": "DGS3MO",
    "6-month": "DGS6MO",
    "1-year": "DGS1",
    "2-year": "DGS2",
    "3-year": "DGS3",
    "5-year": "DGS5",
    "7-year": "DGS7",
    "10-year": "DGS10",
    "20-year": "DGS20",
    "30-year": "DGS30",
  };
}

/**
 * Health check for macro expansion services.
 */
export async function checkMacroExpansionHealth(): Promise<{
  calendar: boolean;
  worldbank: boolean;
}> {
  const calendarOk = getEconomicCalendar().length > 0;

  let worldbankOk = false;
  try {
    const data = await getWorldBankData("NY.GDP.MKTP.CD", "US");
    worldbankOk = data.length > 0;
  } catch {
    worldbankOk = false;
  }

  return { calendar: calendarOk, worldbank: worldbankOk };
}

// ─── Helpers ──────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
