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
interface FlowEvent { exchange: string; type: 'deposit' | 'withdrawal'; token: string; amountUsd: number; timestamp: string; [k: string]: unknown }
interface FlowResponse { data: FlowEvent[] }
interface Flow { chain: string; inflow: number | null; outflow: number | null; net: number | null; topIn: { entity: string; amount: number | null }; topOut: { entity: string; amount: number | null }; sparkline: number[]; [k: string]: unknown }

export default function FlowsPage() {
  const { data: exchanges, status, refresh } = useLiveFetch<ExchangeData>({ url: '/api/v1/exchanges?limit=10', interval: 60_000 })
  const { data: flowData } = useLiveFetch<FlowResponse>({ url: '/api/v1/exchange-flow', interval: 60_000 })

  const flows: Flow[] = (() => {
    const result: Flow[] = []

    // Aggregate real exchange-flow events by exchange
    const events = flowData?.data || []
    const byExchange: Record<string, { deposits: number; withdrawals: number }> = {}
    for (const ev of events) {
      const key = ev.exchange?.toLowerCase() || ''
      if (!byExchange[key]) byExchange[key] = { deposits: 0, withdrawals: 0 }
      if (ev.type === 'deposit') byExchange[key].deposits += ev.amountUsd || 0
      else byExchange[key].withdrawals += ev.amountUsd || 0
    }

    for (const [ex, tickers] of Object.entries(exchanges?.data || {})) {
      if (!Array.isArray(tickers) || !tickers.length) continue
      const flow = byExchange[ex.toLowerCase()]
      const inflow = flow ? flow.deposits : null
      const outflow = flow ? flow.withdrawals : null
      const net = flow ? flow.withdrawals - flow.deposits : null
      result.push({
        chain: ex.charAt(0).toUpperCase() + ex.slice(1),
        inflow,
        outflow,
        net,
        topIn: { entity: '—', amount: null },
        topOut: { entity: '—', amount: null },
        sparkline: [],
      })
    }
    return result
  })()

  const columns: Column<Flow>[] = [
    { key: 'chain', header: 'Chain', width: 120, render: r => <span className="text-teal-vivid font-bold">{r.chain}</span> },
    { key: 'inflow', header: 'Inflow', width: 100, align: 'right', render: r => r.inflow != null ? <PriceTag value={r.inflow} size="sm" /> : <span className="text-text-muted text-[11px] font-mono">—</span> },
    { key: 'outflow', header: 'Outflow', width: 100, align: 'right', render: r => r.outflow != null ? <PriceTag value={r.outflow} size="sm" /> : <span className="text-text-muted text-[11px] font-mono">—</span> },
    { key: 'net', header: 'Net', width: 100, align: 'right', render: r => r.net != null ? <span className={`font-mono ${r.net > 0 ? 'text-data-bull' : 'text-data-bear'}`}>{r.net > 0 ? '+' : ''}${(r.net / 1e6).toFixed(2)}M</span> : <span className="text-text-muted text-[11px] font-mono">—</span> },
    { key: 'topIn', header: 'Top Inflow', width: 150, render: r => r.topIn.amount != null ? <div className="flex items-center gap-1"><EntityLabel type="whale" size="xs" /><PriceTag value={r.topIn.amount} size="xs" /></div> : <span className="text-text-muted text-[11px] font-mono">No data</span> },
    { key: 'sparkline', header: '24h', width: 60, render: r => <Sparkline data={r.sparkline} width={50} height={16} /> },
  ]

  const hasFlowData = flows.some(f => f.net != null)
  const totalNet = hasFlowData ? flows.reduce((s, f) => s + (f.net ?? 0), 0) : null

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div><h1 className="text-[20px] font-head font-bold text-text-primary">Capital Flows</h1><p className="text-[11px] text-text-muted font-mono">Cross-chain and cross-exchange capital movement</p></div>
          <LiveDot status={status} label />
        </div>
        <div className="bg-bg-panel border border-bg-border px-3 py-2">
          <div className="text-[10px] text-text-muted font-mono uppercase mb-1">Net Flow 24h</div>
          {totalNet != null ? (
            <div className={`text-[20px] font-head font-bold tabular-nums ${totalNet > 0 ? 'text-data-bull' : 'text-data-bear'}`}>{totalNet > 0 ? '+' : ''}${(totalNet / 1e6).toFixed(1)}M</div>
          ) : (
            <div className="text-[20px] font-head font-bold text-text-muted">—</div>
          )}
        </div>
        <Panel title="Capital Flows" subtitle="By chain and exchange" liveStatus={status} onRefresh={refresh} maxHeight={600}>
          <DataTable columns={columns} data={flows} sortable rowHeight={32} emptyState={<div className="text-text-muted text-[11px] p-4">No flow data available</div>} />
        </Panel>
      </div>
    </NexusLayout>
  )
}
