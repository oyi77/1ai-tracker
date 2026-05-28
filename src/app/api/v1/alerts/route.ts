export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const isActive = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (isActive !== null) where.isActive = isActive === "true";

    const data = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(data, { pageSize: data.length, hasMore: false });
  } catch (error) {
    console.error("GET /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { userId, triggerType, conditions } = body;

    if (!userId || !triggerType || !conditions) {
      return apiError("Missing required fields: userId, triggerType, conditions");
    }

    const alert = await prisma.alert.create({
      data: { userId, triggerType, conditions },
    });

    return apiSuccess(alert);
  } catch (error) {
    console.error("POST /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
});
