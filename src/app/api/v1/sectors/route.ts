import { apiSuccess, apiError } from "@/lib/api/response";
import * as coinpaprika from "@/lib/coinpaprika";

export const dynamic = "force-dynamic";
export const revalidate = 120; // 2 minutes

const SECTORS = [
  {
    id: "layer-1",
    name: "Layer 1",
    coins: ["btc-bitcoin", "eth-ethereum", "sol-solana", "avax-avalanche", "ada-cardano"],
  },
  {
    id: "defi",
    name: "DeFi",
    coins: ["aave-new", "uni-uniswap", "pendle-pendle", "mkr-maker", "jup-jupiter"],
  },
  {
    id: "layer-2",
    name: "Layer 2",
    coins: ["matic-polygon", "arb-arbitrum", "op-optimism", "strk-starknet", "mnt-mantle"],
  },
  {
    id: "ai",
    name: "AI",
    coins: ["tao-bittensor", "rndr-render-token", "fetch-ai", "ocean-ocean-protocol", "akt-akash-network"],
  },
  {
    id: "memes",
    name: "Memes",
    coins: ["doge-dogecoin", "shib-shiba-inu", "pepe-pepe", "bonk-bonk", "floki-floki-inu"],
  },
  {
    id: "gaming",
    name: "Gaming",
    coins: ["imx-immutable-x", "gala-gala", "sand-the-sandbox", "axs-axie-infinity", "ilv-illuvium"],
  },
  {
    id: "privacy",
    name: "Privacy",
    coins: ["xmr-monero", "zec-zcash", "scrt-secret", "rose-oasis-network", "iron-iron-fish-coin"],
  },
  {
    id: "infra",
    name: "Infra",
    coins: ["link-chainlink", "grt-the-graph", "fil-filecoin", "ar-arweave", "hnt-helium"],
  },
] as const;

interface SectorToken {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
}

interface SectorData {
  id: string;
  name: string;
  tokens: SectorToken[];
  avgChange24h: number;
  totalMarketCap: number;
  topGainer: { name: string; symbol: string; change24h: number };
  topLoser: { name: string; symbol: string; change24h: number };
}

export async function GET() {
  try {
    // Single bulk fetch — avoids 40 individual API calls and rate limits
    const allTickers = await coinpaprika.getTickers(500);
    const tickerMap = new Map<string, coinpaprika.Ticker>();
    for (const t of allTickers) tickerMap.set(t.id, t);

    // Build sector data
    const sectors: SectorData[] = SECTORS.map((sector) => {
      const tokens: SectorToken[] = [];
      for (const coinId of sector.coins) {
        const t = tickerMap.get(coinId);
        if (t) {
          tokens.push({
            name: t.name,
            symbol: t.symbol,
            price: t.price,
            change24h: t.change24h,
            marketCap: t.marketCap,
          });
        }
      }

      const avgChange24h =
        tokens.length > 0
          ? tokens.reduce((sum, t) => sum + t.change24h, 0) / tokens.length
          : 0;

      const totalMarketCap = tokens.reduce((sum, t) => sum + t.marketCap, 0);

      const sorted = [...tokens].sort((a, b) => b.change24h - a.change24h);
      const topGainer = sorted[0] ?? { name: "", symbol: "", change24h: 0 };
      const topLoser = sorted[sorted.length - 1] ?? { name: "", symbol: "", change24h: 0 };

      return {
        id: sector.id,
        name: sector.name,
        tokens,
        avgChange24h,
        totalMarketCap,
        topGainer: { name: topGainer.name, symbol: topGainer.symbol, change24h: topGainer.change24h },
        topLoser: { name: topLoser.name, symbol: topLoser.symbol, change24h: topLoser.change24h },
      };
    });

    // Compute summary
    const totalMarketCap = sectors.reduce((sum, s) => sum + s.totalMarketCap, 0);
    const sortedByChange = [...sectors].sort((a, b) => b.avgChange24h - a.avgChange24h);
    const bestSector = sortedByChange[0]?.name ?? "";
    const worstSector = sortedByChange[sortedByChange.length - 1]?.name ?? "";

    return apiSuccess({
      sectors,
      summary: { totalMarketCap, bestSector, worstSector },
    });
  } catch (error) {
    console.error("GET /api/v1/sectors error:", error);
    return apiError("Failed to fetch sector data", 502);
  }
}
