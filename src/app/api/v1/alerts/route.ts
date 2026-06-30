import { type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, cacheHeaders } from "@/lib/api/response";

// ─── Transform: DB shape → Page shape ────────────────────

interface AlertPageShape {
  id: string;
  type: string;
  name: string;
  description: string;
  channel: string;
  enabled: boolean;
  lastTriggered: string | null;
  config: Record<string, unknown>;
}

function dbToPage(dbAlert: {
  id: string;
  triggerType: string;
  name: string | null;
  condition: string | null;
  conditions: unknown;
  isActive: boolean;
  lastFired: Date | null;
}): AlertPageShape {
  const conditions = (dbAlert.conditions as Record<string, unknown>) ?? {};
  return {
    id: dbAlert.id,
    type: dbAlert.triggerType,
    name: dbAlert.name ?? dbAlert.triggerType,
    description: dbAlert.condition ?? "",
    channel: (conditions.channel as string) ?? "telegram",
    enabled: dbAlert.isActive,
    lastTriggered: dbAlert.lastFired?.toISOString() ?? null,
    config: (conditions.config as Record<string, unknown>) ?? {},
  };
}

// ─── GET /api/v1/alerts — List all alerts ────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (active !== null) where.isActive = active === "true";

    const dbAlerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const alerts = dbAlerts.map(dbToPage);
    return cacheHeaders(apiSuccess(alerts), 10);
  } catch (error) {
    console.error("GET /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
}

// ─── POST /api/v1/alerts — Create an alert ───────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, config, channel } = body as {
      type?: string;
      name?: string;
      config?: Record<string, unknown>;
      channel?: string;
    };

    if (!type) return apiError("Missing required field: type", 400);

    const alert = await prisma.alert.create({
      data: {
        userId: "default",
        triggerType: type,
        name: name ?? type,
        condition: buildDescription(type, config ?? {}),
        conditions: { config: config ?? {}, channel: channel ?? "telegram" } as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    return apiSuccess(dbToPage(alert));
  } catch (error) {
    console.error("POST /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
}

// ─── PATCH /api/v1/alerts — Toggle alert (body: { id }) ──

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) return apiError("Missing required field: id", 400);

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return apiError("Alert not found", 404);

    const updated = await prisma.alert.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return apiSuccess(dbToPage(updated));
  } catch (error) {
    console.error("PATCH /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
}

// ─── DELETE /api/v1/alerts?id=xxx ────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return apiError("Missing required param: id", 400);

    await prisma.alert.delete({ where: { id } }).catch(() => undefined);
    return apiSuccess({ deleted: id });
  } catch (error) {
    console.error("DELETE /api/v1/alerts error:", error);
    return apiError("Internal server error", 500);
  }
}

// ─── Helpers ─────────────────────────────────────────────

function buildDescription(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case "price_threshold":
      return `${config.symbol} ${config.direction} $${config.threshold}`;
    case "forex_rate":
      return `${config.pair} ${config.direction} ${config.threshold}`;
    case "macro_event":
      return `${config.event}${config.country ? ` (${config.country})` : ""}`;
    case "wallet_moved":
      return `Whale > $${Number(config.minAmountUsd ?? 0).toLocaleString()}`;
    case "smart_money_action":
      return `Smart money: ${config.action}`;
    case "prediction_threshold":
      return `Market ${config.marketId} ${config.direction} ${config.threshold}`;
    default:
      return type;
  }
}
