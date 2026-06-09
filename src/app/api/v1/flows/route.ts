export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const chain = searchParams.get("chain");
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 100)));

    const where: Record<string, unknown> = {};
    if (chain) where.chain = chain;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit + 1,
      include: {
        wallet: { select: { address: true, entityId: true, entity: { select: { name: true, type: true } } } },
      },
    });

    const hasMore = transactions.length > limit;
    const sliced = hasMore ? transactions.slice(0, limit) : transactions;

    // Aggregate flows by entity pairs
    const flowMap = new Map<string, { from: string; to: string; totalUsd: number; count: number }>();
    for (const tx of sliced) {
      const fromEntity = tx.wallet.entity?.name ?? tx.fromWallet.slice(0, 10);
      const toEntity = tx.toWallet.slice(0, 10);
      const key = `${fromEntity}->${toEntity}`;
      const existing = flowMap.get(key);
      if (existing) {
        existing.totalUsd += tx.amountUsd;
        existing.count++;
      } else {
        flowMap.set(key, { from: fromEntity, to: toEntity, totalUsd: tx.amountUsd, count: 1 });
      }
    }

    const flows = Array.from(flowMap.values()).sort((a, b) => b.totalUsd - a.totalUsd);

    return apiSuccess(flows, { pageSize: flows.length, hasMore });
  } catch (error) {
    console.error("GET /api/v1/flows error:", error);
    return apiError("Internal server error", 500);
  }
});
