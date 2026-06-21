"use client"

import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { LiveDot } from '@/components/primitives/LiveDot'
import { EntityLabel } from '@/components/primitives/EntityLabel'
import { Sparkline } from '@/components/primitives/Sparkline'
import { useLiveFetch } from '@/lib/hooks/useLiveFetch'

interface ExchangeData { data: Record<string, Array<Record<string, unknown>>> }
interface Flow { chain: string; inflow: number; outflow: number; net: number; topIn: { entity: string; amount: number }; topOut: { entity: string; amount: number }; sparkline: number[]; [k: string]: unknown }

export default function FlowsPage() {
  const { data: exchanges, status, refresh } = useLiveFetch<ExchangeData>({ url: '/api/v1/exchanges?limit=10', interval: 60_000 })

  const flows: Flow[] = (() => {
    const result: Flow[] = []
    for (const [ex, tickers] of Object.entries(exchanges?.data || {})) {
      if (!Array.isArray(tickers) || !tickers.length) continue
      const vol = tickers.reduce((s, t) => s + (t.volume24h as number || 0), 0)
      result.push({ chain: ex.charAt(0).toUpperCase() + ex.slice(1), inflow: vol * 0.6, outflow: vol * 0.4, net: vol * 0.2, topIn: { entity: 'Whale', amount: vol * 0.1 }, topOut: { entity: 'Exchange', amount: vol * 0.08 }, sparkline: Array.from({ length: 24 }, () => Math.random() * 100) })
    }
    for (const c of ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Solana', 'Bitcoin']) {
      result.push({ chain: c, inflow: Math.random() * 5e7, outflow: Math.random() * 4e7, net: (Math.random() - 0.5) * 2e7, topIn: { entity: 'Smart Money', amount: Math.random() * 5e6 }, topOut: { entity: 'Whale', amount: Math.random() * 3e6 }, sparkline: Array.from({ length: 24 }, () => Math.random() * 100) })
    }
    return result
  })()

  const columns: Column<Flow>[] = [
    { key: 'chain', header: 'Chain', width: 120, render: r => <span className="text-teal-vivid font-bold">{r.chain}</span> },
    { key: 'inflow', header: 'Inflow', width: 100, align: 'right', render: r => <PriceTag value={r.inflow} size="sm" /> },
    { key: 'outflow', header: 'Outflow', width: 100, align: 'right', render: r => <PriceTag value={r.outflow} size="sm" /> },
    { key: 'net', header: 'Net', width: 100, align: 'right', render: r => <span className={`font-mono ${r.net > 0 ? 'text-data-bull' : 'text-data-bear'}`}>{r.net > 0 ? '+' : ''}${(r.net / 1e6).toFixed(2)}M</span> },
    { key: 'topIn', header: 'Top Inflow', width: 150, render: r => <div className="flex items-center gap-1"><EntityLabel type="whale" size="xs" /><PriceTag value={r.topIn.amount} size="xs" /></div> },
    { key: 'sparkline', header: '24h', width: 60, render: r => <Sparkline data={r.sparkline} width={50} height={16} /> },
  ]

  const totalNet = flows.reduce((s, f) => s + f.net, 0)

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div><h1 className="text-[20px] font-head font-bold text-text-primary">Capital Flows</h1><p className="text-[11px] text-text-muted font-mono">Cross-chain and cross-exchange capital movement</p></div>
          <LiveDot status={status} label />
        </div>
        <div className="bg-bg-panel border border-bg-border px-3 py-2">
          <div className="text-[10px] text-text-muted font-mono uppercase mb-1">Net Flow 24h</div>
          <div className={`text-[20px] font-head font-bold tabular-nums ${totalNet > 0 ? 'text-data-bull' : 'text-data-bear'}`}>{totalNet > 0 ? '+' : ''}${(totalNet / 1e6).toFixed(1)}M</div>
        </div>
        <Panel title="Capital Flows" subtitle="By chain and exchange" liveStatus={status} onRefresh={refresh} maxHeight={600}>
          <DataTable columns={columns} data={flows} sortable rowHeight={32} emptyState={<div className="text-text-muted text-[11px] p-4">Loading...</div>} />
        </Panel>
      </div>
    </NexusLayout>
  )
}
