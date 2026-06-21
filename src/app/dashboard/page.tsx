"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { Sparkline } from '@/components/primitives/Sparkline'
import { LiveDot } from '@/components/primitives/LiveDot'
import { EntityLabel } from '@/components/primitives/EntityLabel'
import { AlertPill } from '@/components/primitives/AlertPill'
import { TxHash } from '@/components/primitives/TxHash'

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
  sparkline: number[]
  [key: string]: unknown
}

interface WhaleMove {
  address: string
  entity: string
  type: string
  amount: number
  token: string
  txHash: string
  timestamp: string
  [key: string]: unknown
}

interface ActivityEvent {
  id: string
  type: string
  description: string
  amount?: number
  timestamp: string
  severity?: string
  [key: string]: unknown
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [whaleMoves, setWhaleMoves] = useState<WhaleMove[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchData = useCallback(async () => {
    try {
      const [derivativesRes, fearGreedRes, edgeReportRes] = await Promise.allSettled([
        fetch('/api/v1/derivatives?limit=10').then(r => r.json()),
        fetch('/api/v1/fear-greed').then(r => r.json()),
        fetch('/api/v1/edge-report').then(r => r.json()),
      ])

      // KPIs
      const btcPrice = derivativesRes.status === 'fulfilled'
        ? derivativesRes.value?.data?.topPairs?.[0]?.price || 0
        : 0
      const fgScore = fearGreedRes.status === 'fulfilled'
        ? fearGreedRes.value?.data?.composite?.score || 0
        : 0

      setKpis([
        { label: 'BTC Price', value: `$${btcPrice.toLocaleString()}`, delta: 0.5 },
        { label: 'Fear & Greed', value: String(fgScore), suffix: '/100' },
        { label: 'Active Signals', value: String(edgeReportRes.status === 'fulfilled' ? edgeReportRes.value?.data?.signals?.length || 0 : 0) },
        { label: 'Markets', value: '880+', suffix: ' Hyperliquid' },
      ])

      // Token Radar
      if (derivativesRes.status === 'fulfilled' && derivativesRes.value?.data?.topPairs) {
        setTokens(derivativesRes.value.data.topPairs.map((p: Record<string, unknown>) => ({
          symbol: p.symbol as string,
          price: p.price as number,
          change24h: p.priceChange24h as number,
          volume: p.quoteVolume24h as number,
          sparkline: Array.from({ length: 20 }, () => Math.random() * 100),
        })))
      }

      // Whale Moves (mock for now — will be replaced with real data)
      setWhaleMoves([
        { address: '0x28C6c06298d514Db089934071355E5743bf21d60', entity: 'Binance Hot Wallet', type: 'TRANSFER', amount: 500, token: 'ETH', txHash: '0xabc123def456', timestamp: '2m ago' },
        { address: '0x5754284f345afc66a98fbB0a0Afe71e0F007B949', entity: 'Tether Treasury', type: 'MINT', amount: 10000000, token: 'USDT', txHash: '0xdef789abc012', timestamp: '5m ago' },
        { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', entity: 'Lido', type: 'STAKE', amount: 1200, token: 'ETH', txHash: '0xghi345jkl678', timestamp: '8m ago' },
      ])

      // Activity Feed
      setActivity([
        { id: '1', type: 'swap', description: 'SWAP 42.3 ETH → 137,240 USDC on Uniswap V3', amount: 137240, timestamp: '14:23:01', severity: 'medium' },
        { id: '2', type: 'transfer', description: 'TRANSFER 50,000 USDC from Binance to Unknown', amount: 50000, timestamp: '14:22:45', severity: 'low' },
        { id: '3', type: 'liquidation', description: 'LIQUIDATION 2.1 ETH on Aave V3', amount: 6800, timestamp: '14:22:30', severity: 'high' },
        { id: '4', type: 'whale', description: 'WHALE MOVE: 1,000 BTC transferred to Coinbase', amount: 64000000, timestamp: '14:21:15', severity: 'critical' },
      ])

      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    } finally {
      // Data loaded
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const tokenColumns: Column<TokenRow>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      width: 80,
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
      key: 'volume',
      header: 'Volume',
      width: 100,
      align: 'right',
      render: (row) => <span className="text-text-secondary">${(row.volume / 1e6).toFixed(1)}M</span>,
    },
    {
      key: 'sparkline',
      header: '',
      width: 80,
      render: (row) => <Sparkline data={row.sparkline} width={60} height={20} />,
    },
  ]

  const whaleColumns: Column<WhaleMove>[] = [
    {
      key: 'entity',
      header: 'Entity',
      width: 120,
      render: (row) => <EntityLabel type="whale" label={row.entity} size="xs" />,
    },
    {
      key: 'type',
      header: 'Type',
      width: 80,
      render: (row) => <span className="text-data-orange text-[10px]">{row.type}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.amount} currency="" decimals={row.amount > 1000 ? 0 : 2} size="sm" />,
    },
    {
      key: 'token',
      header: 'Token',
      width: 60,
      render: (row) => <span className="text-text-secondary">{row.token}</span>,
    },
    {
      key: 'txHash',
      header: 'Tx',
      width: 100,
      render: (row) => <TxHash hash={row.txHash} truncate={4} />,
    },
    {
      key: 'timestamp',
      header: 'Time',
      width: 60,
      align: 'right',
      render: (row) => <span className="text-text-muted">{row.timestamp}</span>,
    },
  ]

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-bg-panel border border-bg-border px-3 py-2">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
                {kpi.label}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] font-bold font-head text-text-primary tabular-nums">
                  {kpi.prefix}{kpi.value}{kpi.suffix}
                </span>
                {kpi.delta !== undefined && kpi.delta !== 0 && (
                  <DeltaBadge value={kpi.delta} size="xs" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid: Token Radar + Whale Moves ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
          {/* Token Radar */}
          <Panel
            title="Token Radar"
            subtitle="Top perpetuals by volume"
            liveStatus={feedStatus}
            onRefresh={fetchData}
            maxHeight={400}
          >
            <DataTable
              columns={tokenColumns}
              data={tokens}
              sortable
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Loading token data...</div>}
            />
          </Panel>

          {/* Whale Moves */}
          <Panel
            title="Whale Moves"
            subtitle="Large transfers detected"
            liveStatus={feedStatus}
            maxHeight={400}
          >
            <DataTable
              columns={whaleColumns}
              data={whaleMoves}
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Monitoring whale wallets...</div>}
            />
          </Panel>
        </div>

        {/* ── Activity Feed (full width) ── */}
        <Panel
          title="Activity Feed"
          subtitle="Live on-chain events"
          liveStatus={feedStatus}
          maxHeight={300}
        >
          <div className="space-y-0">
            {activity.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-bg-border/50 hover:bg-bg-raised/50 transition-colors"
                style={{ height: 28 }}
              >
                <LiveDot status="live" size={4} />
                <span className="text-[10px] font-mono text-text-muted w-16 shrink-0">{event.timestamp}</span>
                {event.severity && (
                  <AlertPill severity={event.severity as 'critical' | 'high' | 'medium' | 'low'} size="xs" />
                )}
                <span className="text-[11px] font-mono text-text-primary truncate flex-1">
                  {event.description}
                </span>
                {event.amount && (
                  <PriceTag value={event.amount} size="xs" className="text-text-secondary" />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </NexusLayout>
  )
}
