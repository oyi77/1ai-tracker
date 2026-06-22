export const dynamic = "force-dynamic";

import { apiSuccess, apiError } from "@/lib/api/response";
import { getTickers } from "@/lib/coinpaprika";

const STABLECOIN_IDS = new Set([
  "usdt-tether", "usdc-usd-coin", "dai-dai", "busd-binance-usd",
  "tusd-trueusd", "frax-frax", "lusd-liquity-usd", "usdd-usdd",
  "pyusd-paypal-usd", "fdusd-first-digital-usd",
]);

const STABLECOIN_META: Record<string, { name: string; symbol: string }> = {
  "usdt-tether": { name: "Tether", symbol: "USDT" },
  "usdc-usd-coin": { name: "USD Coin", symbol: "USDC" },
  "dai-dai": { name: "Dai", symbol: "DAI" },
  "busd-binance-usd": { name: "Binance USD", symbol: "BUSD" },
  "tusd-trueusd": { name: "TrueUSD", symbol: "TUSD" },
  "frax-frax": { name: "Frax", symbol: "FRAX" },
  "lusd-liquity-usd": { name: "Liquity USD", symbol: "LUSD" },
  "usdd-usdd": { name: "USDD", symbol: "USDD" },
  "pyusd-paypal-usd": { name: "PayPal USD", symbol: "PYUSD" },
  "fdusd-first-digital-usd": { name: "First Digital USD", symbol: "FDUSD" },
};

export async function GET() {
  try {
    // Single bulk fetch via cached client — avoids per-coin rate limits
    const allTickers = await getTickers(500);
    const matched = allTickers.filter((t) => STABLECOIN_IDS.has(t.id));

    const stablecoins = [...STABLECOIN_IDS].map((id) => {
      const t = matched.find((m) => m.id === id);
      const meta = STABLECOIN_META[id];
      if (!t || !meta) {
        return {
          id, name: meta?.name ?? id, symbol: meta?.symbol ?? "?",
          price: 0, deviation: 100, pegStatus: "NO DATA",
          change24h: 0, volume24h: 0, marketCap: 0,
        };
      }
      const price = t.price;
      const deviation = Math.abs(price - 1.0) * 100;
      const pegStatus = deviation < 0.5 ? "ON PEG" : deviation < 2 ? "SLIGHT DEPEG" : "DEPEG";
      return {
        id: t.id, name: meta.name, symbol: meta.symbol,
        price, deviation, pegStatus,
        change24h: t.change24h, volume24h: t.volume24h, marketCap: t.marketCap,
      };
    });

    const totalMarketCap = stablecoins.reduce((s, c) => s + c.marketCap, 0);
    const totalVolume24h = stablecoins.reduce((s, c) => s + c.volume24h, 0);
    const depeggedCount = stablecoins.filter((c) => c.pegStatus === "DEPEG").length;
    const slightDepegCount = stablecoins.filter((c) => c.pegStatus === "SLIGHT DEPEG").length;
    const healthStatus = depeggedCount > 0 ? "WARNING" : slightDepegCount > 0 ? "CAUTION" : "HEALTHY";

    const r = apiSuccess({
      stablecoins,
      summary: { totalMarketCap, totalVolume24h, coinCount: stablecoins.length, depeggedCount: depeggedCount + slightDepegCount, healthStatus },
    })
    r.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    return r
  } catch (error) {
    console.error("GET /api/v1/stablecoins error:", error);
    return apiError("Failed to fetch stablecoin data", 502);
  }
}
