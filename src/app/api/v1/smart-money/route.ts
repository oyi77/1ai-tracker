export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiPaginated } from "@/lib/api/response";
import { validateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return apiError("Unauthorized", 401);

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimit(ip);
  if (!allowed) return apiError("Rate limit exceeded", 429);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "score";
  const order = searchParams.get("order") || "desc";

  const where: any = {};
  if (category) where.category = category;

  const wallets = await prisma.smartMoneyWallet.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { [sort]: order },
  });

  const total = await prisma.smartMoneyWallet.count({ where });

  return apiPaginated(wallets, total, page, pageSize);
}
