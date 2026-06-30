import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { computeIntelligenceScore } from "@/lib/modules/derived/intelligence-score";
import { cacheGet } from "@/lib/data-refresher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let score = await cacheGet<Awaited<ReturnType<typeof computeIntelligenceScore>>>('score:data')
    if (!score) score = await computeIntelligenceScore()
    return cacheHeaders(apiSuccess(score), 15);
  } catch (error) {
    console.error("GET /api/v1/intelligence-score error:", error);
    return apiError("Failed to compute intelligence score", 502);
  }
}
