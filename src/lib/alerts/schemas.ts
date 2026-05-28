import { z } from "zod";

export const WalletMovedCondition = z.object({
  type: z.literal("wallet_moved"),
  address: z.string(),
  minAmountUsd: z.number(),
});

export const SmartMoneyCondition = z.object({
  type: z.literal("smart_money_action"),
  action: z.enum(["Accumulated", "Exited", "Bridged", "Swapped"]),
  minScore: z.number().optional(),
});

export const PredictionThresholdCondition = z.object({
  type: z.literal("prediction_threshold"),
  marketId: z.string(),
  threshold: z.number(),
  direction: z.enum(["above", "below"]),
});

export const AlertCondition = z.discriminatedUnion("type", [
  WalletMovedCondition,
  SmartMoneyCondition,
  PredictionThresholdCondition,
]);

export type WalletMovedCondition = z.infer<typeof WalletMovedCondition>;
export type SmartMoneyCondition = z.infer<typeof SmartMoneyCondition>;
export type PredictionThresholdCondition = z.infer<typeof PredictionThresholdCondition>;
export type AlertCondition = z.infer<typeof AlertCondition>;
