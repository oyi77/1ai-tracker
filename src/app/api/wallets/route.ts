export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const chain = searchParams.get("chain");
    const entityId = searchParams.get("entityId");
    const minRisk = searchParams.get("minRisk");
    const maxRisk = searchParams.get("maxRisk");

    const where: Record<string, unknown> = {};
    if (chain) where.chain = chain;
    if (entityId) where.entityId = entityId;
    if (minRisk || maxRisk) {
      where.riskScore = {
        ...(minRisk ? { gte: Number(minRisk) } : {}),
        ...(maxRisk ? { lte: Number(maxRisk) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          entity: { select: { name: true, type: true } },
          holdings: { include: { token: { select: { symbol: true, price: true } } }, take: 10 },
        },
        orderBy: { lastSeen: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wallet.count({ where }),
    ]);

    return apiSuccess(data, { page, pageSize, total, hasMore: page * pageSize < total });
  } catch (error) {
    console.error("GET /api/wallets error:", error);
    return apiError("Failed to fetch wallets", 500);
  }
}
