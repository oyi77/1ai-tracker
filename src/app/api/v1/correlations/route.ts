export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getCorrelations, updateCorrelations } from "@/lib/modules/derived/correlation-engine";

export async function GET(_request: NextRequest) {
  try {
    await updateCorrelations();
    const correlations = getCorrelations();
    return apiSuccess(correlations);
  } catch (error) {
    console.error("GET /api/v1/correlations error:", error);
    return apiError("Internal server error", 500);
  }
}
