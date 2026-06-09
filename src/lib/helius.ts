// ─────────────────────────────────────────────────────────────
// Helius + Jupiter Solana Clients (Free tiers available)
// Helius: https://docs.helius.dev (free: 100K credits/day)
// Jupiter: https://docs.jup.ag (free, no auth)
// ─────────────────────────────────────────────────────────────

const HELIUS_BASE = "https://mainnet.helius-rpc.com";
const JUPITER_PRICE_API = "https://api.jup.ag/price/v2";
const SOLANA_PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

function getHeliusKey(): string | null {
  return process.env.HELIUS_API_KEY || null;
}

function heliusRpcUrl(): string {
  const key = getHeliusKey();
  if (key) return `${HELIUS_BASE}/?api-key=${key}`;
  return SOLANA_PUBLIC_RPC;
}

async function solanaRpc(method: string, params: unknown[]): Promise<unknown> {
  const url = heliusRpcUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Solana RPC ${method} error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Solana RPC ${method}: ${data.error.message}`);
  return data.result;
}

// ─── Core Solana RPC ──────────────────────────────────────

/** Get SOL balance for an address (in lamports) */
export async function getBalance(address: string): Promise<number> {
  const result = (await solanaRpc("getBalance", [address])) as { value: number };
  return result.value;
}

/** Get SOL balance in SOL units */
export async function getBalanceInSol(address: string): Promise<number> {
  const lamports = await getBalance(address);
  return lamports / 1e9;
}

/** Get recent transactions for an address */
export async function getSignaturesForAddress(
  address: string,
  options: { limit?: number; before?: string; until?: string } = {}
) {
  const params: unknown[] = [
    address,
    {
      limit: options.limit || 25,
      ...(options.before ? { before: options.before } : {}),
      ...(options.until ? { until: options.until } : {}),
    },
  ];
  return solanaRpc("getSignaturesForAddress", params);
}

/** Get parsed transaction details */
export async function getTransaction(signature: string) {
  return solanaRpc("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
  ]);
}

/** Get token accounts for an owner */
export async function getTokenAccountsByOwner(ownerAddress: string) {
  return solanaRpc("getTokenAccountsByOwner", [
    ownerAddress,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" },
  ]);
}

/** Get multiple accounts in a single call */
export async function getMultipleAccounts(addresses: string[]) {
  return solanaRpc("getMultipleAccountsInfo", [
    addresses,
    { encoding: "jsonParsed" },
  ]);
}

// ─── Helius Enhanced APIs (when HELIUS_API_KEY is set) ────

export interface HeliusTokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  tokenAccount: string;
}

export interface HeliusEnrichedTx {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: { tokenAmount: string; decimals: number };
      mint: string;
    }>;
  }>;
}

/** Get enriched/parsed transaction history (Helius-specific) */
export async function getEnrichedTransactions(
  address: string,
  options: { limit?: number; before?: string } = {}
): Promise<HeliusEnrichedTx[]> {
  const key = getHeliusKey();
  if (!key) throw new Error("HELIUS_API_KEY not set");

  const params = new URLSearchParams({
    "api-key": key,
    limit: String(options.limit || 25),
  });
  if (options.before) params.set("before", options.before);

  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${address}/transactions?${params}`
  );
  if (!res.ok) throw new Error(`Helius enriched tx error: ${res.status}`);
  return res.json();
}

/** DAS (Digital Asset Standard) — get all assets for an owner */
export async function getAssetsByOwner(
  ownerAddress: string,
  options: { page?: number; limit?: number } = {}
) {
  const key = getHeliusKey();
  if (!key) throw new Error("HELIUS_API_KEY not set");

  const res = await fetch(`${HELIUS_BASE}/?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "get-assets",
      method: "getAssetsByOwner",
      params: {
        ownerAddress,
        page: options.page || 1,
        limit: options.limit || 50,
        displayOptions: { showFungible: true },
      },
    }),
  });
  if (!res.ok) throw new Error(`Helius DAS error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

/** Get token balances for an address (Helius-enhanced) */
export async function getTokenBalances(address: string): Promise<HeliusTokenBalance[]> {
  const key = getHeliusKey();
  if (!key) {
    // Fallback to native RPC
    const accounts = (await getTokenAccountsByOwner(address)) as {
      value: Array<{
        account: { data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number } } } } };
        pubkey: string;
      }>;
    };
    return accounts.value.map((acc) => ({
      mint: acc.account.data.parsed.info.mint,
      amount: Number(acc.account.data.parsed.info.tokenAmount.amount),
      decimals: acc.account.data.parsed.info.tokenAmount.decimals,
      tokenAccount: acc.pubkey,
    }));
  }

  const assets = await getAssetsByOwner(address, { limit: 100 });
  const items = assets?.items || [];
  return items
    .filter((item: { interface?: string }) => item.interface === "FungibleToken")
    .map((item: { id: string; token_info?: { balance: string; decimals: number }; content?: { metadata?: { name?: string } } }) => ({
      mint: item.id,
      amount: Number(item.token_info?.balance || 0),
      decimals: item.token_info?.decimals || 0,
      tokenAccount: "",
    }));
}

// ─── Jupiter Price API (100% free) ────────────────────────

export interface TokenPrice {
  id: string;
  type: string;
  price: string;
  extraInfo?: {
    quotedPrice?: { buyPrice: string; buyAt: number; sellPrice: string; sellAt: number };
    confidenceLevel?: string;
    depth?: { buyDepth: number; sellDepth: number };
  };
}

/** Get current prices for Solana tokens by mint address */
export async function getTokenPrices(
  ids: string[]
): Promise<Record<string, TokenPrice>> {
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await fetch(`${JUPITER_PRICE_API}?${params}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Jupiter price error: ${res.status}`);
  const data = await res.json();
  return data.data as Record<string, TokenPrice>;
}

/** Get price for a single Solana token */
export async function getTokenPrice(mint: string): Promise<number | null> {
  const prices = await getTokenPrices([mint]);
  const entry = prices[mint];
  if (!entry) return null;
  return parseFloat(entry.price);
}

/** Get SOL price in USD */
export async function getSolPrice(): Promise<number | null> {
  // SOL native mint
  return getTokenPrice("So11111111111111111111111111111111111111112");
}

// ─── Utility ──────────────────────────────────────────────

/** Health check — verify RPC connectivity */
export async function healthCheck(): Promise<{
  ok: boolean;
  blockHeight?: number;
  heliusAvailable: boolean;
  error?: string;
}> {
  try {
    const result = (await solanaRpc("getSlot", [])) as number;
    return {
      ok: true,
      blockHeight: result,
      heliusAvailable: !!getHeliusKey(),
    };
  } catch (err) {
    return {
      ok: false,
      heliusAvailable: !!getHeliusKey(),
      error: (err as Error).message,
    };
  }
}
