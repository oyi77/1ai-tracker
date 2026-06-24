"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface MevEvent {
  type: string
  txHash: string
  profit: number
  block: number
  strategy: string
  victimTx?: string
}

interface MevStats {
  totalMEV24h: number
  avgProfit: number
  topStrategies: Array<{ name: string; count: number }>
}

export default function MevPage() {
  const [events, setEvents] = useState<MevEvent[]>([])
  const [stats, setStats] = useState<MevStats | null>(null)
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/mev')
      const d = await res.json()
      if (d.data) {
        setEvents(d.data.recentMEV ?? [])
        setStats(d.data.stats ?? null)
        setStatus('live')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  const typeIcons: Record<string, string> = {
    sandwich: '🥪',
    frontrun: '🏃',
    arbitrage: '⚡',
    liquidation: '💥',
  }

  const typeColors: Record<string, string> = {
    sandwich: 'bg-data-bear/20 text-data-bear',
    frontrun: 'bg-accent-amber/20 text-accent-amber',
    arbitrage: 'bg-data-bull/20 text-data-bull',
    liquidation: 'bg-purple-400/20 text-purple-400',
  }

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-data-bear">🛡</span> MEV Detector
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Maximal Extractable Value monitoring. Detects sandwich attacks, frontrunning, and arbitrage bots.
            </p>
          </div>
          <LiveDot status={status} label />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <KPI label="MEV Events" value={String(events.length)} />
          <KPI label="Total Profit" value={stats ? `$${stats.totalMEV24h.toLocaleString()}` : '—'} color="text-data-bear" />
          <KPI label="Avg Profit" value={stats ? `$${stats.avgProfit.toLocaleString()}` : '—'} />
          <KPI label="Strategies" value={stats ? String(stats.topStrategies.length) : '—'} />
        </div>

        {/* Strategy Breakdown */}
        {stats && stats.topStrategies.length > 0 && (
          <Panel title="MEV Strategies" subtitle="Breakdown by attack type" liveStatus={status}>
            <div className="p-3 grid grid-cols-4 gap-3">
              {stats.topStrategies.map((s, i) => (
                <div key={i} className="bg-bg-raised p-3 rounded border border-bg-border">
                  <div className="text-[11px] font-mono text-text-muted uppercase mb-1">{s.name}</div>
                  <div className="text-[20px] font-head font-bold text-text-primary tabular-nums">{s.count}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Recent MEV Events */}
        <Panel title="Recent MEV Events" subtitle="Detected from mempool analysis" liveStatus={status} onRefresh={fetchData}>
          <div className="space-y-1 p-2">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 border-b border-bg-border/50 hover:bg-bg-raised transition-colors">
                <span className="text-[16px]">{typeIcons[e.type] ?? '•'}</span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${typeColors[e.type] ?? 'bg-bg-raised text-text-muted'}`}>
                  {e.type.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-text-muted flex-1">{e.txHash.slice(0, 20)}...</span>
                <span className="text-[11px] font-mono text-text-primary">{e.strategy}</span>
                <span className="text-[12px] font-mono font-bold text-data-bear tabular-nums">${e.profit.toLocaleString()}</span>
                <span className="text-[10px] font-mono text-text-muted">Block {e.block}</span>
              </div>
            ))}
            {events.length === 0 && (
              <div className="p-8 text-center text-text-muted text-[12px] font-mono">Scanning mempool for MEV activity...</div>
            )}
          </div>
        </Panel>
      </div>
    </NexusLayout>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-panel border border-bg-border p-3 rounded">
      <div className="text-[10px] text-text-muted font-mono uppercase mb-1">{label}</div>
      <div className={`text-[16px] font-head font-bold tabular-nums ${color ?? 'text-text-primary'}`}>{value}</div>
    </div>
  )
}