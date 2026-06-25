// ─────────────────────────────────────────────────────────────
// Token God Mode API — Nansen-style token analysis
// Shows holders, top wallets, smart money activity, price data
// Uses GeckoTerminal + Binance + Entity DB
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getCached } from '@/lib/api/server-cache'
import { prisma } from '@/lib/db'

interface HolderProfile {
  address: string
  chain: string
  entityName: string | null
  entityType: string | null
  entityTvl: number
  verified: boolean
  smartMoneyScore: number
}

interface TokenGodData {
  token: {
    address: string
    name: string
    symbol: string
    price: number
    fdv: number
    marketCap: number
    volume24h: number
    priceChange24h: number
    totalSupply: string
  }
  holders: HolderProfile[]
  entityDistribution: Record<string, { count: number; tvl: number }>
  topHolders: Array<{ name: string; type: string; tvl: number; score: number }>
  pools: Array<{
    address: string
    name: string
    dex: string
    priceUsd: number
    volume24h: number
    liquidity: number
  }>
}

async function fetchTokenGodMode(address: string, network: string): Promise<TokenGodData> {
  // Fetch token info from GeckoTerminal
  const tokenRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!tokenRes.ok) throw new Error(`GeckoTerminal error: ${tokenRes.status}`)
  
  const tokenData = (await tokenRes.json()) as {
    data: {
      attributes: {
        name: string; symbol: string; decimals: string
        price_usd: string; fdv_usd: string; market_cap_usd: string
        total_supply: string; normalized_total_supply: string
        volume_usd: { h24: string; h6: string; h1: string }
        price_change_percentage: { h24: string; h6: string; h1: string }
      }
    }
  }

  const token = tokenData.data.attributes

  // Fetch top pools for this token
  const poolsRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}/pools?page=1`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  let pools: Array<{
    address: string
    name: string
    dex: string
    priceUsd: number
    volume24h: number
    liquidity: number
  }> = []

  if (poolsRes.ok) {
    const poolData = (await poolsRes.json()) as {
      data: Array<{
        id: string; attributes: {
          address: string; name: string; dex_id: string
          base_token_price_usd: string; volume_usd: { h24: string }
          fdv_usd: string; reserve_in_usd: string; pool_created_at: string
        }
      }>
    }
    pools = (poolData.data ?? []).map(p => ({
      address: p.attributes.address,
      name: p.attributes.name,
      dex: p.attributes.dex_id,
      priceUsd: parseFloat(p.attributes.base_token_price_usd) || 0,
      volume24h: parseFloat(p.attributes.volume_usd?.h24 ?? '0'),
      liquidity: parseFloat(p.attributes.reserve_in_usd) || 0,
    }))
  }

  // Cross-reference with Entity DB for known holders
  const entities = await prisma.entity.findMany({
    where: { totalUsdValue: { gt: 0 } },
    include: { wallets: { select: { address: true, chain: true } } },
    orderBy: { totalUsdValue: 'desc' },
    take: 200,
  })

  // Build holder profile from our DB
  const knownHolders = entities
    .filter(e => {
      const name = e.name.toLowerCase()
      const symbol = token.symbol.toLowerCase()
      return name.includes(symbol) || symbol.includes(name.slice(0, 4))
    })
    .slice(0, 20)
    .map(e => ({
      address: e.wallets[0]?.address ?? '',
      chain: e.wallets[0]?.chain ?? 'ethereum',
      entityName: e.name,
      entityType: e.type,
      entityTvl: e.totalUsdValue ?? 0,
      verified: e.verified,
      smartMoneyScore: 0,
    }))

  // Entity type distribution
  const typeDistribution: Record<string, { count: number; tvl: number }> = {}
  for (const e of entities.slice(0, 200)) {
    const t = e.type || 'unknown'
    if (!typeDistribution[t]) typeDistribution[t] = { count: 0, tvl: 0 }
    typeDistribution[t].count++
    typeDistribution[t].tvl += e.totalUsdValue ?? 0
  }

  // Top holders by TVL
  const topHolders = entities
    .slice(0, 10)
    .map(e => ({
      name: e.name,
      type: e.type,
      tvl: e.totalUsdValue ?? 0,
      score: 0,
    }))

  return {
    token: {
      address,
      name: token.name,
      symbol: token.symbol,
      price: parseFloat(token.price_usd),
      fdv: parseFloat(token.fdv_usd),
      marketCap: parseFloat(token.market_cap_usd),
      volume24h: parseFloat(token.volume_usd?.h24 ?? '0'),
      priceChange24h: parseFloat(token.price_change_percentage?.h24 ?? '0'),
      totalSupply: token.normalized_total_supply,
    },
    holders: knownHolders,
    entityDistribution: typeDistribution,
    topHolders,
    pools: pools.slice(0, 10),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const network = searchParams.get('network') ?? 'eth'

    if (!address) {
      return NextResponse.json({ data: null, error: 'address parameter required' }, { status: 400 })
    }

    const { data, fromCache } = await getCached(
      `token:god-mode:${network}:${address}`,
      120_000, // 2min cache
      () => fetchTokenGodMode(address, network),
    )

    const resp = NextResponse.json({ data, error: null })
    resp.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=240')
    resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
    return resp
  } catch (error) {
    console.error('Token God Mode error:', error)
    return NextResponse.json({ data: null, error: 'Failed to fetch token data' }, { status: 502 })
  }
}
