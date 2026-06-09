// ─────────────────────────────────────────────────────────────
// Alchemy Enhanced APIs for the indexer sidecar
// Enriches raw blockchain events with token data & pricing
// Uses shared config, HTTP client, and Prisma singleton
// ─────────────────────────────────────────────────────────────

import { type IntegrationConfig, alchemyRpcUrl } from "./config";
import { rpcCall, fetchWithRetry } from "./http-client";

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

interface TransferLog {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  metadata?: { blockTimestamp: string };
}

interface TxReceipt {
  logs: Array<{ address: string; data: string; topics: string[] }>;
}

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function isAlchemyAvailable(config: IntegrationConfig): boolean {
  return !!config.alchemy.apiKey;
}

/** Get all ERC-20 token balances for a wallet (single Alchemy-enhanced call) */
export async function getTokenBalances(
  config: IntegrationConfig,
  address: string,
  chain = "eth"
): Promise<{ address: string; tokenBalances: TokenBalance[] }> {
  const url = alchemyRpcUrl(config, chain);
  if (!url) throw new Error("Alchemy not configured");
  return rpcCall(url, "alchemy_getTokenBalances", [address]);
}

/** Get metadata for a list of ERC-20 token contracts */
export async function getTokenMetadata(
  config: IntegrationConfig,
  addresses: string[],
  chain = "eth"
): Promise<TokenMetadata[]> {
  const url = alchemyRpcUrl(config, chain);
  if (!url) throw new Error("Alchemy not configured");
  return rpcCall(url, "alchemy_getTokenMetadata", addresses);
}

/** Get asset transfers for an address */
export async function getAssetTransfers(
  config: IntegrationConfig,
  address: string,
  chain = "eth",
  direction: "from" | "to" = "from",
  options: { maxCount?: number; category?: string[] } = {}
): Promise<TransferLog[]> {
  const url = alchemyRpcUrl(config, chain);
  if (!url) throw new Error("Alchemy not configured");

  const params: Record<string, unknown> = {
    fromBlock: "0x0",
    toBlock: "latest",
    maxCount: options.maxCount ?? 100,
    order: "desc",
    category: options.category ?? ["external", "erc20", "erc721", "erc1155"],
    ...(direction === "from" ? { fromAddress: address } : { toAddress: address }),
  };

  const result = await fetchWithRetry<{ transfers?: TransferLog[] }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getAssetTransfers", params: [params] }),
  });

  return result.transfers ?? [];
}

/** Enrich a transaction hash with ERC-20 Transfer event data */
export async function enrichTransaction(
  config: IntegrationConfig,
  txHash: string,
  chain: string
): Promise<{
  tokenTransfers: Array<{
    from: string;
    to: string;
    value: string;
    contractAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  }>;
} | null> {
  if (!isAlchemyAvailable(config)) return null;

  try {
    const url = alchemyRpcUrl(config, chain);
    if (!url) return null;

    const receipt = await rpcCall<TxReceipt | null>(url, "eth_getTransactionReceipt", [txHash]);
    if (!receipt?.logs?.length) return null;

    const tokenLogs = receipt.logs.filter((log) => log.topics[0] === TRANSFER_TOPIC);
    if (tokenLogs.length === 0) return null;

    const tokenAddresses = Array.from(new Set(tokenLogs.map((l) => l.address.toLowerCase())));
    const metadata = await getTokenMetadata(config, tokenAddresses, chain);

    const transfers = tokenLogs.map((log) => {
      const tokenAddr = log.address.toLowerCase();
      const metaIdx = tokenAddresses.indexOf(tokenAddr);
      const meta = metadata[metaIdx] ?? { name: "Unknown", symbol: "?", decimals: 18, logo: null };

      return {
        from: `0x${log.topics[1]?.slice(26) || ""}`,
        to: `0x${log.topics[2]?.slice(26) || ""}`,
        value: log.data === "0x" ? "0" : BigInt(log.data).toString(),
        contractAddress: tokenAddr,
        name: meta.name,
        symbol: meta.symbol,
        decimals: meta.decimals,
      };
    });

    return { tokenTransfers: transfers };
  } catch (err) {
    console.error(`[alchemy] enrich tx ${txHash}:`, (err as Error).message);
    return null;
  }
}
