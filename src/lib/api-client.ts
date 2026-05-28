const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const DEXSCREENER_BASE = "https://api.dexscreener.com/latest";
const BLOCKSTREAM_BASE = "https://blockstream.info/api";
const MEMPOOL_BASE = "https://mempool.space/api";

async function fetchWithCache(url: string, cacheTime = 60): Promise<Response> {
  return fetch(url, {
    next: { revalidate: cacheTime },
    headers: { Accept: "application/json" },
  });
}

// CoinGecko free tier
export async function getCoinPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const res = await fetchWithCache(
    `${COINGECKO_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

export async function getCoinMarketData(vs = "usd", perPage = 100, page = 1) {
  const res = await fetchWithCache(
    `${COINGECKO_BASE}/coins/markets?vs_currency=${vs}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true`
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

// DexScreener free tier
export async function searchTokens(query: string) {
  const res = await fetchWithCache(`${DEXSCREENER_BASE}/dex/search?q=${query}`);
  if (!res.ok) throw new Error(`DexScreener error: ${res.status}`);
  return res.json();
}

export async function getTokenPairs(address: string) {
  const res = await fetchWithCache(`${DEXSCREENER_BASE}/dex/tokens/${address}`);
  if (!res.ok) throw new Error(`DexScreener error: ${res.status}`);
  return res.json();
}

// Blockstream/Mempool for Bitcoin
export async function getBitcoinAddress(address: string) {
  const res = await fetchWithCache(`${BLOCKSTREAM_BASE}/address/${address}`);
  if (!res.ok) throw new Error(`Blockstream error: ${res.status}`);
  return res.json();
}

export async function getBitcoinRecentTxs(address: string) {
  const res = await fetchWithCache(`${BLOCKSTREAM_BASE}/address/${address}/txs`);
  if (!res.ok) throw new Error(`Blockstream error: ${res.status}`);
  return res.json();
}

// Polymarket CLOB API
export async function getPolymarketMarkets(limit = 100, offset = 0) {
  const res = await fetchWithCache(
    `https://clob.polymarket.com/markets?limit=${limit}&offset=${offset}`,
    30
  );
  if (!res.ok) throw new Error(`Polymarket error: ${res.status}`);
  return res.json();
}

export async function getPolymarketMarket(conditionId: string) {
  const res = await fetchWithCache(`https://clob.polymarket.com/markets/${conditionId}`);
  if (!res.ok) throw new Error(`Polymarket error: ${res.status}`);
  return res.json();
}

// Ethereum/EVM — Alchemy free tier
export async function getAlchemyBalance(address: string, chain = "eth") {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY not set");

  const chains: Record<string, string> = {
    eth: "eth-mainnet",
    arbitrum: "arb-mainnet",
    base: "base-mainnet",
    optimism: "opt-mainnet",
  };

  const network = chains[chain] || "eth-mainnet";
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy error: ${res.status}`);
  const data = await res.json();
  return parseInt(data.result, 16) / 1e18;
}

// The Graph — public subgraphs
export async function querySubgraph(subgraphId: string, query: string) {
  const res = await fetch(`https://gateway.thegraph.com/api/subgraphs/id/${subgraphId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`The Graph error: ${res.status}`);
  return res.json();
}

// Reservoir for NFTs
export async function getCollections(limit = 20) {
  const res = await fetchWithCache(
    `https://api.reservoir.tools/collections/v7?limit=${limit}&sortBy=allTimeVolume`,
    60
  );
  if (!res.ok) throw new Error(`Reservoir error: ${res.status}`);
  return res.json();
}
