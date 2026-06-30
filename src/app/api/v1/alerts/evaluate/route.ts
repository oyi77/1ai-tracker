export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api/response";
import { evaluateCondition, type NexusEvent } from "@/lib/alerts/evaluator";
import { fireAlert } from "@/lib/modules/derived/alert-engine";
import type { AlertCondition } from "@/lib/alerts/schemas";

// ─── GET /api/v1/alerts/evaluate — Check all alerts ──────

export async function GET(_request: NextRequest) {
  try {
    const dbAlerts = await prisma.alert.findMany({
      where: { isActive: true },
    });

    if (dbAlerts.length === 0) {
      return apiSuccess({ evaluated: 0, triggered: 0, results: [] });
    }

    const results: Array<{ id: string; type: string; triggered: boolean; message: string }> = [];
    let triggered = 0;

    for (const dbAlert of dbAlerts) {
      const type = dbAlert.triggerType;
      const conditions = (dbAlert.conditions as Record<string, unknown>) ?? {};
      const config = (conditions.config as Record<string, unknown>) ?? {};

      try {
        const event = await fetchEventForAlert(type, config);
        if (!event) {
          results.push({ id: dbAlert.id, type, triggered: false, message: "No event data available" });
          continue;
        }

        const condition: AlertCondition = {
          type: type as AlertCondition["type"],
          ...config,
        } as AlertCondition;

        const isTriggered = evaluateCondition(condition, event);
        if (isTriggered) {
          triggered++;
          const message = buildTriggerMessage(type, config, event);
          await fireAlert(dbAlert.id, event, message).catch((e) =>
            console.error(`[ALERT] Failed to fire alert ${dbAlert.id}:`, e)
          );
          results.push({ id: dbAlert.id, type, triggered: true, message });
        } else {
          results.push({ id: dbAlert.id, type, triggered: false, message: "Condition not met" });
        }
      } catch (e) {
        results.push({ id: dbAlert.id, type, triggered: false, message: `Error: ${(e as Error).message}` });
      }
    }

    return apiSuccess({ evaluated: dbAlerts.length, triggered, results });
  } catch (error) {
    console.error("GET /api/v1/alerts/evaluate error:", error);
    return apiError("Internal server error", 500);
  }
}

// ─── Fetch current market data for alert evaluation ──────

async function fetchEventForAlert(
  type: string,
  config: Record<string, unknown>,
): Promise<NexusEvent | null> {
  const timestamp = new Date().toISOString();

  switch (type) {
    case "price_threshold": {
      const symbol = config.symbol as string;
      if (!symbol) return null;
      try {
        const { registerAllModules } = await import("@/lib/modules");
        const registry = registerAllModules();
        const result = await registry.fetchOne("yahoo-finance", { symbol, action: "quote" });
        const data = result?.data as Record<string, unknown> | undefined;
        const price = (data?.price as number) ?? (data?.regularMarketPrice as number);
        if (!price) return null;
        return { type: "price_threshold", symbol, price, timestamp };
      } catch {
        return null;
      }
    }

    case "forex_rate": {
      const pair = config.pair as string;
      if (!pair) return null;
      try {
        const { registerAllModules } = await import("@/lib/modules");
        const registry = registerAllModules();
        // Try fetching via exchange-rate module or yahoo
        const symbol = pair.replace("/", "") + "=X";
        const result = await registry.fetchOne("yahoo-finance", { symbol, action: "quote" });
        const data = result?.data as Record<string, unknown> | undefined;
        const rate = (data?.price as number) ?? (data?.regularMarketPrice as number);
        if (!rate) return null;
        return { type: "forex_rate", pair, rate, timestamp };
      } catch {
        return null;
      }
    }

    case "macro_event": {
      // For macro events, we check the calendar API
      return {
        type: "macro_event",
        event: config.event as string ?? "",
        country: config.country as string ?? "US",
        timestamp,
      };
    }

    case "wallet_moved":
    case "smart_money_action":
    case "prediction_threshold":
      // These are event-driven (blockchain indexer pushes) — not polled
      return null;

    default:
      return null;
  }
}

function buildTriggerMessage(type: string, config: Record<string, unknown>, event: NexusEvent): string {
  switch (type) {
    case "price_threshold": {
      const e = event as { price: number };
      return `${config.symbol} at $${e.price.toFixed(2)} — ${config.direction} $${config.threshold}`;
    }
    case "forex_rate": {
      const e = event as { rate: number };
      return `${config.pair} at ${e.rate.toFixed(4)} — ${config.direction} ${config.threshold}`;
    }
    case "macro_event":
      return `Macro event: ${config.event} (${config.country})`;
    default:
      return `Alert triggered: ${type}`;
  }
}
