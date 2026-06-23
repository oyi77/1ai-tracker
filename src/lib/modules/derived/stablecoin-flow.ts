// ─────────────────────────────────────────────────────────────
// Stablecoin Flow Tracker — USDT/USDC mint/burn as macro signal
// Net mint = bullish (new money entering), net burn = bearish
// ─────────────────────────────────────────────────────────────

interface StablecoinFlow {
  name: string
  symbol: string
  currentSupply: number
  change24h: number
  change7d: number
  netFlow: number // positive = mint, negative = burn
  signal: 'bullish' | 'bearish' | 'neutral'
}

const DEFI_LLAMA_URL = 'https://stablecoins.llama.fi'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: 'application/json', 'User-Agent': 'NexusTracker/1.0' },
  })
  if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function getStablecoinFlows(): Promise<StablecoinFlow[]> {
  try {
    // DefiLlama returns { peggedUSD: number } not { current: number }
    type PeggedAmount = { peggedUSD: number }
    const data = await fetchJson<{ peggedAssets: Array<{ name: string; symbol: string; circulating: PeggedAmount; circulatingPrevDay: PeggedAmount; circulatingPrevWeek: PeggedAmount }> }>(`${DEFI_LLAMA_URL}/stablecoins`)

    return data.peggedAssets
      .filter(a => (a.circulating?.peggedUSD ?? 0) > 1_000_000) // Only >$1M supply
      .map(a => {
        const current = a.circulating?.peggedUSD ?? 0
        const prevDay = a.circulatingPrevDay?.peggedUSD ?? current
        const prevWeek = a.circulatingPrevWeek?.peggedUSD ?? current
        const change24h = current - prevDay
        const change7d = current - prevWeek

        return {
          name: a.name,
          symbol: a.symbol,
          currentSupply: current,
          change24h,
          change7d,
          netFlow: change24h,
          signal: change24h > 1_000_000 ? 'bullish' as const : change24h < -1_000_000 ? 'bearish' as const : 'neutral' as const,
        }
      })
      .sort((a, b) => b.currentSupply - a.currentSupply)
      .slice(0, 20)
  } catch (err) {
    console.error('[stablecoin-flow] DefiLlama fetch failed:', (err as Error).message)
    return []
  }
}

export async function getNetMintBurn(): Promise<{ totalMint24h: number; totalBurn24h: number; netFlow24h: number; signal: string }> {
  const flows = await getStablecoinFlows()
  const totalMint = flows.filter(f => f.change24h > 0).reduce((s, f) => s + f.change24h, 0)
  const totalBurn = flows.filter(f => f.change24h < 0).reduce((s, f) => s + Math.abs(f.change24h), 0)
  const net = totalMint - totalBurn

  return {
    totalMint24h: totalMint,
    totalBurn24h: totalBurn,
    netFlow24h: net,
    signal: net > 10_000_000 ? 'bullish — new money entering' : net < -10_000_000 ? 'bearish — money leaving' : 'neutral',
  }
}
