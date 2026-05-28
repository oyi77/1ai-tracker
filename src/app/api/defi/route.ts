export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const chain = searchParams.get("chain");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "tvl";
  const order = searchParams.get("order") || "desc";

  const where: Record<string, unknown> = {};
  if (chain) where.chain = chain;
  if (category) where.category = category;

  const [protocols, total] = await Promise.all([
    prisma.deFiProtocol.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order as "asc" | "desc" },
    }),
    prisma.deFiProtocol.count({ where }),
  ]);

  return NextResponse.json({
    data: protocols,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
