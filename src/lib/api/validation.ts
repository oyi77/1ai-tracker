import { z } from "zod";

// ─── Common schemas ────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ChainFilterSchema = z.object({
  chain: z.string().optional(),
});

export const SortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Route-specific schemas ────────────────────────────────

export const TokensQuerySchema = PaginationSchema.merge(ChainFilterSchema).merge(SortSchema).extend({
  q: z.string().optional(),
});

export const EntitiesQuerySchema = PaginationSchema.merge(ChainFilterSchema).extend({
  type: z.string().optional(),
});

export const SmartMoneyQuerySchema = PaginationSchema.extend({
  category: z.string().optional(),
});

export const DeFiQuerySchema = PaginationSchema.merge(ChainFilterSchema).merge(SortSchema).extend({
  category: z.string().optional(),
});

export const PredictionsQuerySchema = PaginationSchema.extend({
  category: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
});

export const AlertsQuerySchema = z.object({
  userId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const AlertsCreateSchema = z.object({
  userId: z.string().min(1),
  triggerType: z.string().min(1),
  conditions: z.record(z.string(), z.unknown()),
});

export const DeFiLlamaQuerySchema = z.object({
  action: z.enum(["protocols", "yields", "chains", "chain-tvl", "stablecoins", "dex-volumes", "bridges", "fees", "health"]),
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  stablecoin: z.coerce.boolean().default(false),
});

export const WalletsQuerySchema = PaginationSchema.merge(ChainFilterSchema).extend({
  entityId: z.string().optional(),
  minRisk: z.coerce.number().optional(),
  maxRisk: z.coerce.number().optional(),
});

// ─── Validation helper ─────────────────────────────────────

export function parseQuery<T extends z.ZodSchema>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

export function parseBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): z.infer<T> {
  return schema.parse(body);
}
