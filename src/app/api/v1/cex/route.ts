/**
 * GET /api/v1/cex - CEX Status & Metadata
 * 
 * Returns status and metadata for all enabled CEX sources
 */

import { cexClient } from "@/lib/cex/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const [status, rateLimits] = await Promise.all([
      cexClient.getExchangeStatus(),
      Promise.resolve(cexClient.getRateLimitStatus()),
    ]);

    const enabledExchanges = cexClient.getEnabledExchanges();
    const allHealthy = Object.values(status).every(
      (s) => s.status === "operational"
    );

    return apiSuccess({
      exchanges: status,
      enabledExchanges,
      allHealthy,
      rateLimits,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("GET /api/v1/cex error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch CEX status"
    );
  }
}
