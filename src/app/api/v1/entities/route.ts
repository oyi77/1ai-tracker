export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response";
import { validateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return apiError("Unauthorized", 401);

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, remaining } = await checkRateLimit(ip);
  if (!allowed) return apiError("Rate limit exceeded", 429);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const cursor = searchParams.get("cursor");
  const type = searchParams.get("type");
  const chain = searchParams.get("chain");
  const sort = searchParams.get("sort") || "totalUsdValue";
  const order = searchParams.get("order") || "desc";

  const where: any = {};
  if (type) where.type = type;
  if (chain) where.chains = { has: chain };

  const entities = await prisma.entity.findMany({
    where,
    take: pageSize,
    skip: cursor ? 1 : (page - 1) * pageSize,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { [sort]: order },
    include: { wallets: { select: { address: true, chain: true } } },
  });

  const total = await prisma.entity.count({ where });

  return apiPaginated(entities, total, page, pageSize);
}
