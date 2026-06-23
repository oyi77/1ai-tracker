"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface TradeFlow {
  symbol: string
  buyVolume: number
  sellVolume: number
  netFlow: number
  tradeCount: number
  lastPrice: number
}

interface Trade {
  exchange: string
  pair: string
  price: number
  size: number
  side: 'buy' | 'sell'
  timestamp: number
  usdValue: number
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(2)}`
}

export default function TradesPage() {
  const [flows, setFlows] = useState<TradeFlow[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState({ totalBuyVolume: 0, totalSellVolume: 0, totalNetFlow: 0, tradeCount: 0 })
  const [status, setStatus] = useState<'live' | 'stale' | 'error'>('stale')
  const [view, setView] = useState<'flow' | 'trades'>('flow')

  const fetchData = useCallback(async () => {
    try {
      const [flowRes, tradeRes] = await Promise.allSettled([
        fetch('/api/v1/trades?mode=flow').then(r => r.json()),
        fetch('/api/v1/trades?mode=recent&limit=30').then(r => r.json()),
      ])

      if (flowRes.status === 'fulfilled' && flowRes.value?.data) {
        setFlows(flowRes.value.data.flows ?? [])
        setStats({
          totalBuyVolume: flowRes.value.data.totalBuyVolume ?? 0,
          totalSellVolume: flowRes.value.data.totalSellVolume ?? 0,
          totalNetFlow: flowRes.value.data.totalNetFlow ?? 0,
          tradeCount: flowRes.value.data.tradeCount ?? 0,
        })
      }

      if (tradeRes.status === 'fulfilled' && tradeRes.value?.data?.trades) {
        setTrades(tradeRes.value.data.trades)
      }

      setStatus('live')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 3000) // 3s refresh for live feel
    return () => clearInterval(id)
  }, [fetchData])

  const totalVolume = stats.totalBuyVolume + stats.totalSellVolume
  const buyPct = totalVolume > 0 ? (stats.totalBuyVolume / totalVolume) * 100 : 50

  return (
    <NexusLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-head font-bold text-text-primary flex items-center gap-2">
              <span className="text-data-bull">📊</span> Live Trade Flow
            </h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">
              Real-time trade aggregation from Binance, Binance Futures, OKX. Inspired by aggr.trade.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-bg-raised p-1 rounded">
              {(['flow', 'trades'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-[10px] font-mono rounded uppercase transition-colors ${view === v ? 'bg-teal-vivid text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <LiveDot status={status} label />
          </div>
        </div>

        {/* Global Flow KPIs */}
        <div className="grid grid-cols-5 gap-2">
          <KPI label="Total Volume" value={fmtUsd(totalVolume)} />
          <KPI label="Buy Volume" value={fmtUsd(stats.totalBuyVolume)} color="text-data-bull" />
          <KPI label="Sell Volume" value={fmtUsd(stats.totalSellVolume)} color="text-data-bear" />
          <KPI label="Net Flow" value={fmtUsd(stats.totalNetFlow)} color={stats.totalNetFlow >= 0 ? 'text-data-bull' : 'text-data-bear'} />
          <KPI label="Trades" value={stats.tradeCount.toLocaleString()} />
        </div>

        {/* Buy/Sell Bar */}
        <div className="bg-bg-panel border border-bg-border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-data-bull font-bold">{buyPct.toFixed(1)}% BUY</span>
            <span className="text-[11px] font-mono text-text-muted">Volume Ratio</span>
            <span className="text-[11px] font-mono text-data-bear font-bold">{(100 - buyPct).toFixed(1)}% SELL</span>
          </div>
          <div className="h-3 bg-bg-raised rounded-full overflow-hidden flex">
            <div className="h-full bg-data-bull transition-all duration-500" style={{ width: `${buyPct}%` }} />
            <div className="h-full bg-data-bear transition-all duration-500" style={{ width: `${100 - buyPct}%` }} />
          </div>
        </div>

        {view === 'flow' ? (
          /* Flow by Symbol */
          <Panel title="Trade Flow by Symbol" subtitle={`${flows.length} symbols tracked`} liveStatus={status}>
            <div className="overflow-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">#</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-left">Symbol</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Last Price</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Buy Vol</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Sell Vol</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Net Flow</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-right">Trades</th>
                    <th className="text-[10px] font-mono uppercase px-3 py-2 border-b border-bg-border text-center">Flow Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((f, i) => {
                    const vol = f.buyVolume + f.sellVolume
                    const buyPct = vol > 0 ? (f.buyVolume / vol) * 100 : 50
                    return (
                      <tr key={f.symbol} className="border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                        <td className="text-[11px] font-mono px-3 py-1.5 text-text-muted">{i + 1}</td>
                        <td className="text-[12px] font-mono px-3 py-1.5 font-bold text-teal-vivid">{f.symbol}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-primary tabular-nums">${f.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-data-bull tabular-nums">{fmtUsd(f.buyVolume)}</td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-data-bear tabular-nums">{fmtUsd(f.sellVolume)}</td>
                        <td className={`text-[11px] font-mono px-3 py-1.5 text-right font-bold tabular-nums ${f.netFlow >= 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                          {fmtUsd(f.netFlow)}
                        </td>
                        <td className="text-[11px] font-mono px-3 py-1.5 text-right text-text-secondary tabular-nums">{f.tradeCount.toLocaleString()}</td>
                        <td className="px-3 py-1.5">
                          <div className="h-2 bg-bg-raised rounded-full overflow-hidden flex">
                            <div className="h-full bg-data-bull" style={{ width: `${buyPct}%` }} />
                            <div className="h-full bg-data-bear" style={{ width: `${100 - buyPct}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          /* Recent Trades */
          <Panel title="Recent Trades" subtitle="Live from Binance/OKX WebSockets" liveStatus={status}>
            <div className="space-y-0 max-h-[500px] overflow-y-auto">
              {trades.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1 border-b border-bg-border/30 hover:bg-bg-raised transition-colors">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    t.side === 'buy' ? 'bg-data-bull/20 text-data-bull' : 'bg-data-bear/20 text-data-bear'
                  }`}>
                    {t.side.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted uppercase w-16">{t.exchange}</span>
                  <span className="text-[11px] font-mono font-bold text-teal-vivid w-16">{t.pair.replace('usdt', '').toUpperCase()}</span>
                  <span className="text-[11px] font-mono text-text-primary tabular-nums flex-1">${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="text-[11px] font-mono text-text-secondary tabular-nums w-20 text-right">{t.size.toFixed(4)}</span>
                  <span className="text-[11px] font-mono font-bold text-text-primary tabular-nums w-24 text-right">{fmtUsd(t.usdValue)}</span>
                  <span className="text-[9px] font-mono text-text-muted w-16 text-right">{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {trades.length === 0 && (
                <div className="p-8 text-center text-text-muted text-[12px] font-mono">Connecting to exchange WebSockets...</div>
              )}
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