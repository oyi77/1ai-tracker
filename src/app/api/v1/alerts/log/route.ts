import { type NextRequest } from "next/server";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";
import { getAlertLog } from "@/lib/modules/derived/alert-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10)));
    const log = getAlertLog(limit);
    return cacheHeaders(apiSuccess({ log, count: log.length }), 5);
  } catch (error) {
    console.error("GET /api/v1/alerts/log error:", error);
    return apiError("Internal server error", 500);
  }
}
