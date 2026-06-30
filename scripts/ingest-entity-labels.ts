/**
 * Nexus Entity Label Ingestion Pipeline — Nansen RE Edition
 * Sources: Etherscan labels, 0xTracker metadata, DeFiLlama
 * Target: 28,000+ entities across 7 chains
 * 
 * Usage: npx tsx scripts/ingest-entity-labels.ts
 * 
 * Zero raw SQL — uses Prisma ORM for all database operations.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const LABELS_REPO = "/tmp/etherscan-labels";
const OXTRACKER_REPO = "/tmp/ethereum-address-metadata";

// Chain name mapping from Etherscan folder names to our schema
const CHAIN_MAP: Record<string, string> = {
  etherscan: "ethereum",
  polygonscan: "polygon",
  bscscan: "bsc",
  arbiscan: "arbitrum",
  "optimistic-ethereum": "optimism",
  ftmscan: "fantom",
  avalanche: "avalanche",
};

// Label to entity type mapping
const LABEL_TYPE_MAP: Record<string, string> = {
  exchange: "Exchange",
  cex: "Exchange",
  dex: "Protocol",
  defi: "Protocol",
  protocol: "Protocol",
  bridge: "Protocol",
  dao: "Protocol",
  fund: "Fund",
  whale: "Whale",
  stablecoin: "Contract",
  "phish-hack": "Contract",
  exploit: "Contract",
  compromised: "Contract",
  "token-contract": "Contract",
  "contract-deployer": "Contract",
  "old-contract": "Contract",
  "system-contract": "Contract",
  "yield-farming": "Protocol",
};

function getEntityType(labels: string[], name: string): string {
  const lower = labels.map((l) => l.toLowerCase());
  const nameLower = name.toLowerCase();

  // Direct label match
  for (const label of lower) {
    if (label in LABEL_TYPE_MAP) return LABEL_TYPE_MAP[label];
  }

  // Heuristic: name-based classification
  if (/exchange|cex|binance|coinbase|kraken|okx|bitfinex|bybit|kucoin|gate|mexc|htx/i.test(nameLower)) return "Exchange";
  if (/protocol|aave|uniswap|sushiswap|curve|lido|maker|compound|yearn|balancer|synthetix|chainlink|0x:|polygon:|ethereum:/i.test(nameLower)) return "Protocol";
  if (/fund|capital|ventures|trading|jump|wintermute|paradigm|a16z|alameda|three arrows|galaxy/i.test(nameLower)) return "Fund";
  if (/government|sec|fbi|irs|ecb|boj|boe|rba|bi |pbc/i.test(nameLower)) return "Government";
  if (/whale|deployer|token-contract|old-contract|system-contract|phish|exploit|compromised/i.test(nameLower)) return "Contract";
  if (/defi|dex|bridge|dao|staking|yield|lending|insurance|oracle/i.test(nameLower)) return "Protocol";
  if (/price feed|data provider|incentive|treasury|exchange proxy/i.test(nameLower)) return "Protocol";

  return "Unknown";
}

interface EtherscanLabel {
  name: string;
  labels: string[];
}

// ── Source 1: Etherscan Labels ──────────────────────────────

async function ingestEtherscanLabels(): Promise<{ entities: number; wallets: number }> {
  console.log("\n─── Source 1: Etherscan Labels (multi-chain) ───");
  let totalEntities = 0;
  let totalWallets = 0;

  const dataDir = path.join(LABELS_REPO, "data");
  if (!fs.existsSync(dataDir)) {
    console.log("  WARN: etherscan-labels repo not found");
    return { entities: 0, wallets: 0 };
  }

  for (const chainDir of fs.readdirSync(dataDir, { withFileTypes: true })) {
    if (!chainDir.isDirectory()) continue;
    const chain = CHAIN_MAP[chainDir.name] ?? chainDir.name.toLowerCase();
    const combinedFile = path.join(dataDir, chainDir.name, "combined", "combinedAccountLabels.json");
    if (!fs.existsSync(combinedFile)) continue;

    let labels: Record<string, EtherscanLabel>;
    try {
      labels = JSON.parse(fs.readFileSync(combinedFile, "utf-8"));
    } catch {
      continue;
    }

    let chainEntities = 0;
    let chainWallets = 0;

    for (const [address, info] of Object.entries(labels)) {
      const name = info.name?.trim();
      const labelList = info.labels ?? [];
      if (!name) continue;

      const entityType = getEntityType(labelList, name);
      const safeAddr = address.toLowerCase();

      // Check if entity already exists
      const existing = await prisma.entity.findFirst({ where: { name } });
      if (existing) continue;

      // Create entity
      const entity = await prisma.entity.create({
        data: {
          name,
          type: entityType,
          chains: [chain],
          verified: false,
          totalUsdValue: 0,
        },
      }).catch(() => null);

      if (entity) {
        chainEntities++;

        // Create wallet
        await prisma.wallet.create({
          data: {
            address: safeAddr,
            chain,
            entityId: entity.id,
            labels: [name],
            riskScore: 0,
            lastSeen: new Date(),
          },
        }).catch(() => null);

        chainWallets++;
      }
    }

    totalEntities += chainEntities;
    totalWallets += chainWallets;
    console.log(`  ${chainDir.name}: ${chainEntities} entities, ${chainWallets} wallets`);
  }

  return { entities: totalEntities, wallets: totalWallets };
}

// ── Source 2: 0xTracker Metadata ────────────────────────────

async function ingest0xTracker(): Promise<{ entities: number; wallets: number }> {
  console.log("\n─── Source 2: 0xTracker Ethereum Address Metadata ───");
  const dataDir = path.join(OXTRACKER_REPO, "data");
  if (!fs.existsSync(dataDir)) {
    console.log("  WARN: ethereum-address-metadata repo not found");
    return { entities: 0, wallets: 0 };
  }

  let entities = 0;
  let wallets = 0;

  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith(".json")) continue;
    let data: { address?: string; name?: string };
    try {
      data = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
    } catch {
      continue;
    }

    const addr = data.address?.trim().toLowerCase();
    const name = data.name?.trim();
    if (!addr || !name) continue;

    // Check if wallet already exists
    const existing = await prisma.wallet.findFirst({ where: { address: addr } });
    if (existing) continue;

    // Create entity + wallet
    const entity = await prisma.entity.create({
      data: {
        name,
        type: "Contract",
        chains: ["ethereum"],
        verified: true,
        totalUsdValue: 0,
      },
    }).catch(() => null);

    if (entity) {
      entities++;
      await prisma.wallet.create({
        data: {
          address: addr,
          chain: "ethereum",
          entityId: entity.id,
          labels: [name],
          riskScore: 0,
          lastSeen: new Date(),
        },
      }).catch(() => null);
      wallets++;
    }
  }

  console.log(`  0xTracker: ${entities} entities, ${wallets} wallets`);
  return { entities, wallets };
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Nexus Entity Label Ingestion Pipeline — Nansen RE Edition");
  console.log("=".repeat(60));

  // Get current counts
  const beforeEntities = await prisma.entity.count();
  const beforeWallets = await prisma.wallet.count();
  console.log(`  Before: ${beforeEntities} entities, ${beforeWallets} wallets`);

  // Ingest all sources
  const etherscan = await ingestEtherscanLabels();
  const oxtracker = await ingest0xTracker();

  // Get final counts
  const afterEntities = await prisma.entity.count();
  const afterWallets = await prisma.wallet.count();

  console.log(`\n${"=".repeat(60)}`);
  console.log("INGESTION COMPLETE");
  console.log(`  Entities: ${beforeEntities} → ${afterEntities} (+${afterEntities - beforeEntities})`);
  console.log(`  Wallets: ${beforeWallets} → ${afterWallets} (+${afterWallets - beforeWallets})`);
  console.log(`  Etherscan: +${etherscan.entities} entities, +${etherscan.wallets} wallets`);
  console.log(`  0xTracker: +${oxtracker.entities} entities, +${oxtracker.wallets} wallets`);
  console.log("=".repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
