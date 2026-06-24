"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

// ── Types matching the API response ──────────────────────

interface PriceSpreadOpportunity {
  symbol: string
  buyExchange: string
  buyPrice: number
  sellExchange: string
  sellPrice: number
  spread: number
  spreadPercent: number
  volume24h: number
  estimatedProfit: number
}

interface FundingArbitrageOpportunity {
  symbol: string
  longExchange: string
  longRate: number
  shortExchange: string
  shortRate: number
  differential: number
  annualizedDifferential: number
  estimatedDailyYield: number
}

interface SpotPerpArbitrageOpportunity {
  symbol: string
  spotPrice: number
  perpPrice: number
  basis: number
  basisPercent: number
  bestFundingRate: number
  bestFundingExchange: string
  annualizedYield: number
  signal: 'cash-carry-long' | 'cash-carry-short' | 'none'
}

interface ArbitrageSummary {
  topSpread: PriceSpreadOpportunity | null
  topFunding: FundingArbitrageOpportunity | null
  topBasis: SpotPerpArbitrageOpportunity | null
  totalOpportunities: number
}

type Category = 'all' | 'price' | 'funding' | 'basis'

// ── Helpers ──────────────────────────────────────────────

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(2)}`
}

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(4)}%`
}

// ── Component ────────────────────────────────────────────

