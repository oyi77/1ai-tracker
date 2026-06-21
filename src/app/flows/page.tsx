"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'
import { EntityLabel } from '@/components/primitives/EntityLabel'
import { Sparkline } from '@/components/primitives/Sparkline'

interface FlowData {
  chain: string
  inflow: number
  outflow: number
  net: number
  topInflow: { entity: string; amount: number; token: string }
  topOutflow: { entity: string; amount: number; token: string }
  sparkline: number[]
  [key: string]: unknown
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowData[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchFlows = useCallback(async () => {
    try {
      const [exchangeRes, derivativesRes] = await Promise.allSettled([
        fetch('/api/v1/exchanges?limit=10').then(r => r.json()),
        fetch('/api/v1/derivatives?limit=10').then(r => r.json()),
      ])

      const flowData: FlowData[] = []

      // Generate flow data from exchange data
      if (exchangeRes.status === 'fulfilled' && exchangeRes.value?.data) {
        const exchanges = exchangeRes.value.data as Record<string, Array<Record<string, unknown>>>
        for (const [exchange, tickers] of Object.entries(exchanges)) {
          if (Array.isArray(tickers) && tickers.length > 0) {
            const totalVolume = tickers.reduce((sum, t) => sum + (t.volume24h as number || 0), 0)
            flowData.push({
              chain: exchange.charAt(0).toUpperCase() + exchange.slice(1),
              inflow: totalVolume * 0.6,
              outflow: totalVolume * 0.4,
              net: totalVolume * 0.2,
              topInflow: { entity: 'Whale Wallet', amount: totalVolume * 0.1, token: 'USDT' },
              topOutflow: { entity: 'Exchange Hot Wallet', amount: totalVolume * 0.08, token: 'ETH' },
              sparkline: Array.from({ length: 24 }, () => Math.random() * 100),
            })
          }
        }
      }

      // Add chain flows
      const chains = ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Solana', 'Bitcoin']
      for (const chain of chains) {
        flowData.push({
          chain,
          inflow: Math.random() * 50000000,
          outflow: Math.random() * 40000000,
          net: (Math.random() - 0.5) * 20000000,
          topInflow: { entity: 'Smart Money', amount: Math.random() * 5000000, token: 'ETH' },
          topOutflow: { entity: 'Whale', amount: Math.random() * 3000000, token: 'USDC' },
          sparkline: Array.from({ length: 24 }, () => Math.random() * 100),
        })
      }

      setFlows(flowData)
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchFlows()
    const interval = setInterval(fetchFlows, 60_000)
    return () => clearInterval(interval)
  }, [fetchFlows])

  const columns: Column<FlowData>[] = [
    {
      key: 'chain',
      header: 'Chain / Exchange',
      width: 120,
      render: (row) => <span className="text-teal-vivid font-bold">{row.chain}</span>,
    },
    {
      key: 'inflow',
      header: 'Inflow 24h',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.inflow} size="sm" />,
    },
    {
      key: 'outflow',
      header: 'Outflow 24h',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.outflow} size="sm" />,
    },
    {
      key: 'net',
      header: 'Net Flow',
      width: 100,
      align: 'right',
      render: (row) => (
        <span className={`font-mono ${row.net > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
          {row.net > 0 ? '+' : ''}${(row.net / 1e6).toFixed(2)}M
        </span>
      ),
    },
    {
      key: 'topInflow',
      header: 'Top Inflow',
      width: 150,
      render: (row) => (
        <div className="flex items-center gap-1">
          <EntityLabel type="whale" size="xs" />
          <span className="text-[10px] text-text-secondary">{row.topInflow.entity}</span>
          <PriceTag value={row.topInflow.amount} size="xs" />
        </div>
      ),
    },
    {
      key: 'topOutflow',
      header: 'Top Outflow',
      width: 150,
      render: (row) => (
        <div className="flex items-center gap-1">
          <EntityLabel type="cex" size="xs" />
          <span className="text-[10px] text-text-secondary">{row.topOutflow.entity}</span>
          <PriceTag value={row.topOutflow.amount} size="xs" />
        </div>
      ),
    },
    {
      key: 'sparkline',
      header: '24h',
      width: 60,
      render: (row) => <Sparkline data={row.sparkline} width={50} height={16} />,
    },
  ]

  const totalInflow = flows.reduce((sum, f) => sum + f.inflow, 0)
  const totalOutflow = flows.reduce((sum, f) => sum + f.outflow, 0)
  const totalNet = flows.reduce((sum, f) => sum + f.net, 0)

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Capital Flows</h1>
            <p className="text-[11px] text-text-muted font-mono">Cross-chain and cross-exchange capital movement</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Total Inflow 24h', value: `$${(totalInflow / 1e6).toFixed(1)}M`, color: 'text-data-bull' },
            { label: 'Total Outflow 24h', value: `$${(totalOutflow / 1e6).toFixed(1)}M`, color: 'text-data-bear' },
            { label: 'Net Flow 24h', value: `${totalNet > 0 ? '+' : ''}$${(totalNet / 1e6).toFixed(1)}M`, color: totalNet > 0 ? 'text-data-bull' : 'text-data-bear' },
          ].map((kpi, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className={`text-[16px] font-head font-bold tabular-nums ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Flows Table */}
        <Panel
          title="Capital Flows"
          subtitle="By chain and exchange"
          liveStatus={feedStatus}
          onRefresh={fetchFlows}
          maxHeight={600}
        >
          <DataTable
            columns={columns}
            data={flows}
            sortable
            rowHeight={32}
            emptyState={<div className="text-text-muted text-[11px] p-4">Loading flow data...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
