export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const sort = searchParams.get("sort") ?? "totalVolume";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (source) where.source = source;

    const [data, total] = await Promise.all([
      prisma.predictionMarket.findMany({
        where,
        include: { trades: { take: 5, orderBy: { timestamp: "desc" } } },
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.predictionMarket.count({ where }),
    ]);

    return apiSuccess(data, { page, pageSize, total, hasMore: page * pageSize < total });
  } catch (error) {
    console.error("GET /api/predictions error:", error);
    return apiError("Failed to fetch predictions", 500);
  }
}
