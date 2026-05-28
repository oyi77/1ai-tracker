export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "score";
  const order = searchParams.get("order") || "desc";

  const where: Record<string, unknown> = {};
  if (category) where.category = category;

  const [wallets, total] = await Promise.all([
    prisma.smartMoneyWallet.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order as "asc" | "desc" },
    }),
    prisma.smartMoneyWallet.count({ where }),
  ]);

  return NextResponse.json({
    data: wallets,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
