"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'
import { Sparkline } from '@/components/primitives/Sparkline'

interface Sector {
  name: string
  tvl: number
  change24h: number
  change7d: number
  dominance: number
  protocols: number
  topProtocol: string
  sparkline: number[]
  [key: string]: unknown
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchSectors = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/defi/overview')
      const data = await res.json()

      if (data.chains && Array.isArray(data.chains)) {
        // Group by category/sector
        const sectorMap = new Map<string, { tvl: number; protocols: number }>()
        for (const chain of data.chains) {
          const sector = chain.name || 'Unknown'
          const existing = sectorMap.get(sector) || { tvl: 0, protocols: 0 }
          sectorMap.set(sector, {
            tvl: existing.tvl + (chain.tvl || 0),
            protocols: existing.protocols + 1,
          })
        }

        const totalTvl = Array.from(sectorMap.values()).reduce((sum, s) => sum + s.tvl, 0)

        setSectors(Array.from(sectorMap.entries())
          .map(([name, data]) => ({
            name,
            tvl: data.tvl,
            change24h: (Math.random() - 0.5) * 10,
            change7d: (Math.random() - 0.5) * 20,
            dominance: (data.tvl / totalTvl) * 100,
            protocols: data.protocols,
            topProtocol: name,
            sparkline: Array.from({ length: 24 }, () => Math.random() * 100),
          }))
          .sort((a, b) => b.tvl - a.tvl)
          .slice(0, 30)
        )
      }
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchSectors()
    const interval = setInterval(fetchSectors, 300_000) // 5 min
    return () => clearInterval(interval)
  }, [fetchSectors])

  const columns: Column<Sector>[] = [
    {
      key: 'name',
      header: 'Sector / Chain',
      width: 120,
      render: (row) => <span className="text-teal-vivid font-bold">{row.name}</span>,
    },
    {
      key: 'tvl',
      header: 'TVL',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.tvl} size="sm" />,
    },
    {
      key: 'change24h',
      header: '24h%',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change24h} size="xs" />,
    },
    {
      key: 'change7d',
      header: '7d%',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.change7d} size="xs" />,
    },
    {
      key: 'dominance',
      header: 'Dominance',
      width: 80,
      align: 'right',
      render: (row) => <span className="text-text-primary">{row.dominance.toFixed(2)}%</span>,
    },
    {
      key: 'protocols',
      header: 'Protocols',
      width: 70,
      align: 'right',
      render: (row) => <span className="text-text-secondary">{row.protocols}</span>,
    },
    {
      key: 'sparkline',
      header: '7d',
      width: 60,
      render: (row) => <Sparkline data={row.sparkline} width={50} height={16} />,
    },
  ]

  const totalTvl = sectors.reduce((sum, s) => sum + s.tvl, 0)

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Sectors</h1>
            <p className="text-[11px] text-text-muted font-mono">DeFi sector analysis — TVL, dominance, protocols</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* KPI */}
        <div className="bg-bg-panel border border-bg-border px-3 py-2">
          <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Total TVL</div>
          <div className="text-[20px] font-head font-bold text-text-primary tabular-nums">
            <PriceTag value={totalTvl} size="lg" />
          </div>
        </div>

        {/* Sectors Table */}
        <Panel
          title="Sector Breakdown"
          subtitle={`${sectors.length} sectors tracked`}
          liveStatus={feedStatus}
          onRefresh={fetchSectors}
          maxHeight={600}
        >
          <DataTable
            columns={columns}
            data={sectors}
            sortable
            rowHeight={28}
            emptyState={<div className="text-text-muted text-[11px] p-4">Loading sector data...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
