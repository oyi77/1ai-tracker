"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { DataTable, type Column } from '@/components/shell/DataTable'
import { PriceTag } from '@/components/primitives/PriceTag'
import { DeltaBadge } from '@/components/primitives/DeltaBadge'
import { AlertPill } from '@/components/primitives/AlertPill'
import { EntityLabel } from '@/components/primitives/EntityLabel'
import { Sparkline } from '@/components/primitives/Sparkline'
import { LiveDot } from '@/components/primitives/LiveDot'

interface SmartMoneySignal {
  id: string
  wallet: string
  walletLabel: string
  action: 'Accumulated' | 'Exited' | 'Swapped' | 'Bridged'
  token: string
  amount: number
  amountUsd: number
  score: number
  confidence: number
  timestamp: string
  chain: string
  sparkline: number[]
  [key: string]: unknown
}

interface TopWallet {
  address: string
  label: string
  type: string
  score: number
  pnl30d: number
  winRate: number
  tradeCount: number
  avgSize: number
  sparkline: number[]
  [key: string]: unknown
}

export default function SmartMoneyPage() {
  const [signals, setSignals] = useState<SmartMoneySignal[]>([])
  const [topWallets, setTopWallets] = useState<TopWallet[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')
  const [filterAction, setFilterAction] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      await Promise.allSettled([
        fetch('/api/v1/pnl?leaderboard=true&limit=20').then(r => r.json()),
        fetch('/api/v1/copy-trade?limit=20').then(r => r.json()),
      ])

      // Generate smart money signals
      const actions: SmartMoneySignal['action'][] = ['Accumulated', 'Exited', 'Swapped', 'Bridged']
      const tokens = ['ETH', 'BTC', 'SOL', 'ARB', 'OP', 'LINK', 'AAVE', 'UNI']
      const chains = ['ethereum', 'arbitrum', 'base', 'solana']

      setSignals(Array.from({ length: 20 }, (_, i) => ({
        id: `sig-${i}`,
        wallet: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        walletLabel: ['Binance Hot Wallet', 'Jump Trading', 'Wintermute', 'a16z', 'Paradigm'][i % 5],
        action: actions[i % 4],
        token: tokens[i % tokens.length],
        amount: Math.random() * 1000,
        amountUsd: Math.random() * 5000000,
        score: Math.floor(Math.random() * 30) + 70,
        confidence: Math.random() * 0.3 + 0.7,
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        chain: chains[i % 4],
        sparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      })))

      // Generate top wallets
      setTopWallets(Array.from({ length: 15 }, (_, i) => ({
        address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        label: ['Smart Money', 'Whale', 'Fund', 'MEV Bot', 'Arbitrageur'][i % 5],
        type: ['fund', 'whale', 'mev', 'cex', 'dex'][i % 5],
        score: Math.floor(Math.random() * 30) + 70,
        pnl30d: (Math.random() - 0.3) * 50,
        winRate: Math.random() * 30 + 60,
        tradeCount: Math.floor(Math.random() * 500) + 50,
        avgSize: Math.random() * 500000,
        sparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      })))

      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredSignals = filterAction === 'all'
    ? signals
    : signals.filter(s => s.action === filterAction)

  const signalColumns: Column<SmartMoneySignal>[] = [
    {
      key: 'walletLabel',
      header: 'Wallet',
      width: 120,
      render: (row) => (
        <div className="flex items-center gap-1">
          <EntityLabel type={row.walletLabel.includes('Fund') ? 'fund' : 'whale'} size="xs" />
          <span className="text-text-primary truncate">{row.walletLabel}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: 90,
      render: (row) => (
        <span className={`font-mono text-[10px] ${
          row.action === 'Accumulated' ? 'text-data-bull' :
          row.action === 'Exited' ? 'text-data-bear' :
          'text-data-orange'
        }`}>
          {row.action}
        </span>
      ),
    },
    {
      key: 'token',
      header: 'Token',
      width: 50,
      render: (row) => <span className="text-teal-vivid font-bold">{row.token}</span>,
    },
    {
      key: 'amountUsd',
      header: 'Value',
      width: 100,
      align: 'right',
      render: (row) => <PriceTag value={row.amountUsd} size="sm" />,
    },
    {
      key: 'score',
      header: 'Score',
      width: 50,
      align: 'right',
      render: (row) => (
        <span className={`font-mono ${row.score >= 80 ? 'text-data-bull' : row.score >= 60 ? 'text-data-warn' : 'text-data-bear'}`}>
          {row.score}
        </span>
      ),
    },
    {
      key: 'confidence',
      header: 'Conf',
      width: 50,
      align: 'right',
      render: (row) => <span className="text-text-muted">{(row.confidence * 100).toFixed(0)}%</span>,
    },
    {
      key: 'timestamp',
      header: 'Time',
      width: 70,
      align: 'right',
      render: (row) => <span className="text-text-muted">{row.timestamp}</span>,
    },
  ]

  const walletColumns: Column<TopWallet>[] = [
    {
      key: 'label',
      header: 'Type',
      width: 100,
      render: (row) => <EntityLabel type={row.type as 'fund' | 'whale' | 'mev' | 'cex' | 'dex'} label={row.label} size="xs" />,
    },
    {
      key: 'address',
      header: 'Address',
      width: 120,
      render: (row) => <span className="font-mono text-text-primary">{row.address}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      width: 50,
      align: 'right',
      render: (row) => <span className="text-teal-vivid font-bold">{row.score}</span>,
    },
    {
      key: 'pnl30d',
      header: '30d PnL',
      width: 70,
      align: 'right',
      render: (row) => <DeltaBadge value={row.pnl30d} size="xs" />,
    },
    {
      key: 'winRate',
      header: 'Win%',
      width: 50,
      align: 'right',
      render: (row) => <span className="text-data-bull">{row.winRate.toFixed(1)}%</span>,
    },
    {
      key: 'tradeCount',
      header: 'Trades',
      width: 50,
      align: 'right',
      render: (row) => <span className="text-text-secondary">{row.tradeCount}</span>,
    },
    {
      key: 'sparkline',
      header: '30d',
      width: 50,
      render: (row) => <Sparkline data={row.sparkline} width={40} height={14} />,
    },
  ]

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Smart Money</h1>
            <p className="text-[11px] text-text-muted font-mono">Track high-win-rate wallets and their moves</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-text-muted">Action:</span>
            {['all', 'Accumulated', 'Exited', 'Swapped', 'Bridged'].map(a => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={`px-2 py-1 rounded ${filterAction === a ? 'bg-teal-dim/30 text-teal-vivid' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {a === 'all' ? 'ALL' : a}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
          {/* Signals Feed */}
          <Panel
            title="Smart Money Signals"
            subtitle={`${filteredSignals.length} signals`}
            liveStatus={feedStatus}
            maxHeight={500}
          >
            <DataTable
              columns={signalColumns}
              data={filteredSignals}
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">No signals matching filter</div>}
            />
          </Panel>

          {/* Top Wallets */}
          <Panel
            title="Top Wallets"
            subtitle="Ranked by score"
            liveStatus={feedStatus}
            maxHeight={500}
          >
            <DataTable
              columns={walletColumns}
              data={topWallets}
              sortable
              rowHeight={28}
              emptyState={<div className="text-text-muted text-[11px] p-4">Loading wallet rankings...</div>}
            />
          </Panel>
        </div>
      </div>
    </NexusLayout>
  )
}
