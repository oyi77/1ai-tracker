export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const type = searchParams.get("type");
    const chain = searchParams.get("chain");
    const sort = searchParams.get("sort") ?? "totalUsdValue";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (chain) where.chains = { has: chain };

    const [data, total] = await Promise.all([
      prisma.entity.findMany({
        where,
        include: { wallets: { select: { address: true, chain: true, labels: true } } },
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.entity.count({ where }),
    ]);

    return apiSuccess(data, { page, pageSize, total, hasMore: page * pageSize < total });
  } catch (error) {
    console.error("GET /api/entities error:", error);
    return apiError("Failed to fetch entities", 500);
  }
}
