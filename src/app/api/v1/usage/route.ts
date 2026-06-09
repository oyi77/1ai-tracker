export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getUsage } from "@/middleware";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiError("Missing API key", 401);
    }

    const key = authHeader.slice(7);
    const usage = getUsage(key);

    if (!usage) {
      return apiSuccess({
        totalCalls: 0,
        lastCalledAt: null,
        endpoints: {},
        message: "No usage recorded yet for this API key",
      });
    }

    return apiSuccess({
      totalCalls: usage.totalCalls,
      lastCalledAt: new Date(usage.lastCalledAt).toISOString(),
      endpoints: usage.endpoints,
      topEndpoints: Object.entries(usage.endpoints)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
    });
  } catch (error) {
    console.error("GET /api/v1/usage error:", error);
    return apiError("Failed to fetch usage", 500);
  }
}
