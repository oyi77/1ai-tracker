export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "default";

  const alerts = await prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: alerts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId = "default", triggerType, conditions } = body;

  const alert = await prisma.alert.create({
    data: { userId, triggerType, conditions },
  });

  return NextResponse.json({ data: alert }, { status: 201 });
}
