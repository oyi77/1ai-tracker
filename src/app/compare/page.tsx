"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'

interface MarketAsset {
  name: string
  symbol: string
  price: number
  change: number
  category: string
  [key: string]: unknown
}

export default function ComparePage() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchMarket = useCallback(async () => {
    try {
      const [marketRes, macroRes] = await Promise.allSettled([
        fetch('/api/v1/market/prices').then(r => r.json()),
        fetch('/api/v1/macro').then(r => r.json()),
      ])

      const allAssets: MarketAsset[] = []

      // Market tickers
      if (marketRes.status === 'fulfilled' && marketRes.value?.tickers) {
        for (const t of marketRes.value.tickers) {
          const changeStr = (t.change as string || '').replace('%', '').replace('+', '')
          allAssets.push({
            name: t.symbol as string,
            symbol: t.symbol as string,
            price: parseFloat((t.price as string || '0').replace(/[$,]/g, '')),
            change: parseFloat(changeStr) || 0,
            category: ['BTC', 'ETH', 'SOL'].includes(t.symbol) ? 'Crypto' : 'Traditional',
          })
        }
      }

      // Macro indicators
      if (macroRes.status === 'fulfilled' && macroRes.value?.data?.indicators) {
        for (const ind of macroRes.value.data.indicators) {
          allAssets.push({
            name: ind.name as string,
            symbol: ind.id as string,
            price: ind.latestValue as number,
            change: ind.changePercent as number || 0,
            category: 'Macro',
          })
        }
      }

      setAssets(allAssets)
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchMarket()
    const interval = setInterval(fetchMarket, 60_000)
    return () => clearInterval(interval)
  }, [fetchMarket])

  const columns: Column<MarketAsset>[] = [
    {
      key: 'category',
      header: 'Category',
      width: 80,
      render: (row) => (
        <span className={`text-[10px] font-mono ${
          row.category === 'Crypto' ? 'text-teal-vivid' :
          row.category === 'Macro' ? 'text-data-purple' :
          'text-data-info'
        }`}>
          {row.category}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Asset',
      width: 150,
      render: (row) => <span className="text-text-primary font-medium">{row.name}</span>,
    },
    {
      key: 'price',
      header: 'Value',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.price} size="sm" />,
    },
    {
      key: 'change',
      header: 'Change',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change} size="xs" />,
    },
  ]

  const cryptoAssets = assets.filter(a => a.category === 'Crypto')
  const macroAssets = assets.filter(a => a.category === 'Macro')
  const tradAssets = assets.filter(a => a.category === 'Traditional')

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Cross-Market Comparison</h1>
            <p className="text-[11px] text-text-muted font-mono">Crypto, forex, commodities, and macro indicators</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Crypto', count: cryptoAssets.length, color: 'text-teal-vivid' },
            { label: 'Traditional', count: tradAssets.length, color: 'text-data-info' },
            { label: 'Macro', count: macroAssets.length, color: 'text-data-purple' },
          ].map((cat, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">{cat.label}</div>
              <div className={`text-[16px] font-head font-bold tabular-nums ${cat.color}`}>{cat.count} assets</div>
            </div>
          ))}
        </div>

        {/* Market Table */}
        <Panel
          title="Market Overview"
          subtitle="All tracked assets"
          liveStatus={feedStatus}
          onRefresh={fetchMarket}
          maxHeight={600}
        >
          <DataTable
            columns={columns}
            data={assets}
            sortable
            rowHeight={28}
            emptyState={<div className="text-text-muted text-[11px] p-4">Loading market data...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
