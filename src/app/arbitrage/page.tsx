"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface PriceSpread {
  symbol: string
  spotPrice: number
  futuresPrice: number
  spread: number
  spreadPercent: number
  spreadBps: number
  volume24h: number
  signal: string
}

interface FundingArb {
  symbol: string
  fundingRate: number
  annualized: number
  nextFunding: string
  volume24h: number
  signal: string
}

interface SpotPerp {
  symbol: string
  spotPrice: number
  perpPrice: number
  basis: number
  basisPercent: number
  fundingRate: number
  annualizedYield: number
  signal: string
}

interface ArbitrageData {
  priceSpreads: PriceSpread[]
  fundingArbitrage: FundingArb[]
  spotPerpArbitrage: SpotPerp[]
  summary: {
    totalPairs: number
    totalOpportunities: number
    avgSpreadBps: number
    avgFundingRate: number
  }
}

const TABS = ['spreads', 'funding', 'basis'] as const
type Tab = typeof TABS[number]

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(2)}`
}

export default function ArbitragePage() {
  const [data, setData] = useState<ArbitrageData | null>(null)
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')
  const [tab, setTab] = useState<Tab>('spreads')
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/arbitrage')
      const d = await res.json()
      if (d.data) {
        setData(d.data as ArbitrageData)
        setStatus('live')
        setLastUpdate(new Date())
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10_000) // 10s polling
    return () => clearInterval(id)
  }, [fetchData])

  const totalOpps = data?.summary?.totalOpportunities ?? 0

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-accent-amber">⚡</span> Arbitrage Scanner
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Real-time spot vs futures spreads, funding rate arbitrage, cash-and-carry from Binance • Updated {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-teal-vivid">{totalOpps} opportunities</span>
            <LiveDot status={status} label />
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-2">
          <KPI label="Pairs Scanned" value={String(data?.summary?.totalPairs ?? 0)} />
          <KPI label="Active Opportunities" value={String(totalOpps)} color="text-data-bull" />
          <KPI label="Avg Spread" value={`${(data?.summary?.avgSpreadBps ?? 0).toFixed(1)} bps`} />
          <KPI label="Avg Funding" value={`${((data?.summary?.avgFundingRate ?? 0) * 100).toFixed(4)}%`} />
          <KPI label="Last Update" value={lastUpdate.toLocaleTimeString()} />
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-[11px] font-mono rounded transition-colors ${tab === t ? 'bg-teal-vivid text-bg-base font-bold' : 'text-text-muted hover:text-text-primary bg-bg-raised'}`}>
              {t === 'spreads' ? '📊 Price Spreads' : t === 'funding' ? '💰 Funding Arb' : '🏦 Spot-Perp Basis'}
            </button>
          ))}
        </div>

        {/* Price Spreads Tab */}
        {tab === 'spreads' && (
          <Panel title="Spot vs Futures Price Spreads" subtitle="Buy low on one market, sell high on the other" liveStatus={status}>
            <div className="overflow-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spot</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Futures</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spread</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Bps</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Volume</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.priceSpreads ?? []).map((s, i) => (
                    <tr key={s.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                      <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                      <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{s.symbol}</td>
                      <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${s.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${s.futuresPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${s.spread > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                        {s.spread > 0 ? '+' : ''}${s.spread.toFixed(2)}
                      </td>
                      <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${s.spreadBps > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                        {s.spreadBps.toFixed(1)}
                      </td>
                      <td className="text-[10px] font-mono px-3 py-1.5 text-right text-text-secondary tabular-nums">{fmtUsd(s.volume24h)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          s.signal === 'Short Futures' ? 'bg-data-bear/20 text-data-bear' :
                          s.signal === 'Long Futures' ? 'bg-data-bull/20 text-data-bull' :
                          'bg-bg-raised text-text-muted'
                        }`}>{s.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Funding Arbitrage Tab */}
        {tab === 'funding' && (
          <Panel title="Funding Rate Arbitrage" subtitle="Long perp on cheap exchange, short on expensive" liveStatus={status}>
            <div className="overflow-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Funding Rate</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Annualized</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Volume</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.fundingArbitrage ?? []).map((f, i) => (
                    <tr key={f.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                      <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                      <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{f.symbol}</td>
                      <td className={`text-[12px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${f.fundingRate > 0 ? 'text-data-bear' : 'text-data-bull'}`}>
                        {(f.fundingRate * 100).toFixed(4)}%
                      </td>
                      <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">{f.annualized.toFixed(1)}%</td>
                      <td className="text-[10px] font-mono px-3 py-1.5 text-right text-text-secondary tabular-nums">{fmtUsd(f.volume24h)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          f.signal === 'Short Perp' ? 'bg-data-bear/20 text-data-bear' :
                          f.signal === 'Long Perp' ? 'bg-data-bull/20 text-data-bull' :
                          'bg-bg-raised text-text-muted'
                        }`}>{f.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Spot-Perp Basis Tab */}
        {tab === 'basis' && (
          <Panel title="Spot-Perp Basis" subtitle="Cash-and-carry yield from futures premium" liveStatus={status}>
            <div className="overflow-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spot</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Perp</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Basis %</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Ann. Yield</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.spotPerpArbitrage ?? []).map((b, i) => (
                    <tr key={b.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                      <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                      <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{b.symbol}</td>
                      <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${b.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${b.perpPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${b.basisPercent > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                        {b.basisPercent > 0 ? '+' : ''}{b.basisPercent.toFixed(4)}%
                      </td>
                      <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${b.annualizedYield > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                        {b.annualizedYield.toFixed(1)}%
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          b.signal === 'Cash & Carry' ? 'bg-data-bull/20 text-data-bull' :
                          b.signal === 'Reverse Cash & Carry' ? 'bg-data-bear/20 text-data-bear' :
                          'bg-bg-raised text-text-muted'
                        }`}>{b.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
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
