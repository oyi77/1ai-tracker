"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface FearGreedData {
  composite: { score: number; label: string; previousScore: number; change: number }
  categories: Record<string, { score: number; weight: number; source: string }>
  regime: { state: string; stance: string }
  history: Array<{ date: string; score: number }>
}

export default function FearGreedPage() {
  const [data, setData] = useState<FearGreedData | null>(null)
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')

  const fetchFearGreed = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/fear-greed')
      const json = await res.json()
      setData(json.data)
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    fetchFearGreed()
    const interval = setInterval(fetchFearGreed, 60_000)
    return () => clearInterval(interval)
  }, [fetchFearGreed])

  const getScoreColor = (score: number) => {
    if (score <= 25) return 'text-data-bear'
    if (score <= 45) return 'text-data-warn'
    if (score <= 55) return 'text-data-neutral'
    if (score <= 75) return 'text-data-bull'
    return 'text-teal-vivid'
  }

  const getScoreLabel = (score: number) => {
    if (score <= 25) return 'Extreme Fear'
    if (score <= 45) return 'Fear'
    if (score <= 55) return 'Neutral'
    if (score <= 75) return 'Greed'
    return 'Extreme Greed'
  }

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Fear & Greed Index</h1>
            <p className="text-[11px] text-text-muted font-mono">Market sentiment composite — volatility, momentum, dominance, volume</p>
          </div>
          <LiveDot status={feedStatus} label />
        </div>

        {data && (
          <>
            {/* Main Score */}
            <Panel title="Current Reading" subtitle={data.regime?.state}>
              <div className="p-6 text-center">
                <div className={`text-[64px] font-head font-bold tabular-nums ${getScoreColor(data.composite.score)}`}>
                  {data.composite.score}
                </div>
                <div className={`text-[18px] font-head ${getScoreColor(data.composite.score)}`}>
                  {getScoreLabel(data.composite.score)}
                </div>
                {data.regime && (
                  <div className="mt-2 text-[12px] font-mono text-text-secondary">
                    Regime: {data.regime.state} · Stance: {data.regime.stance}
                  </div>
                )}
              </div>
            </Panel>

            {/* Categories */}
            <Panel title="Category Breakdown" subtitle="Individual component scores">
              <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(data.categories || {}).map(([key, cat]) => (
                  <div key={key} className="bg-bg-raised rounded p-3">
                    <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">{key}</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[20px] font-head font-bold tabular-nums ${getScoreColor(cat.score)}`}>
                        {cat.score}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">×{cat.weight}</span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-2 h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat.score > 50 ? 'bg-data-bull' : cat.score > 30 ? 'bg-data-warn' : 'bg-data-bear'
                        }`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            {/* History */}
            {data.history && data.history.length > 0 && (
              <Panel title="7-Day History" subtitle="Recent readings">
                <div className="p-3">
                  <div className="flex items-end gap-1 h-24">
                    {data.history.map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-[9px] font-mono text-text-muted">{h.score}</div>
                        <div
                          className={`w-full rounded-t ${getScoreColor(h.score).replace('text-', 'bg-')}`}
                          style={{ height: `${h.score}%` }}
                        />
                        <div className="text-[8px] font-mono text-text-muted">{h.date.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </NexusLayout>
  )
}
