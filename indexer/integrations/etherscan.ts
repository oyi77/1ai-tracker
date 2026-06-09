// ─────────────────────────────────────────────────────────────
// Etherscan Transaction History Fetcher for the indexer sidecar
// Supplements WebSocket subscriptions with historical backfill
// Free: 5 calls/sec, 100K calls/day per chain
// Uses shared Prisma singleton, HTTP client, and rate limiter
// ─────────────────────────────────────────────────────────────

import { prisma } from "../db";
import { publishEvent } from "../publisher";
import { fetchWithRetry, createRateLimiter } from "./http-client";
import { type IntegrationConfig } from "./config";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface ExplorerTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  isError: string;
  functionName: string;
  input: string;
}

interface ExplorerTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

/** Start polling Etherscan-compatible APIs for wallet transaction history */
export function startEtherscanPolling(config: IntegrationConfig): void {
  const chains = Object.keys(config.etherscan);
  if (chains.length === 0) {
    console.log("[etherscan] no API keys configured, skipping");
    return;
  }

  console.log(`[etherscan] starting transaction history polling for ${chains.join(", ")} (every 5min)`);
  pollLoop(config);
}

async function pollLoop(config: IntegrationConfig): Promise<void> {
  try {
    for (const chain of Object.keys(config.etherscan)) {
      await pollChain(config, chain);
    }
  } catch (err) {
    console.error("[etherscan] poll error:", (err as Error).message);
  }

  setTimeout(() => pollLoop(config), POLL_INTERVAL_MS);
}

// Rate limiter: 5 calls per second per Etherscan's free tier
const rateLimiter = createRateLimiter(5, 1000);

async function pollChain(config: IntegrationConfig, chain: string): Promise<void> {
  const chainConfig = config.etherscan[chain];
  if (!chainConfig) return;

  const wallets = await prisma.wallet.findMany({
    where: { chain },
    select: { address: true, id: true },
    take: 50,
  });

  if (wallets.length === 0) return;

  for (const wallet of wallets) {
    await rateLimiter(() =>
      checkWalletTransactions(wallet.address, wallet.id, chain, chainConfig.apiUrl, chainConfig.apiKey)
    );
  }
}

async function checkWalletTransactions(
  address: string,
  walletId: string,
  chain: string,
  apiUrl: string,
  apiKey: string
): Promise<void> {
  try {
    // Fetch recent normal transactions
    const txUrl = buildEtherscanUrl(apiUrl, apiKey, {
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: "10",
      sort: "desc",
    });

    const txData = await fetchWithRetry<EtherscanResponse<ExplorerTx[]>>(txUrl, {
      maxRetries: 2,
      timeoutMs: 10_000,
    });

    for (const tx of txData.result ?? []) {
      if (tx.isError === "1") continue;

      await prisma.transaction.upsert({
        where: { hash: tx.hash },
        update: {},
        create: {
          hash: tx.hash,
          fromWallet: tx.from.toLowerCase(),
          toWallet: tx.to.toLowerCase(),
          amountUsd: parseFloat(tx.value) / 1e18,
          chain,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          decodedType: tx.input === "0x" ? "send" : "swap",
          walletId,
        },
      });
    }

    // Fetch recent ERC-20 token transfers
    const tokenUrl = buildEtherscanUrl(apiUrl, apiKey, {
      module: "account",
      action: "tokentx",
      address,
      page: "1",
      offset: "10",
      sort: "desc",
    });

    const tokenData = await fetchWithRetry<EtherscanResponse<ExplorerTokenTransfer[]>>(tokenUrl, {
      maxRetries: 2,
      timeoutMs: 10_000,
    });

    for (const tx of tokenData.result ?? []) {
      const txChain = chain;

      await prisma.token.upsert({
        where: { address_chain: { address: tx.contractAddress.toLowerCase(), chain: txChain } },
        update: { name: tx.tokenName, symbol: tx.tokenSymbol },
        create: {
          address: tx.contractAddress.toLowerCase(),
          chain: txChain,
          name: tx.tokenName,
          symbol: tx.tokenSymbol,
        },
      });

      await publishEvent("nexus:trades", {
        source: "etherscan",
        chain: txChain,
        hash: tx.hash,
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        token: tx.tokenSymbol,
        tokenAddress: tx.contractAddress.toLowerCase(),
        value: tx.value,
        decimals: parseInt(tx.tokenDecimal),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.error(`[etherscan] ${address} on ${chain}:`, (err as Error).message);
  }
}

function buildEtherscanUrl(baseUrl: string, apiKey: string, params: Record<string, string>): string {
  const url = new URL(baseUrl);
  for (const [key, val] of Object.entries(params)) url.searchParams.set(key, val);
  url.searchParams.set("apikey", apiKey);
  return url.toString();
}

/** Get current gas prices for a chain */
export async function getGasPrice(
  config: IntegrationConfig,
  chain = "eth"
): Promise<{ SafeGasPrice: string; ProposeGasPrice: string; FastGasPrice: string }> {
  const chainConfig = config.etherscan[chain];
  if (!chainConfig) throw new Error(`No Etherscan config for chain: ${chain}`);

  const url = buildEtherscanUrl(chainConfig.apiUrl, chainConfig.apiKey, {
    module: "gastracker",
    action: "gasoracle",
  });

  const data = await fetchWithRetry<EtherscanResponse<{ SafeGasPrice: string; ProposeGasPrice: string; FastGasPrice: string }>>(url);
  return data.result;
}
