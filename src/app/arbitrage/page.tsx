"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface ArbOpportunity {
  symbol: string
  spotPrice: number
  futuresPrice: number
  spreadPercent: number
  annualizedSpread: number
  signal: string
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(2)}`
}

export default function ArbitragePage() {
  const [opps, setOpps] = useState<ArbOpportunity[]>([])
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/arbitrage')
      const d = await res.json()
      if (d.data) {
        setOpps(d.data.cexArbitrage ?? [])
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
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  const activeOpps = opps.filter(o => Math.abs(o.spreadPercent) > 0.01)
  const avgSpread = opps.length > 0 ? opps.reduce((s, o) => s + Math.abs(o.spreadPercent), 0) / opps.length : 0
  const maxSpread = opps.reduce((m, o) => Math.max(m, Math.abs(o.spreadPercent)), 0)

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-accent-amber">⚡</span> Arbitrage Finder
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Cross-exchange price differences. Spot vs Futures basis. Real-time from Binance.
            </p>
          </div>
          <LiveDot status={status} label />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <KPI label="Pairs Scanned" value={String(opps.length)} />
          <KPI label="Active Opportunities" value={String(activeOpps.length)} color="text-data-bull" />
          <KPI label="Avg Spread" value={`${avgSpread.toFixed(4)}%`} />
          <KPI label="Max Spread" value={`${maxSpread.toFixed(4)}%`} color="text-accent-amber" />
        </div>

        <Panel title="Spot vs Futures Arbitrage" subtitle={`${opps.length} pairs | Binance spot vs perpetual`} liveStatus={status} onRefresh={fetchData}>
          <div className="overflow-auto scrollbar-thin">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spot</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Futures</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spread %</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Annualized</th>
                  <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Signal</th>
                </tr>
              </thead>
              <tbody>
                {opps.map((o, i) => (
                  <tr key={o.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                    <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                    <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{o.symbol}</td>
                    <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${o.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${o.futuresPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`text-[12px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${o.spreadPercent > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                      {o.spreadPercent > 0 ? '+' : ''}{o.spreadPercent.toFixed(4)}%
                    </td>
                    <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-secondary tabular-nums">{o.annualizedSpread.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        o.signal === 'Long Basis' ? 'bg-data-bull/20 text-data-bull' :
                        o.signal === 'Short Basis' ? 'bg-data-bear/20 text-data-bear' :
                        'bg-bg-raised text-text-muted'
                      }`}>
                        {o.signal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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