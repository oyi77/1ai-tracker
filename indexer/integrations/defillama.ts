// ─────────────────────────────────────────────────────────────
// DeFiLlama Sync Job for the indexer sidecar
// Periodically syncs protocol TVL, yields, and DEX data
// 100% free, no API key needed
// Uses shared Prisma singleton and HTTP client
// ─────────────────────────────────────────────────────────────

import { prisma } from "../db";
import { publishEvent } from "../publisher";
import { fetchWithRetry } from "./http-client";
import { type IntegrationConfig } from "./config";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const TRACKED_CHAINS = ["Ethereum", "Arbitrum", "Base", "Optimism", "Solana"] as const;

interface LlamaProtocol {
  id: string;
  name: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  category?: string;
  mcap?: number;
}

interface LlamaYieldPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  pool: string;
  stablecoin?: boolean;
}

export function startDeFiLlamaSync(config: IntegrationConfig): void {
  console.log("[defillama] starting DeFiLlama sync job (every 10min)");
  syncLoop(config);
}

async function syncLoop(config: IntegrationConfig): Promise<void> {
  try {
    await Promise.allSettled([syncProtocols(config), syncYields(config)]);
  } catch (err) {
    console.error("[defillama] sync error:", (err as Error).message);
  }

  setTimeout(() => syncLoop(config), SYNC_INTERVAL_MS);
}

async function syncProtocols(config: IntegrationConfig): Promise<void> {
  console.log("[defillama] fetching protocol TVL data...");

  const protocols = await fetchWithRetry<LlamaProtocol[]>(
    `${config.defillama.baseUrl}/protocols`,
    { maxRetries: 2, timeoutMs: 30_000 }
  );

  const relevant = protocols.filter((p) =>
    p.chains.some((c) => TRACKED_CHAINS.includes(c as typeof TRACKED_CHAINS[number]))
  );

  let upserted = 0;
  let skipped = 0;

  for (const p of relevant.slice(0, 200)) {
    const primaryChain =
      p.chains.find((c) => TRACKED_CHAINS.includes(c as typeof TRACKED_CHAINS[number])) ?? p.chains[0];

    try {
      // Match by name+chain since DeFiProtocol uses cuid() IDs
      const existing = await prisma.deFiProtocol.findFirst({
        where: { name: p.name, chain: primaryChain.toLowerCase() },
      });

      if (existing) {
        await prisma.deFiProtocol.update({
          where: { id: existing.id },
          data: {
            tvl: p.tvl,
            tvlChange24h: p.change_1d ?? 0,
            category: p.category ?? "Unknown",
          },
        });
      } else {
        await prisma.deFiProtocol.create({
          data: {
            name: p.name,
            chain: primaryChain.toLowerCase(),
            category: p.category ?? "Unknown",
            tvl: p.tvl,
            tvlChange24h: p.change_1d ?? 0,
          },
        });
      }
      upserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`[defillama] synced ${upserted} protocols (${skipped} skipped, ${relevant.length} relevant of ${protocols.length} total)`);

  await publishEvent("nexus:flows", {
    source: "defillama",
    type: "protocol_sync",
    protocolCount: upserted,
    timestamp: new Date().toISOString(),
  });
}

async function syncYields(config: IntegrationConfig): Promise<void> {
  console.log("[defillama] fetching yield data...");

  const data = await fetchWithRetry<{ data: LlamaYieldPool[] }>(
    `${config.defillama.yieldsUrl}/pools`,
    { maxRetries: 2, timeoutMs: 30_000 }
  );

  const topPools = data.data
    .filter((p) => TRACKED_CHAINS.includes(p.chain as typeof TRACKED_CHAINS[number]) && p.tvlUsd > 1_000_000)
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, 100);

  console.log(`[defillama] found ${topPools.length} relevant yield pools`);

  await publishEvent("nexus:prices", {
    source: "defillama",
    type: "yield_update",
    pools: topPools.slice(0, 20).map((p) => ({
      chain: p.chain,
      project: p.project,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd,
      apy: p.apy,
      apyBase: p.apyBase,
      stablecoin: p.stablecoin,
    })),
    timestamp: new Date().toISOString(),
  });
}

export async function healthCheck(config: IntegrationConfig): Promise<{
  ok: boolean;
  protocolCount?: number;
  error?: string;
}> {
  try {
    const protocols = await fetchWithRetry<LlamaProtocol[]>(
      `${config.defillama.baseUrl}/protocols`,
      { maxRetries: 1, timeoutMs: 10_000 }
    );
    return { ok: true, protocolCount: protocols.length };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
