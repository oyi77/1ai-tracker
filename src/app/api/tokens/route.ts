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
    const sort = searchParams.get("sort") ?? "marketCap";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const search = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (chain) where.chain = chain;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { symbol: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.token.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.token.count({ where }),
    ]);

    return apiSuccess(data, { page, pageSize, total, hasMore: page * pageSize < total });
  } catch (error) {
    console.error("GET /api/tokens error:", error);
    return apiError("Failed to fetch tokens", 500);
  }
}
