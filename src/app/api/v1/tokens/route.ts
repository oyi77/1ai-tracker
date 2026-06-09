export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response";
import { validateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

const TOKEN_SORT_FIELDS = new Set(["smartMoneyFlow", "volume24h", "marketCap", "holderCount", "createdAt"]);

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) return apiError("Unauthorized", 401);

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) return apiError("Rate limit exceeded", 429);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));
    const chain = searchParams.get("chain");
    const sort = searchParams.get("sort") || "smartMoneyFlow";
    const order = searchParams.get("order") || "desc";

    if (!TOKEN_SORT_FIELDS.has(sort)) return apiError(`Invalid sort field`, 400);
    if (!["asc", "desc"].includes(order)) return apiError(`Invalid order`, 400);

    const where: any = {};
    if (chain) where.chain = chain;

    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { [sort]: order },
      }),
      prisma.token.count({ where }),
    ]);

    return apiPaginated(tokens, total, page, pageSize);
  } catch (error) {
    console.error("GET /api/v1/tokens error:", error);
    return apiError("Internal server error", 500);
  }
}