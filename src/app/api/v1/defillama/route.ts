export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import * as defillama from "@/lib/defillama";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "protocols";
    const chain = searchParams.get("chain") ?? undefined;
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

    switch (action) {
      case "protocols": {
        const data = await defillama.getTopDeFiProtocols(chain, limit);
        return apiSuccess(data, { total: data.length });
      }

      case "yields": {
        const stablecoinOnly = searchParams.get("stablecoin") === "true";
        const data = await defillama.getTopYieldPools(chain, stablecoinOnly, limit);
        return apiSuccess(data, { total: data.length });
      }

      case "chains": {
        const data = await defillama.getChainsTvl();
        return apiSuccess(data);
      }

      case "chain-tvl": {
        if (!chain) return apiError("chain parameter required", 400);
        const data = await defillama.getChainTvl(chain);
        return apiSuccess(data);
      }

      case "stablecoins": {
        const data = await defillama.getStablecoins();
        return apiSuccess(data.peggedAssets.slice(0, limit));
      }

      case "dex-volumes": {
        const data = chain
          ? await defillama.getDexVolumeByChain(chain)
          : await defillama.getDexVolumes();
        return apiSuccess(data);
      }

      case "bridges": {
        const data = chain
          ? await defillama.getBridgeVolumeByChain(chain)
          : await defillama.getBridgeOverview();
        return apiSuccess(data);
      }

      case "fees": {
        const data = await defillama.getFeesOverview();
        return apiSuccess(data);
      }

      case "health": {
        const data = await defillama.healthCheck();
        return apiSuccess(data);
      }

      default:
        return apiError(`Unknown action: ${action}. Use: protocols, yields, chains, chain-tvl, stablecoins, dex-volumes, bridges, fees, health`, 400);
    }
  } catch (error) {
    console.error("GET /api/v1/defillama error:", error);
    return apiError("DeFiLlama request failed", 502);
  }
}
