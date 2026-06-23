// ─────────────────────────────────────────────────────────────
// GET /api/v1/protocol-revenue — Protocol Revenue Intelligence
// Top protocols by fees & revenue from DeFiLlama (free, no key)
// Supports: chain filter, category filter, sort, limit, timeframe
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getCached } from '@/lib/api/server-cache'

interface ProtocolRevenue {
  defillamaId: string
  name: string
  displayName: string
  category: string
  chains: string[]
  logo: string | null
  module: string
  methodology: Record<string, string> | null
  fees24h: number
  fees48hto24h: number
  fees7d: number
  fees30d: number
  fees1y: number
  feesAllTime: number
  change1d: number | null
  change7d: number | null
  change1m: number | null
  chainBreakdown24h: Record<string, Record<string, number>>
  annualized: number
}

interface Aggregates {
  totalFees24h: number
  totalFees7d: number
  totalFees30d: number
  totalFees1y: number
  totalFeesAllTime: number
  change1d: number | null
  change7d: number | null
  change1m: number | null
  protocolCount: number
  chainCount: number
  categoryBreakdown: Record<string, { count: number; fees24h: number; fees30d: number }>
}

interface RevenueResponse {
  aggregates: Aggregates
  protocols: ProtocolRevenue[]
}

async function fetchProtocolRevenue(): Promise<RevenueResponse> {
  const url = 'https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })

  if (!res.ok) throw new Error(`DeFiLlama fees API error: ${res.status}`)

  const data = (await res.json()) as {
    total24h: number
    total7d: number
    total30d: number
    total1y: number
    totalAllTime: number
    change_1d: number | null
    change_7d: number | null
    change_1m: number | null
    allChains: string[]
    protocols: Array<{
      defillamaId?: string
      name?: string
      displayName?: string
      category?: string
      chains?: string[]
      logo?: string
      module?: string
      methodology?: Record<string, string>
      total24h?: number
      total48hto24h?: number
      total7d?: number
      total30d?: number
      total1y?: number
      annualized1y?: number
      totalAllTime?: number
      change_1d?: number | null
      change_7d?: number | null
      change_1m?: number | null
      breakdown24h?: Record<string, Record<string, number>>
    }>
  }

  // Category breakdown
  const categoryBreakdown: Record<string, { count: number; fees24h: number; fees30d: number }> = {}
  for (const p of data.protocols) {
    const cat = p.category ?? 'Unknown'
    const existing = categoryBreakdown[cat] ?? { count: 0, fees24h: 0, fees30d: 0 }
    existing.count += 1
    existing.fees24h += p.total24h ?? 0
    existing.fees30d += p.total30d ?? 0
    categoryBreakdown[cat] = existing
  }

  const aggregates: Aggregates = {
    totalFees24h: data.total24h ?? 0,
    totalFees7d: data.total7d ?? 0,
    totalFees30d: data.total30d ?? 0,
    totalFees1y: data.total1y ?? 0,
    totalFeesAllTime: data.totalAllTime ?? 0,
    change1d: data.change_1d ?? null,
    change7d: data.change_7d ?? null,
    change1m: data.change_1m ?? null,
    protocolCount: data.protocols.length,
    chainCount: data.allChains?.length ?? 0,
    categoryBreakdown,
  }

  const protocols: ProtocolRevenue[] = data.protocols.map((p) => ({
    defillamaId: p.defillamaId ?? '',
    name: p.name ?? 'Unknown',
    displayName: p.displayName ?? p.name ?? 'Unknown',
    category: p.category ?? 'Unknown',
    chains: p.chains ?? [],
    logo: p.logo ?? null,
    module: p.module ?? '',
    methodology: p.methodology ?? null,
    fees24h: p.total24h ?? 0,
    fees48hto24h: p.total48hto24h ?? 0,
    fees7d: p.total7d ?? 0,
    fees30d: p.total30d ?? 0,
    fees1y: p.total1y ?? 0,
    feesAllTime: p.totalAllTime ?? 0,
    change1d: p.change_1d ?? null,
    change7d: p.change_7d ?? null,
    change1m: p.change_1m ?? null,
    chainBreakdown24h: p.breakdown24h ?? {},
    annualized: p.annualized1y ?? 0,
  }))

  return { aggregates, protocols }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain')?.toLowerCase()
  const category = searchParams.get('category')?.toLowerCase()
  const sort = searchParams.get('sort') ?? 'fees24h'
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)))
  const minFees24h = Number(searchParams.get('minFees24h') ?? 0)

  try {
    const { data, fromCache } = await getCached('protocol-revenue', 300_000, fetchProtocolRevenue) // 5min

    let filtered = data.protocols

    // Filter by chain
    if (chain) {
      filtered = filtered.filter((p) =>
        p.chains.some((c) => c.toLowerCase() === chain)
      )
    }

    // Filter by category
    if (category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category)
    }

    // Filter by minimum fees
    if (minFees24h > 0) {
      filtered = filtered.filter((p) => p.fees24h >= minFees24h)
    }

    // Sort
    const sortKey = sort as keyof ProtocolRevenue
    const validSortKeys = ['fees24h', 'fees7d', 'fees30d', 'fees1y', 'feesAllTime', 'change1d', 'change7d', 'change1m', 'name', 'category']
    const effectiveSort = validSortKeys.includes(sortKey) ? sortKey : 'fees24h'

    filtered.sort((a, b) => {
      const aVal = a[effectiveSort]
      const bVal = b[effectiveSort]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      const aNum = Number(aVal) || 0
      const bNum = Number(bVal) || 0
      return order === 'asc' ? aNum - bNum : bNum - aNum
    })

    const sliced = filtered.slice(0, limit)

    // Rebuild aggregates for filtered set
    const filteredAggregates: Aggregates = {
      ...data.aggregates,
      protocolCount: sliced.length,
    }

    if (chain || category || minFees24h > 0) {
      filteredAggregates.totalFees24h = sliced.reduce((s, p) => s + p.fees24h, 0)
      filteredAggregates.totalFees7d = sliced.reduce((s, p) => s + p.fees7d, 0)
      filteredAggregates.totalFees30d = sliced.reduce((s, p) => s + p.fees30d, 0)
      filteredAggregates.totalFees1y = sliced.reduce((s, p) => s + p.fees1y, 0)
    }

    const resp = NextResponse.json({
      data: {
        aggregates: filteredAggregates,
        protocols: sliced,
      },
      meta: {
        total: filtered.length,
        limit,
        sort: effectiveSort,
        order,
        chain: chain ?? null,
        category: category ?? null,
      },
      error: null,
    })
    resp.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    resp.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
    return resp
  } catch (error) {
    console.error('[protocol-revenue] Error:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to fetch protocol revenue data' },
      { status: 502 }
    )
  }
}
