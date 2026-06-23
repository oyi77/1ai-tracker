"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { PriceTag } from '@/components/primitives/PriceTag'
import { LiveDot } from '@/components/primitives/LiveDot'

interface HeatmapBin {
  priceLevel: number
  density: number
  longLiquidations: number
  shortLiquidations: number
  totalUsd: number
}

interface Cluster {
  priceLevel: number
  usdValue: number
  side: string
  distance: string
}

interface HeatmapData {
  symbol: string
  currentPrice: number
  markPrice: number
  fundingRate: number
  openInterest: number
  heatmap: HeatmapBin[]
  clusters: Cluster[]
  recentLiquidations: Array<{
    price: number
    quantity: number
    usdValue: number
    side: string
    usdFormatted: string
    timestamp: number
  }>
  range: { start: number; end: number; binSize: number }
}

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'ARB', 'OP']

export default function LiquidationHeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [symbol, setSymbol] = useState('BTC')
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/liquidations/heatmap?symbol=${symbol}`)
      const d = await res.json()
      if (d.success && d.data) {
        setData(d.data as HeatmapData)
        setStatus('live')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [symbol])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10_000)
    return () => clearInterval(id)
  }, [fetchData])

  const maxDensity = data ? Math.max(...data.heatmap.map(b => b.density), 0.01) : 1

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-data-bear">🔥</span> Liquidation Heatmap
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Real-time liquidation zones from Binance Futures. Shows where leveraged positions will be liquidated.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-bg-raised p-1 rounded">
              {SYMBOLS.map(s => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`px-3 py-1 text-[10px] font-mono rounded uppercase transition-colors ${symbol === s ? 'bg-teal-vivid text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <LiveDot status={status} label />
          </div>
        </div>

        {/* KPI Strip */}
        {data && (
          <div className="grid grid-cols-6 gap-2">
            <KPI label="Price" value={`$${data.currentPrice.toLocaleString()}`} />
            <KPI label="Mark Price" value={`$${data.markPrice.toLocaleString()}`} />
            <KPI label="Open Interest" value={fmtUsd(data.openInterest * data.currentPrice)} />
            <KPI label="Funding Rate" value={`${(data.fundingRate * 100).toFixed(4)}%`} color={data.fundingRate > 0 ? 'text-data-bear' : 'text-data-bull'} />
            <KPI label="Long Clusters" value={String(data.clusters.filter(c => c.side === 'long').length)} color="text-data-bull" />
            <KPI label="Short Clusters" value={String(data.clusters.filter(c => c.side === 'short').length)} color="text-data-bear" />
          </div>
        )}

        {/* Heatmap Visualization */}
        <Panel title="Liquidation Heatmap" subtitle="Price levels with liquidation density" liveStatus={status}>
          {data && data.heatmap.length > 0 ? (
            <div className="p-4 space-y-1 max-h-[600px] overflow-y-auto">
              {/* Current Price Marker */}
              <div className="flex items-center justify-center mb-2">
                <div className="px-3 py-1 bg-teal-vivid/20 border border-teal-vivid rounded text-[11px] font-mono font-bold text-teal-vivid">
                  Current: ${data.currentPrice.toLocaleString()}
                </div>
              </div>

              {/* Heatmap Bars */}
              {data.heatmap
                .filter(b => b.density > 0.001)
                .sort((a, b) => b.priceLevel - a.priceLevel)
                .map((bin, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted w-20 text-right tabular-nums">
                      ${bin.priceLevel.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <div className="flex-1 h-5 bg-bg-raised rounded relative overflow-hidden">
                      {/* Long liquidation bar */}
                      <div
                        className="absolute left-0 top-0 h-full bg-data-bull/60 transition-all duration-300"
                        style={{ width: `${(bin.longLiquidations / (bin.longLiquidations + bin.shortLiquidations || 1)) * bin.density * 100}%` }}
                      />
                      {/* Short liquidation bar */}
                      <div
                        className="absolute right-0 top-0 h-full bg-data-bear/60 transition-all duration-300"
                        style={{ width: `${(bin.shortLiquidations / (bin.longLiquidations + bin.shortLiquidations || 1)) * bin.density * 100}%` }}
                      />
                      {/* Density label */}
                      {bin.density > 0.1 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white font-bold drop-shadow-md">
                          {fmtUsd(bin.totalUsd)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-text-muted w-16 tabular-nums">
                      {bin.density > 0.01 ? `${(bin.density * 100).toFixed(0)}%` : ''}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-8 text-text-muted text-[12px] font-mono text-center">Loading heatmap data...</div>
          )}
        </Panel>

        {/* Liquidation Clusters + Recent */}
        <div className="grid grid-cols-2 gap-4">
          <Panel title="⚡ Liquidation Clusters" subtitle="High-density liquidation zones" liveStatus={status}>
            <div className="p-3 space-y-2">
              {data?.clusters.map((c, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded ${
                  c.side === 'long' ? 'bg-data-bull/10 border border-data-bull/30' : 'bg-data-bear/10 border border-data-bear/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold ${c.side === 'long' ? 'text-data-bull' : 'text-data-bear'}`}>
                      {c.side.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-text-primary font-bold tabular-nums">
                      ${c.priceLevel.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted">{c.distance}% away</span>
                    <span className="text-[11px] font-mono font-bold text-text-primary tabular-nums">
                      {fmtUsd(c.usdValue)}
                    </span>
                  </div>
                </div>
              ))}
              {(!data?.clusters || data.clusters.length === 0) && (
                <div className="text-text-muted text-[11px] font-mono p-4 text-center">No clusters detected</div>
              )}
            </div>
          </Panel>

          <Panel title="💥 Recent Liquidations" subtitle="Last 20 forced closes" liveStatus={status}>
            <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto">
              {data?.recentLiquidations.map((liq, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-bg-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      liq.side === 'long' ? 'bg-data-bear/20 text-data-bear' : 'bg-data-bull/20 text-data-bull'
                    }`}>
                      {liq.side === 'long' ? 'LIQ LONG' : 'LIQ SHORT'}
                    </span>
                    <span className="text-[10px] font-mono text-text-primary tabular-nums">
                      ${liq.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-text-primary tabular-nums">
                    {liq.usdFormatted}
                  </span>
                </div>
              ))}
              {(!data?.recentLiquidations || data.recentLiquidations.length === 0) && (
                <div className="text-text-muted text-[11px] font-mono p-4 text-center">No liquidations in window</div>
              )}
            </div>
          </Panel>
        </div>
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

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(2)}`
}