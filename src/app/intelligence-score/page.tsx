"use client"

import { useState, useEffect } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { LiveDot } from '@/components/primitives/LiveDot'

interface ModuleScore {
  module: string
  score: number
  weight: number
  weightedScore: number
  signal: string
  dataPoints: number
}

interface IntelligenceScore {
  composite: number
  direction: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  modules: ModuleScore[]
  compositeSignals: number
  bullishSignals: number
  bearishSignals: number
  timestamp: string
}

function scoreColor(score: number): string {
  if (score > 60) return 'text-data-bull'
  if (score < 40) return 'text-data-bear'
  return 'text-text-muted'
}

function scoreBg(score: number): string {
  if (score > 60) return 'bg-data-bull'
  if (score < 40) return 'bg-data-bear'
  return 'bg-text-muted'
}

export default function IntelligenceScorePage() {
  const [data, setData] = useState<IntelligenceScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/intelligence-score')
        const d = await res.json()
        if (d.data) setData(d.data)
        setLoading(false)
      } catch { setLoading(false) }
    }
    fetchData()
    const interval = setInterval(fetchData, 300_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <NexusLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-accent-cyan">INTELLIGENCE SCORE</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              Unified 0-100 composite from all 14 modules — 50 = neutral
            </p>
          </div>
          <LiveDot status={loading ? 'stale' : 'live'} label />
        </div>

        {data && (
          <>
            {/* Big score display */}
            <div className="bg-bg-panel border border-border-dim rounded-lg p-6 text-center">
              <p className="text-[10px] text-text-muted font-mono mb-2">COMPOSITE INTELLIGENCE SCORE</p>
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className={`text-6xl font-mono font-bold ${scoreColor(data.composite)}`}>
                    {data.composite.toFixed(1)}
                  </p>
                  <p className={`text-sm font-mono font-bold mt-1 ${
                    data.direction === 'bullish' ? 'text-data-bull' : data.direction === 'bearish' ? 'text-data-bear' : 'text-text-muted'
                  }`}>
                    {data.direction.toUpperCase()}
                  </p>
                </div>
                <div className="text-left space-y-2">
                  <div>
                    <p className="text-[10px] text-text-muted font-mono">CONFIDENCE</p>
                    <p className="text-lg font-mono font-bold">{data.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-mono">SIGNALS</p>
                    <p className="text-sm font-mono">
                      <span className="text-data-bull">{data.bullishSignals} bullish</span>
                      {' / '}
                      <span className="text-data-bear">{data.bearishSignals} bearish</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Module breakdown */}
            <Panel title="Module Breakdown" subtitle={`${data.modules.length} modules contributing`}>
              <div className="space-y-2 p-3">
                {data.modules.map((mod, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-xs font-mono text-text-dim truncate">{mod.module}</div>
                    <div className="flex-1 h-2 bg-bg-raised rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${scoreBg(mod.score)}`}
                        style={{ width: `${mod.score}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs font-mono font-bold">{mod.score.toFixed(0)}</div>
                    <div className="w-10 text-right text-[10px] font-mono text-text-dim">w:{mod.weight}</div>
                    <div className="w-48 text-[10px] text-text-dim truncate">{mod.signal}</div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Score gauge */}
            <Panel title="Score Gauge" subtitle="Visual 0-100 scale">
              <div className="p-4">
                <div className="relative h-8 bg-bg-raised rounded overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-data-bear/20" />
                    <div className="flex-1 bg-data-bear/10" />
                    <div className="flex-1 bg-text-muted/10" />
                    <div className="flex-1 bg-data-bull/10" />
                    <div className="flex-1 bg-data-bull/20" />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                    style={{ left: `${data.composite}%`, transform: 'translateX(-50%)' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-text-dim">
                    <span>0 BEARISH</span>
                    <span>25</span>
                    <span>50 NEUTRAL</span>
                    <span>75</span>
                    <span>100 BULLISH</span>
                  </div>
                </div>
              </div>
            </Panel>
          </>
        )}
      </div>
    </NexusLayout>
  )
}
