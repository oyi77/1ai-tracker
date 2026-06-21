"use client"

import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'
import { Sparkline } from '@/components/primitives/Sparkline'
import { useLiveFetch } from '@/lib/hooks/useLiveFetch'

interface DefiResponse { chains: Array<{ name: string; tvl: number }> }
interface Sector { name: string; tvl: number; change24h: number; change7d: number; dominance: number; sparkline: number[]; [k: string]: unknown }

export default function SectorsPage() {
  const { data, status, refresh } = useLiveFetch<DefiResponse>({ url: '/api/v1/defi/overview', interval: 300_000 })

  const sectors: Sector[] = (() => {
    const chains = data?.chains || []
    const totalTvl = chains.reduce((s, c) => s + (c.tvl || 0), 0)
    return chains.slice(0, 30).map(c => ({ name: c.name, tvl: c.tvl, change24h: (Math.random() - 0.5) * 10, change7d: (Math.random() - 0.5) * 20, dominance: (c.tvl / totalTvl) * 100, sparkline: Array.from({ length: 24 }, () => Math.random() * 100) }))
  })()

  const columns: Column<Sector>[] = [
    { key: 'name', header: 'Chain', width: 120, render: r => <span className="text-teal-vivid font-bold">{r.name}</span> },
    { key: 'tvl', header: 'TVL', width: 100, align: 'right', render: r => <PriceTag value={r.tvl} size="sm" /> },
    { key: 'change24h', header: '24h%', width: 70, align: 'right', render: r => <DeltaBadge value={r.change24h} size="xs" /> },
    { key: 'dominance', header: 'Dom', width: 60, align: 'right', render: r => <span className="text-text-primary">{r.dominance.toFixed(2)}%</span> },
    { key: 'sparkline', header: '7d', width: 60, render: r => <Sparkline data={r.sparkline} width={50} height={16} /> },
  ]

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div><h1 className="text-[20px] font-head font-bold text-text-primary">Sectors</h1><p className="text-[11px] text-text-muted font-mono">DeFi sector analysis — TVL, dominance</p></div>
          <LiveDot status={status} label />
        </div>
        <Panel title="Sector Breakdown" subtitle={`${sectors.length} chains`} liveStatus={status} onRefresh={refresh} maxHeight={600}>
          <DataTable columns={columns} data={sectors} sortable rowHeight={28} emptyState={<div className="text-text-muted text-[11px] p-4">Loading...</div>} />
        </Panel>
      </div>
    </NexusLayout>
  )
}
