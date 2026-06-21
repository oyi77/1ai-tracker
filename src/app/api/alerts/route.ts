export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "default";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const skip = (page - 1) * pageSize;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.alert.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    data: alerts,
    meta: { page, pageSize, total, hasMore: skip + alerts.length < total },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId = "default", triggerType, conditions } = body;

  const alert = await prisma.alert.create({
    data: { userId, triggerType, conditions },
  });

  return NextResponse.json({ data: alert }, { status: 201 });
}
