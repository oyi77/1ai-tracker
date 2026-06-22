export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cacheHeaders } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    const wallet = await prisma.wallet.findUnique({
      where: { address },
      include: {
        entity: { select: { id: true, name: true, type: true, verified: true } },
        holdings: {
          include: { token: { select: { symbol: true, name: true, price: true, chain: true } } },
          orderBy: { usdValue: "desc" as const },
          take: 100,
        },
        transactions: {
          orderBy: { timestamp: "desc" as const },
          take: 50,
        },
      },
    });

    if (!wallet) {
    return cacheHeaders(NextResponse.json({ error: "Wallet not found" }, { status: 404 }), 60);
    }

    return cacheHeaders(NextResponse.json({ data: wallet }), 60);
  } catch (error) {
    console.error("GET /api/v1/wallets/[address] error:", error);
    return cacheHeaders(NextResponse.json({ error: "Internal server error" }, { status: 500 }), 60);
  }
}
