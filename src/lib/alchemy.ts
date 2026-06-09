// ─────────────────────────────────────────────────────────────
// Alchemy Enhanced API Client (Free Tier: 30M CU/month)
// Docs: https://docs.alchemy.com/reference/alchemy-api
// ─────────────────────────────────────────────────────────────

const NETWORKS: Record<string, string> = {
  eth: "eth-mainnet",
  arbitrum: "arb-mainnet",
  base: "base-mainnet",
  optimism: "opt-mainnet",
  polygon: "polygon-mainnet",
};

function getApiKey(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY not set");
  return key;
}

function rpcUrl(chain: string): string {
  const network = NETWORKS[chain] || NETWORKS.eth;
  return `https://${network}.g.alchemy.com/v2/${getApiKey()}`;
}

function enhancedUrl(chain: string): string {
  const network = NETWORKS[chain] || NETWORKS.eth;
  return `https://${network}.g.alchemy.com`;
}

async function alchemyRpc(chain: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl(chain), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Alchemy ${method} error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Alchemy ${method}: ${data.error.message}`);
  return data.result;
}

// ─── Core RPC (drop-in for public endpoints) ──────────────

/** Get native ETH/MATIC balance */
export async function getBalance(address: string, chain = "eth"): Promise<string> {
  const result = (await alchemyRpc(chain, "eth_getBalance", [address, "latest"])) as string;
  return result; // hex wei
}

/** Get latest block number */
export async function getBlockNumber(chain = "eth"): Promise<number> {
  const result = (await alchemyRpc(chain, "eth_blockNumber", [])) as string;
  return parseInt(result, 16);
}

/** Get transaction receipt */
export async function getTransactionReceipt(hash: string, chain = "eth") {
  return alchemyRpc(chain, "eth_getTransactionReceipt", [hash]);
}

/** Get transaction by hash */
export async function getTransaction(hash: string, chain = "eth") {
  return alchemyRpc(chain, "eth_getTransactionByHash", [hash]);
}

/** Get logs for an address (filter by topic) */
export async function getLogs(
  filter: { address?: string; topics?: string[]; fromBlock?: string; toBlock?: string },
  chain = "eth"
) {
  return alchemyRpc(chain, "eth_getLogs", [filter]);
}

// ─── Enhanced APIs (Alchemy-specific, no extra cost) ──────

/** Get all ERC-20 token balances for a wallet (single call) */
export async function getTokenBalances(address: string, chain = "eth") {
  const apiKey = getApiKey();
  const network = NETWORKS[chain] || NETWORKS.eth;
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenBalances",
      params: [address],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy getTokenBalances error: ${res.status}`);
  const data = await res.json();
  return data.result as {
    address: string;
    tokenBalances: Array<{
      contractAddress: string;
      tokenBalance: string;
      error?: string;
    }>;
  };
}

/** Get metadata for a list of ERC-20 tokens */
export async function getTokenMetadata(
  addresses: string[],
  chain = "eth"
): Promise<
  Record<
    string,
    { name: string; symbol: string; decimals: number; logo: string | null }
  >
> {
  const apiKey = getApiKey();
  const network = NETWORKS[chain] || NETWORKS.eth;
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenMetadata",
      params: addresses,
    }),
  });
  if (!res.ok) throw new Error(`Alchemy getTokenMetadata error: ${res.status}`);
  const data = await res.json();
  const results = data.result as Array<{
    name: string;
    symbol: string;
    decimals: number;
    logo: string | null;
  }>;
  const map: Record<string, { name: string; symbol: string; decimals: number; logo: string | null }> = {};
  addresses.forEach((addr, i) => {
    map[addr.toLowerCase()] = results[i];
  });
  return map;
}

/** Get all transfers for an address (incoming + outgoing) */
export async function getAssetTransfers(
  address: string,
  options: {
    chain?: string;
    fromBlock?: string;
    toBlock?: string;
    maxCount?: number;
    order?: "asc" | "desc";
    category?: string[];
  } = {}
) {
  const chain = options.chain || "eth";
  const apiKey = getApiKey();
  const network = NETWORKS[chain] || NETWORKS.eth;

  const params: Record<string, unknown> = {
    fromBlock: options.fromBlock || "0x0",
    toBlock: options.toBlock || "latest",
    maxCount: options.maxCount || 100,
    order: options.order || "desc",
    category: options.category || ["external", "erc20", "erc721", "erc1155"],
  };

  // Query from or to separately — Alchemy doesn't support both in one call
  const [fromRes, toRes] = await Promise.all([
    fetch(`https://${network}.g.alchemy.com/v2/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{ ...params, fromAddress: address }],
      }),
    }),
    fetch(`https://${network}.g.alchemy.com/v2/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "alchemy_getAssetTransfers",
        params: [{ ...params, toAddress: address }],
      }),
    }),
  ]);

  const fromData = fromRes.ok ? await fromRes.json() : { result: { transfers: [] } };
  const toData = toRes.ok ? await toRes.json() : { result: { transfers: [] } };

  return {
    sent: (fromData.result?.transfers || []) as AlchemyTransfer[],
    received: (toData.result?.transfers || []) as AlchemyTransfer[],
  };
}

export interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  rawContract?: { address: string; decimal: string };
  metadata?: { blockTimestamp: string };
}

/** Get NFTs owned by a wallet */
export async function getNftsForOwner(
  address: string,
  chain = "eth",
  options: { pageSize?: number; pageKey?: string } = {}
) {
  const apiKey = getApiKey();
  const network = NETWORKS[chain] || NETWORKS.eth;
  const params = new URLSearchParams({ owner: address });
  if (options.pageSize) params.set("pageSize", String(options.pageSize));
  if (options.pageKey) params.set("pageKey", options.pageKey);

  const res = await fetch(
    `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?${params}`
  );
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner error: ${res.status}`);
  return res.json();
}

/** Get floor price for an NFT collection */
export async function getFloorPrice(contractAddress: string, chain = "eth") {
  const apiKey = getApiKey();
  const network = NETWORKS[chain] || NETWORKS.eth;
  const res = await fetch(
    `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getFloorPrice?contractAddress=${contractAddress}`
  );
  if (!res.ok) throw new Error(`Alchemy getFloorPrice error: ${res.status}`);
  return res.json();
}

/** Subscribe to address activity via Alchemy Webhooks (setup helper) */
export function getWebhookRegistrationPayload(
  addresses: string[],
  webhookUrl: string,
  network = "ETH_MAINNET"
) {
  return {
    network,
    webhook_type: "ADDRESS_ACTIVITY",
    webhook_url: webhookUrl,
    addresses,
  };
}

/** Health check — verify API key works */
export async function healthCheck(chain = "eth"): Promise<{ ok: boolean; blockNumber?: number; error?: string }> {
  try {
    const blockNumber = await getBlockNumber(chain);
    return { ok: true, blockNumber };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
