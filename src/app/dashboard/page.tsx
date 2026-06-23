"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { LiveDot } from '@/components/primitives/LiveDot'
import { EntityLabel } from '@/components/primitives/EntityLabel'

interface KPIData {
  label: string
  value: string
  delta?: number
  prefix?: string
  suffix?: string
}

interface TokenRow {
  symbol: string
  price: number
  change24h: number
  volume: number
  [key: string]: unknown
}

interface WhaleMove {
  txid: string
  valueBtc: number
  valueUsd: number
  block: number
  [key: string]: unknown
}

interface ActivityEvent {
  id: string
  type: string
  headline: string
  asset: string
  direction: string
  strength: number
  timestamp: string
  [key: string]: unknown
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${(n ?? 0).toFixed(0)}`
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [whaleMoves, setWhaleMoves] = useState<WhaleMove[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchData = useCallback(async () => {
    try {
      const [derivativesRes, fearGreedRes, edgeReportRes, whaleRes, alphaRes] = await Promise.allSettled([
        fetch('/api/v1/derivatives?limit=10').then(r => r.json()),
        fetch('/api/v1/fear-greed').then(r => r.json()),
        fetch('/api/v1/edge-report').then(r => r.json()),
        fetch('/api/v1/mempool?action=whale').then(r => r.json()),
        fetch('/api/v1/alpha-feed?limit=10').then(r => r.json()),
      ])

      // KPIs — unwrap envelope: response.data
      const deriv = derivativesRes.status === 'fulfilled' ? derivativesRes.value?.data : null
      const fg = fearGreedRes.status === 'fulfilled' ? fearGreedRes.value?.data : null
      const edge = edgeReportRes.status === 'fulfilled' ? edgeReportRes.value?.data : null

      const btcPrice = deriv?.topPairs?.[0]?.price ?? 0
      const fgScore = fg?.composite?.score ?? 0

      setKpis([
        { label: 'BTC Price', value: `$${(btcPrice ?? 0).toLocaleString()}`, delta: deriv?.topPairs?.[0]?.priceChange24h ?? 0 },
        { label: 'Fear & Greed', value: String(fgScore), suffix: '/100' },
        { label: 'Active Signals', value: String(edge?.signals?.length ?? 0) },
        { label: 'Whale TXs', value: String(whaleRes.status === 'fulfilled' ? (whaleRes.value?.data?.transactions?.length ?? 0) : 0) },
      ])

      // Token Radar — real derivatives data
      if (deriv?.topPairs) {
        setTokens(deriv.topPairs.map((p: Record<string, unknown>) => ({
          symbol: p.symbol as string,
          price: (p.price as number) ?? 0,
          change24h: (p.priceChange24h as number) ?? 0,
          volume: (p.quoteVolume24h as number) ?? 0,
        })))
      }

      // Whale Moves — real mempool whale TXs
      const whaleData = whaleRes.status === 'fulfilled' ? whaleRes.value?.data : null
      if (whaleData?.transactions) {
        setWhaleMoves(whaleData.transactions.slice(0, 5))
      }

      // Activity Feed — real alpha signals
      const alphaData = alphaRes.status === 'fulfilled' ? alphaRes.value?.data : null
      if (Array.isArray(alphaData)) {
        setActivity(alphaData.slice(0, 8).map((s: Record<string, unknown>) => ({
          id: String(s.id ?? ''),
          type: String(s.type ?? 'signal'),
          headline: String(s.headline ?? ''),
          asset: String(s.asset ?? ''),
          direction: String(s.direction ?? 'neutral'),
          strength: (s.strength as number) ?? 0,
          timestamp: s.timestamp ? new Date(s.timestamp as string).toLocaleTimeString() : '',
        })))
      }

      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    const invoke = () => fetchData()
    invoke()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const tokenColumns: Column<TokenRow>[] = [
    { key: 'symbol', header: 'Pair', width: 100, render: r => <span className="text-teal-vivid font-bold">{r.symbol}</span> },
    { key: 'price', header: 'Price', width: 100, align: 'right', render: r => <PriceTag value={r.price} size="sm" /> },
    { key: 'change24h', header: '24h%', width: 80, align: 'right', render: r => <DeltaBadge value={r.change24h} size="xs" /> },
    { key: 'volume', header: 'Volume', width: 100, align: 'right', render: r => <span className="text-text-secondary font-mono text-[10px]">{fmtUsd(r.volume)}</span> },
  ]

  const whaleColumns: Column<WhaleMove>[] = [
    { key: 'txid', header: 'TX Hash', width: 140, render: r => <span className="text-text-muted font-mono text-[10px]">{String(r.txid).slice(0, 16)}...</span> },
    { key: 'valueBtc', header: 'BTC', width: 90, align: 'right', render: r => <span className="text-teal-vivid font-bold tabular-nums">{(r.valueBtc ?? 0).toFixed(4)} BTC</span> },
    { key: 'valueUsd', header: 'USD', width: 100, align: 'right', render: r => <PriceTag value={r.valueUsd} size="sm" /> },
    { key: 'block', header: 'Block', width: 80, align: 'right', render: r => <span className="text-text-muted font-mono text-[10px]">{r.block}</span> },
  ]

  const activityColumns: Column<ActivityEvent>[] = [
    { key: 'type', header: 'Type', width: 80, render: r => <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-raised text-text-muted">{r.type}</span> },
    { key: 'headline', header: 'Signal', width: 350, render: r => <span className="text-text-primary text-[11px]">{r.headline}</span> },
    { key: 'asset', header: 'Asset', width: 80, render: r => <span className="text-teal-vivid font-mono text-[10px]">{r.asset}</span> },
    { key: 'direction', header: 'Dir', width: 60, render: r => (
      <span className={`text-[10px] font-mono font-bold ${r.direction === 'bullish' ? 'text-data-bull' : r.direction === 'bearish' ? 'text-data-bear' : 'text-text-muted'}`}>
        {r.direction === 'bullish' ? '🟢' : r.direction === 'bearish' ? '🔴' : '⚪'}
      </span>
    )},
    { key: 'strength', header: 'Str', width: 50, align: 'right', render: r => <span className="text-text-primary font-mono text-[10px]">{r.strength}</span> },
    { key: 'timestamp', header: 'Time', width: 80, align: 'right', render: r => <span className="text-text-muted font-mono text-[10px]">{r.timestamp}</span> },
  ]

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Dashboard</h1>
            <p className="text-[11px] text-text-muted font-mono">Real-time overview — all live data, no mocks</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-1">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase mb-1">{kpi.label}</div>
              <div className="text-[18px] font-head font-bold tabular-nums text-text-primary">
                {kpi.prefix}{kpi.value}{kpi.suffix}
              </div>
              {kpi.delta !== undefined && kpi.delta !== 0 && (
                <div className={`text-[10px] font-mono ${kpi.delta > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                  {kpi.delta > 0 ? '+' : ''}{(kpi.delta ?? 0).toFixed(2)}%
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Token Radar */}
          <Panel title="Token Radar" subtitle={`${tokens.length} pairs by volume`} liveStatus={feedStatus} onRefresh={fetchData}>
            <DataTable
              columns={tokenColumns as unknown as Column<Record<string, unknown>>[]}
              data={tokens as unknown as Record<string, unknown>[]}
              sortable
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Loading derivatives data...</div>}
            />
          </Panel>

          {/* Whale Moves */}
          <Panel title="Whale Moves" subtitle={`${whaleMoves.length} recent large BTC transactions`} liveStatus={feedStatus} onRefresh={fetchData}>
            <DataTable
              columns={whaleColumns as unknown as Column<Record<string, unknown>>[]}
              data={whaleMoves as unknown as Record<string, unknown>[]}
              sortable
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Monitoring mempool for whale TXs...</div>}
            />
          </Panel>
        </div>

        {/* Activity Feed */}
        <Panel title="Activity Feed" subtitle={`${activity.length} live signals`} liveStatus={feedStatus} onRefresh={fetchData}>
          <DataTable
            columns={activityColumns as unknown as Column<Record<string, unknown>>[]}
            data={activity as unknown as Record<string, unknown>[]}
            rowHeight={28}
            emptyState={<div className="text-text-muted text-[11px] p-4">No signals yet...</div>}
          />
        </Panel>
      </div>
    </NexusLayout>
  )
}
