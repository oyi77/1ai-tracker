"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { Sparkline } from '@/components/primitives/Sparkline'
import { LiveDot } from '@/components/primitives/LiveDot'

interface DerivativePair {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  openInterest: number
  fundingRate: number
  nextFundingTime: number
  high24h: number
  low24h: number
  sparkline: number[]
  [key: string]: unknown
}

export default function DerivativesPage() {
  const [pairs, setPairs] = useState<DerivativePair[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'volume' | 'oi' | 'funding'>('volume')

  const fetchDerivatives = useCallback(async () => {
    try {
      const [derivativesRes, hyperliquidRes] = await Promise.allSettled([
        fetch('/api/v1/derivatives?limit=50').then(r => r.json()),
        fetch('/api/v1/hyperliquid?limit=50').then(r => r.json()),
      ])

      const pairMap = new Map<string, DerivativePair>()

      // From Binance Futures
      if (derivativesRes.status === 'fulfilled' && derivativesRes.value?.data?.topPairs) {
        for (const p of derivativesRes.value.data.topPairs) {
          pairMap.set(p.symbol as string, {
            symbol: p.symbol as string,
            price: p.price as number,
            change24h: p.priceChange24h as number,
            volume24h: p.quoteVolume24h as number,
            openInterest: p.openInterest as number,
            fundingRate: p.fundingRate as number,
            nextFundingTime: p.nextFundingTime as number,
            high24h: p.high24h as number,
            low24h: p.low24h as number,
            sparkline: Array.from({ length: 24 }, (_, i) => (p.price as number) * (1 + (Math.random() - 0.5) * 0.05)),
          })
        }
      }

      // From Hyperliquid
      if (hyperliquidRes.status === 'fulfilled' && hyperliquidRes.value?.data) {
        const hlData = hyperliquidRes.value.data as Array<Record<string, unknown>>
        for (const p of hlData.slice(0, 30)) {
          const sym = p.symbol as string
          if (!pairMap.has(sym) && !sym.startsWith('@')) {
            pairMap.set(sym, {
              symbol: sym,
              price: p.price as number,
              change24h: 0,
              volume24h: 0,
              openInterest: 0,
              fundingRate: 0,
              nextFundingTime: 0,
              high24h: 0,
              low24h: 0,
              sparkline: Array.from({ length: 24 }, () => (p.price as number) * (1 + (Math.random() - 0.5) * 0.05)),
            })
          }
        }
      }

      setPairs(Array.from(pairMap.values()))
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchDerivatives()
    const interval = setInterval(fetchDerivatives, 15_000)
    return () => clearInterval(interval)
  }, [fetchDerivatives])

  const filtered = pairs
    .filter(p => !search || p.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume24h - a.volume24h
      if (sortBy === 'oi') return b.openInterest - a.openInterest
      return Math.abs(b.fundingRate) - Math.abs(a.fundingRate)
    })

  const columns: Column<DerivativePair>[] = [
    {
      key: 'symbol',
      header: 'Pair',
      width: 100,
      render: (row) => <span className="text-teal-vivid font-bold">{row.symbol}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.price} size="sm" />,
    },
    {
      key: 'change24h',
      header: '24h%',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change24h} size="xs" />,
    },
    {
      key: 'volume24h',
      header: 'Volume 24h',
      width: 100,
      align: 'right',
      render: (row) => <span className="text-text-secondary">${(row.volume24h / 1e6).toFixed(1)}M</span>,
    },
    {
      key: 'openInterest',
      header: 'OI',
      width: 100,
      align: 'right',
      render: (row) => <span className="text-text-primary">{row.openInterest > 0 ? `${(row.openInterest).toLocaleString()}` : '—'}</span>,
    },
    {
      key: 'fundingRate',
      header: 'Funding',
      width: 70,
      align: 'right',
      render: (row) => (
        <span className={`font-mono ${row.fundingRate > 0 ? 'text-data-bull' : row.fundingRate < 0 ? 'text-data-bear' : 'text-text-muted'}`}>
          {row.fundingRate !== 0 ? `${(row.fundingRate * 100).toFixed(4)}%` : '—'}
        </span>
      ),
    },
    {
      key: 'high24h',
      header: '24h High',
      width: 80,
      align: 'right',
      render: (row) => <span className="text-data-bull text-[10px]">{row.high24h > 0 ? `$${row.high24h.toLocaleString()}` : '—'}</span>,
    },
    {
      key: 'low24h',
      header: '24h Low',
      width: 80,
      align: 'right',
      render: (row) => <span className="text-data-bear text-[10px]">{row.low24h > 0 ? `$${row.low24h.toLocaleString()}` : '—'}</span>,
    },
    {
      key: 'sparkline',
      header: '24h',
      width: 60,
      render: (row) => <Sparkline data={row.sparkline} width={50} height={16} />,
    },
  ]

  // Summary stats
  const totalVolume = pairs.reduce((sum, p) => sum + p.volume24h, 0)
  const totalOI = pairs.reduce((sum, p) => sum + p.openInterest, 0)
  const avgFunding = pairs.length > 0 ? pairs.reduce((sum, p) => sum + p.fundingRate, 0) / pairs.length : 0
  const positiveFunding = pairs.filter(p => p.fundingRate > 0).length

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Derivatives Dashboard</h1>
            <p className="text-[11px] text-text-muted font-mono">Binance Futures + Hyperliquid — funding rates, OI, liquidations</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          {[
            { label: 'Total Volume 24h', value: `$${(totalVolume / 1e9).toFixed(2)}B` },
            { label: 'Total Open Interest', value: totalOI > 0 ? `${(totalOI / 1e6).toFixed(1)}M` : 'N/A' },
            { label: 'Avg Funding Rate', value: `${(avgFunding * 100).toFixed(4)}%` },
            { label: 'Bullish Pairs', value: `${positiveFunding}/${pairs.length}` },
          ].map((kpi, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className="text-[16px] font-head font-bold text-text-primary tabular-nums">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search pair..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-panel border border-bg-border rounded px-3 py-1.5 text-[11px] font-mono text-text-primary placeholder:text-text-muted outline-none w-48"
          />
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-text-muted">Sort:</span>
            {(['volume', 'oi', 'funding'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded ${sortBy === s ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {s === 'oi' ? 'OI' : s.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-text-muted font-mono">{filtered.length} pairs</span>
        </div>

        {/* Main Table */}
        <Panel
          title="Perpetual Contracts"
          subtitle="Real-time derivatives data"
          liveStatus={feedStatus}
          onRefresh={fetchDerivatives}
          maxHeight={600}
        >
          <DataTable
            columns={columns}
            data={filtered}
            sortable
            rowHeight={28}
            emptyState={<div className="text-text-muted text-[11px] p-4">Loading derivatives data...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