export default function ArbitragePage() {
  const [priceSpreads, setPriceSpreads] = useState<PriceSpreadOpportunity[]>([])
  const [fundingArb, setFundingArb] = useState<FundingArbitrageOpportunity[]>([])
  const [spotPerpArb, setSpotPerpArb] = useState<SpotPerpArbitrageOpportunity[]>([])
  const [summary, setSummary] = useState<ArbitrageSummary | null>(null)
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')
  const [category, setCategory] = useState<Category>('all')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/arbitrage?category=${category}`)
      const d = await res.json()
      if (d.data) {
        setPriceSpreads(d.data.priceSpreads ?? [])
        setFundingArb(d.data.fundingArbitrage ?? [])
        setSpotPerpArb(d.data.spotPerpArbitrage ?? [])
        setSummary(d.data.summary ?? null)
        setStatus('live')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [category])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 15_000)
    return () => clearInterval(iv)
  }, [fetchData])

  const totalOpps = priceSpreads.length + fundingArb.length + spotPerpArb.length
  const topSpreadPct = summary?.topSpread?.spreadPercent ?? 0
  const topBasisPct = summary?.topBasis?.basisPercent ?? 0
  const topFundingDiff = summary?.topFunding?.annualizedDifferential ?? 0

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'price', label: 'Price Spreads' },
    { key: 'funding', label: 'Funding' },
    { key: 'basis', label: 'Spot-Perp' },
  ]

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-accent-amber">⚡</span> Arbitrage Finder
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Cross-exchange price spreads, funding differentials, and spot-perp basis across Binance, Bybit, OKX.
            </p>
          </div>
          <LiveDot status={status} label />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2">
          <KPI label="Opportunities" value={String(totalOpps)} color={totalOpps > 0 ? 'text-data-bull' : undefined} />
          <KPI label="Top Price Spread" value={topSpreadPct !== 0 ? `${topSpreadPct.toFixed(3)}%` : '—'} color={topSpreadPct > 0.1 ? 'text-accent-amber' : undefined} />
          <KPI label="Top Basis" value={topBasisPct !== 0 ? `${topBasisPct.toFixed(3)}%` : '—'} />
          <KPI label="Top Funding (Ann.)" value={topFundingDiff !== 0 ? `${topFundingDiff.toFixed(1)}%` : '—'} color={topFundingDiff > 50 ? 'text-data-bull' : undefined} />
        </div>

        {/* Category filter */}
        <div className="flex gap-1">
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                category === c.key
                  ? 'bg-teal-vivid/20 text-teal-vivid font-bold'
                  : 'bg-bg-raised text-text-muted hover:text-text-primary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Price Spreads */}
        {(category === 'all' || category === 'price') && (
          <Panel title="Cross-Exchange Price Spreads" subtitle={`${priceSpreads.length} pairs | Buy low, sell high across exchanges`} liveStatus={status} onRefresh={fetchData}>
            {priceSpreads.length === 0 ? (
              <EmptyState status={status} message="Scanning for cross-exchange price differences..." />
            ) : (
              <div className="overflow-auto scrollbar-thin">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Buy @</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Sell @</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spread</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Est. Profit</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Volume 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceSpreads.map((o, i) => (
                      <tr key={o.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                        <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                        <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{o.symbol}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">
                          ${o.buyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-text-muted text-[9px]">{o.buyExchange}</span>
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">
                          ${o.sellPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-text-muted text-[9px]">{o.sellExchange}</span>
                        </td>
                        <td className="text-[12px] font-mono px-3 py-1.5 text-right font-bold tabular-nums text-data-bull">
                          +{o.spreadPercent.toFixed(3)}%
                        </td>
                        <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${o.estimatedProfit > 0 ? 'text-data-bull' : 'text-text-muted'}`}>
                          {o.estimatedProfit > 0 ? '+' : ''}{o.estimatedProfit.toFixed(3)}%
                        </td>
                        <td className="text-[10px] font-mono px-3 py-1.5 text-right text-text-muted tabular-nums">{fmtUsd(o.volume24h)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Funding Rate Arbitrage */}
        {(category === 'all' || category === 'funding') && (
          <Panel title="Funding Rate Arbitrage" subtitle={`${fundingArb.length} pairs | Long perp on cheap exchange, short on expensive`} liveStatus={status} onRefresh={fetchData}>
            {fundingArb.length === 0 ? (
              <EmptyState status={status} message="Scanning for funding rate differentials..." />
            ) : (
              <div className="overflow-auto scrollbar-thin">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Long @</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Short @</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Diff</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Ann. Yield</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Daily $/1K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundingArb.map((o, i) => (
                      <tr key={o.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                        <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                        <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{o.symbol}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-data-bull tabular-nums">
                          {fmtRate(o.longRate)} <span className="text-text-muted text-[9px]">{o.longExchange}</span>
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-data-bear tabular-nums">
                          {fmtRate(o.shortRate)} <span className="text-text-muted text-[9px]">{o.shortExchange}</span>
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums text-accent-amber">
                          {fmtRate(o.differential)}
                        </td>
                        <td className="text-[12px] font-mono px-3 py-1.5 text-right font-bold tabular-nums text-data-bull">
                          {o.annualizedDifferential.toFixed(1)}%
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">
                          ${(o.estimatedDailyYield * 1).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Spot-Perp Basis */}
        {(category === 'all' || category === 'basis') && (
          <Panel title="Spot-Perp Basis" subtitle={`${spotPerpArb.length} pairs | Cash-and-carry yield`} liveStatus={status} onRefresh={fetchData}>
            {spotPerpArb.length === 0 ? (
              <EmptyState status={status} message="Scanning for spot-perp basis opportunities..." />
            ) : (
              <div className="overflow-auto scrollbar-thin">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Pair</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Spot</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Perp</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Basis</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Ann. Yield</th>
                      <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spotPerpArb.map((o, i) => (
                      <tr key={o.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                        <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                        <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{o.symbol}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${o.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${o.perpPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className={`text-[12px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${o.basisPercent > 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                          {o.basisPercent > 0 ? '+' : ''}{o.basisPercent.toFixed(3)}%
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">{o.annualizedYield.toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            o.signal === 'cash-carry-long' ? 'bg-data-bull/20 text-data-bull' :
                            o.signal === 'cash-carry-short' ? 'bg-data-bear/20 text-data-bear' :
                            'bg-bg-raised text-text-muted'
                          }`}>
                            {o.signal === 'cash-carry-long' ? 'LONG BASIS' : o.signal === 'cash-carry-short' ? 'SHORT BASIS' : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </NexusLayout>
  )
}

// ── Sub-components ───────────────────────────────────────

function KPI({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-panel border border-bg-border p-3 rounded">
      <div className="text-[10px] text-text-muted font-mono uppercase mb-1">{label}</div>
      <div className={`text-[16px] font-head font-bold tabular-nums ${color ?? 'text-text-primary'}`}>{value}</div>
    </div>
  )
}

function EmptyState({ status, message }: { status: string; message: string }) {
  return (
    <div className="p-8 text-center">
      <div className="text-[13px] text-text-primary mb-2">
        {status === 'error' ? 'Connection error' : 'No opportunities detected'}
      </div>
      <div className="text-[11px] text-text-muted font-mono">
        {status === 'error' ? 'Failed to fetch data — will retry automatically' : message}
      </div>
    </div>
  )
}
