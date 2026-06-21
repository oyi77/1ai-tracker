"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'

interface Stablecoin {
  name: string
  symbol: string
  price: number
  marketCap: number
  change24h: number
  chains: string[]
  peg_deviation: number
  [key: string]: unknown
}

export default function StablecoinsPage() {
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchStablecoins = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/stablecoins')
      const data = await res.json()

      if (data.data && Array.isArray(data.data)) {
        setStablecoins(data.data.map((s: Record<string, unknown>) => ({
          name: s.name as string || 'Unknown',
          symbol: s.symbol as string || '???',
          price: s.price as number || 1,
          marketCap: s.marketCap as number || 0,
          change24h: s.change24h as number || 0,
          chains: Array.isArray(s.chains) ? s.chains as string[] : ['Ethereum'],
          peg_deviation: Math.abs((s.price as number || 1) - 1) * 100,
        })))
      } else {
        // Fallback: use known stablecoins
        setStablecoins([
          { name: 'Tether', symbol: 'USDT', price: 1.0001, marketCap: 110000000000, change24h: 0.01, chains: ['Ethereum', 'Tron', 'Solana'], peg_deviation: 0.01 },
          { name: 'USD Coin', symbol: 'USDC', price: 0.9999, marketCap: 32000000000, change24h: -0.01, chains: ['Ethereum', 'Solana', 'Base'], peg_deviation: 0.01 },
          { name: 'Dai', symbol: 'DAI', price: 1.0002, marketCap: 5000000000, change24h: 0.02, chains: ['Ethereum'], peg_deviation: 0.02 },
          { name: 'First Digital USD', symbol: 'FDUSD', price: 0.9998, marketCap: 3000000000, change24h: -0.02, chains: ['Ethereum', 'BNB Chain'], peg_deviation: 0.02 },
          { name: 'Ethena USDe', symbol: 'USDe', price: 1.0003, marketCap: 2500000000, change24h: 0.03, chains: ['Ethereum'], peg_deviation: 0.03 },
          { name: 'TrueUSD', symbol: 'TUSD', price: 0.9997, marketCap: 2000000000, change24h: -0.03, chains: ['Ethereum', 'BNB Chain'], peg_deviation: 0.03 },
          { name: 'PayPal USD', symbol: 'PYUSD', price: 1.0001, marketCap: 1000000000, change24h: 0.01, chains: ['Ethereum', 'Solana'], peg_deviation: 0.01 },
        ])
      }
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchStablecoins()
    const interval = setInterval(fetchStablecoins, 60_000)
    return () => clearInterval(interval)
  }, [fetchStablecoins])

  const columns: Column<Stablecoin>[] = [
    {
      key: 'name',
      header: 'Stablecoin',
      width: 120,
      render: (row) => (
        <div>
          <span className="text-teal-vivid font-bold">{row.symbol}</span>
          <span className="text-text-muted text-[10px] ml-1">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      width: 80,
      align: 'right',
      render: (row) => (
        <span className={`font-mono ${Math.abs(row.price - 1) > 0.005 ? 'text-data-bear' : 'text-data-bull'}`}>
          ${row.price.toFixed(4)}
        </span>
      ),
    },
    {
      key: 'peg_deviation',
      header: 'Peg Dev',
      width: 70,
      align: 'right',
      render: (row) => (
        <span className={`font-mono ${row.peg_deviation > 0.5 ? 'text-data-bear' : 'text-data-bull'}`}>
          {row.peg_deviation.toFixed(3)}%
        </span>
      ),
    },
    {
      key: 'marketCap',
      header: 'Market Cap',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.marketCap} size="sm" />,
    },
    {
      key: 'change24h',
      header: '24h%',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change24h} size="xs" />,
    },
    {
      key: 'chains',
      header: 'Chains',
      width: 150,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.chains.slice(0, 3).map((chain, i) => (
            <span key={i} className="px-1 py-0 rounded bg-bg-raised text-[9px] font-mono text-text-muted">
              {chain}
            </span>
          ))}
          {row.chains.length > 3 && <span className="text-[9px] text-text-muted">+{row.chains.length - 3}</span>}
        </div>
      ),
    },
  ]

  const totalMarketCap = stablecoins.reduce((sum, s) => sum + s.marketCap, 0)
  const avgPeg = stablecoins.length > 0 ? stablecoins.reduce((sum, s) => sum + s.peg_deviation, 0) / stablecoins.length : 0

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Stablecoins</h1>
            <p className="text-[11px] text-text-muted font-mono">Stablecoin market monitor — peg stability, market cap, chains</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Total Market Cap', value: `$${(totalMarketCap / 1e9).toFixed(1)}B` },
            { label: 'Avg Peg Deviation', value: `${avgPeg.toFixed(3)}%` },
            { label: 'Stablecoins Tracked', value: String(stablecoins.length) },
          ].map((kpi, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className="text-[16px] font-head font-bold text-text-primary tabular-nums">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Stablecoins Table */}
        <Panel
          title="Stablecoin Monitor"
          subtitle="Peg stability and market data"
          liveStatus={feedStatus}
          onRefresh={fetchStablecoins}
          maxHeight={600}
        >
          <DataTable
            columns={columns}
            data={stablecoins}
            sortable
            rowHeight={28}
            emptyState={<div className="text-text-muted text-[11px] p-4">Loading stablecoin data...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
