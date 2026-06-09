// ─────────────────────────────────────────────────────────────
// Etherscan-compatible API Client (Free: 5 calls/sec, 100K/day)
// Works with: etherscan.io, arbiscan.io, basescan.org,
//             optimistic.etherscan.io, bscscan.com, polygonscan.com
// ─────────────────────────────────────────────────────────────

interface ChainConfig {
  apiUrl: string;
  envKey: string;
  nativeCurrency: string;
}

const CHAINS: Record<string, ChainConfig> = {
  eth: {
    apiUrl: "https://api.etherscan.io/api",
    envKey: "ETHERSCAN_API_KEY",
    nativeCurrency: "ETH",
  },
  arbitrum: {
    apiUrl: "https://api.arbiscan.io/api",
    envKey: "ARBISCAN_API_KEY",
    nativeCurrency: "ETH",
  },
  base: {
    apiUrl: "https://api.basescan.org/api",
    envKey: "BASESCAN_API_KEY",
    nativeCurrency: "ETH",
  },
  optimism: {
    apiUrl: "https://api-optimistic.etherscan.io/api",
    envKey: "OPTIMISM_ETHERSCAN_API_KEY",
    nativeCurrency: "ETH",
  },
  bsc: {
    apiUrl: "https://api.bscscan.com/api",
    envKey: "BSCSCAN_API_KEY",
    nativeCurrency: "BNB",
  },
  polygon: {
    apiUrl: "https://api.polygonscan.com/api",
    envKey: "POLYGONSCAN_API_KEY",
    nativeCurrency: "MATIC",
  },
};

function getApiKey(chain: string): string {
  const config = CHAINS[chain];
  if (!config) throw new Error(`Unsupported chain: ${chain}`);
  // Etherscan works without API key (rate limited), or with free key (higher limits)
  return process.env[config.envKey] || "";
}

async function etherscanGet<T>(
  chain: string,
  params: Record<string, string>
): Promise<T> {
  const config = CHAINS[chain];
  if (!config) throw new Error(`Unsupported chain for Etherscan: ${chain}`);

  const apiKey = getApiKey(chain);
  const url = new URL(config.apiUrl);
  url.searchParams.set("apikey", apiKey);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Etherscan ${chain} error: ${res.status}`);
  const data = await res.json();
  if (data.status === "0" && data.message === "NOTOK") {
    throw new Error(`Etherscan ${chain}: ${data.result}`);
  }
  return data.result as T;
}

// ─── Account Module ───────────────────────────────────────

export interface EtherscanTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  functionName: string;
  methodId: string;
}

/** Get normal transactions for an address */
export async function getTransactions(
  address: string,
  chain = "eth",
  options: { startBlock?: number; endBlock?: number; page?: number; offset?: number; sort?: string } = {}
) {
  return etherscanGet<EtherscanTx[]>(chain, {
    module: "account",
    action: "txlist",
    address,
    startblock: String(options.startBlock || 0),
    endblock: String(options.endBlock || 99999999),
    page: String(options.page || 1),
    offset: String(options.offset || 100),
    sort: options.sort || "desc",
  });
}

export interface EtherscanTokenTransfer {
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

/** Get ERC-20 token transfers for an address */
export async function getTokenTransfers(
  address: string,
  chain = "eth",
  options: { contractAddress?: string; startBlock?: number; endBlock?: number; page?: number; offset?: number } = {}
) {
  const params: Record<string, string> = {
    module: "account",
    action: "tokentx",
    address,
    startblock: String(options.startBlock || 0),
    endblock: String(options.endBlock || 99999999),
    page: String(options.page || 1),
    offset: String(options.offset || 100),
    sort: "desc",
  };
  if (options.contractAddress) params.contractaddress = options.contractAddress;
  return etherscanGet<EtherscanTokenTransfer[]>(chain, params);
}

/** Get ERC-721 (NFT) token transfers for an address */
export async function getNftTransfers(
  address: string,
  chain = "eth",
  options: { page?: number; offset?: number } = {}
) {
  return etherscanGet<EtherscanTokenTransfer[]>(chain, {
    module: "account",
    action: "tokennfttx",
    address,
    page: String(options.page || 1),
    offset: String(options.offset || 100),
    sort: "desc",
  });
}

/** Get native balance for multiple addresses (max 20) */
export async function getMultiBalance(addresses: string[], chain = "eth") {
  return etherscanGet<Array<{ account: string; balance: string }>>(chain, {
    module: "account",
    action: "balancemulti",
    address: addresses.join(","),
    tag: "latest",
  });
}

// ─── Contract Module ──────────────────────────────────────

/** Get ABI for a verified contract */
export async function getContractAbi(address: string, chain = "eth") {
  return etherscanGet<string>(chain, {
    module: "contract",
    action: "getabi",
    address,
  });
}

/** Get source code for a verified contract */
export async function getContractSource(address: string, chain = "eth") {
  return etherscanGet<Array<{
    SourceCode: string;
    ContractName: string;
    CompilerVersion: string;
    Implementation: string;
  }>>(chain, {
    module: "contract",
    action: "getsourcecode",
    address,
  });
}

// ─── Gas Tracker ──────────────────────────────────────────

export interface GasPrices {
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
}

/** Get current gas prices */
export async function getGasPrice(chain = "eth"): Promise<GasPrices> {
  return etherscanGet(chain, {
    module: "gastracker",
    action: "gasoracle",
  });
}

// ─── Stats Module ─────────────────────────────────────────

/** Get ETH total supply */
export async function getEthSupply(chain = "eth") {
  return etherscanGet<string>(chain, {
    module: "stats",
    action: "ethsupply",
  });
}

/** Get ETH price */
export async function getEthPrice(chain = "eth") {
  return etherscanGet<{ ethbtc: string; ethusd: string; ethbtc_timestamp: string; ethusd_timestamp: string }>(
    chain,
    { module: "stats", action: "ethprice" }
  );
}

/** Get total node count */
export async function getNodeCount(chain = "eth") {
  return etherscanGet<string>(chain, {
    module: "stats",
    action: "nodecount",
  });
}

// ─── Proxy Module ─────────────────────────────────────────

/** Get most recent block number */
export async function getBlockNumber(chain = "eth"): Promise<number> {
  const result = await etherscanGet<string>(chain, {
    module: "proxy",
    action: "eth_blockNumber",
  });
  return parseInt(result, 16);
}

// ─── Utility ──────────────────────────────────────────────

/** Health check across all configured chains */
export async function healthCheck(): Promise<
  Record<string, { ok: boolean; blockNumber?: number; error?: string }>
> {
  const results: Record<string, { ok: boolean; blockNumber?: number; error?: string }> = {};
  const chains = Object.keys(CHAINS);

  await Promise.allSettled(
    chains.map(async (chain) => {
      try {
        const blockNumber = await getBlockNumber(chain);
        results[chain] = { ok: true, blockNumber };
      } catch (err) {
        results[chain] = { ok: false, error: (err as Error).message };
      }
    })
  );

  return results;
}

/** Get supported chains */
export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}
