"use client"

import { useState, useEffect } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { LiveDot } from '@/components/primitives/LiveDot'

interface MarketInsight {
  id: string
  timestamp: string
  category: 'macro' | 'equity' | 'crypto' | 'forex' | 'commodity' | 'indonesia'
  title: string
  summary: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  assets: string[]
  source: string
}

// Simulated AI-generated market commentary
// In production, this would call an LLM API with real market data
function generateInsights(): MarketInsight[] {
  const now = new Date()
  return [
    {
      id: '1',
      timestamp: now.toISOString(),
      category: 'macro',
      title: 'Fed Holds Rates Steady at 3.63%',
      summary: 'The Federal Reserve maintained the federal funds rate at 3.63% for the third consecutive meeting. Chair Powell noted that inflation remains "somewhat elevated" but the labor market is "in balance." Markets are pricing in a 65% chance of a cut in September.',
      sentiment: 'neutral',
      impact: 'high',
      assets: ['SPY', 'QQQ', 'TLT', 'GLD'],
      source: 'FOMC Statement',
    },
    {
      id: '2',
      timestamp: new Date(now.getTime() - 3600000).toISOString(),
      category: 'indonesia',
      title: 'BI Holds Rate at 5.75%, Rupiah Stable',
      summary: 'Bank Indonesia kept its benchmark rate unchanged at 5.75%, in line with expectations. Governor Perry Warjiyo emphasized the central bank\'s commitment to maintaining rupiah stability. USD/IDR held steady at 17,842.',
      sentiment: 'neutral',
      impact: 'medium',
      assets: ['USD/IDR', 'BBCA.JK', 'BBRI.JK'],
      source: 'Bank Indonesia',
    },
    {
      id: '3',
      timestamp: new Date(now.getTime() - 7200000).toISOString(),
      category: 'crypto',
      title: 'Bitcoin Tests $70K Resistance, ETF Inflows Surge',
      summary: 'Bitcoin is testing the $70,000 resistance level as spot ETF inflows reached $1.2B this week. The 10Y-2Y yield curve spread narrowed to 0.72%, historically a bullish signal for risk assets. Ethereum underperformed as gas fees hit yearly lows.',
      sentiment: 'bullish',
      impact: 'high',
      assets: ['BTC-USD', 'ETH-USD', 'MSTR', 'COIN'],
      source: 'On-Chain Data',
    },
    {
      id: '4',
      timestamp: new Date(now.getTime() - 10800000).toISOString(),
      category: 'equity',
      title: 'IDX Composite Hits 5,820 — Banks Lead Rally',
      summary: 'The IHSG gained 0.8% to close at 5,820, led by banking stocks. BBCA.JK rose 1.2% after reporting better-than-expected Q2 earnings. Foreign investors were net buyers of IDR 450B worth of Indonesian equities.',
      sentiment: 'bullish',
      impact: 'medium',
      assets: ['^JKSE', 'BBCA.JK', 'BBRI.JK', 'BMRI.JK'],
      source: 'IDX Data',
    },
    {
      id: '5',
      timestamp: new Date(now.getTime() - 14400000).toISOString(),
      category: 'commodity',
      title: 'Gold Surges Past $3,970 on Geopolitical Tensions',
      summary: 'Gold rallied to $3,972/oz as geopolitical tensions in the Middle East escalated. The VIX rose to 18.41, up 5% from last week. Crude oil held at $78.94/bbl as OPEC+ maintained production cuts.',
      sentiment: 'bullish',
      impact: 'medium',
      assets: ['GLD', 'GC=F', '^VIX', 'CL=F'],
      source: 'Market Data',
    },
    {
      id: '6',
      timestamp: new Date(now.getTime() - 18000000).toISOString(),
      category: 'forex',
      title: 'Dollar Index Weakens as Rate Cut Expectations Rise',
      summary: 'The US Dollar Index (DXY) fell to 120.89 as markets increased rate cut expectations for September. EUR/USD gained 0.3%, while USD/IDR remained anchored around 17,842 due to BI\'s intervention policy.',
      sentiment: 'bearish',
      impact: 'medium',
      assets: ['DX-Y.NYB', 'EUR/USD', 'USD/IDR', 'GBP/USD'],
      source: 'FX Markets',
    },
    {
      id: '7',
      timestamp: new Date(now.getTime() - 21600000).toISOString(),
      category: 'indonesia',
      title: 'Indonesia GDP Growth Holds at 5.1% — Consumption Strong',
      summary: 'Indonesia\'s GDP grew 5.1% YoY in Q1 2026, driven by strong domestic consumption and government spending. The trade balance remained in surplus at $3.2B. Foreign direct investment rose 8% to $12.4B.',
      sentiment: 'bullish',
      impact: 'high',
      assets: ['^JKSE', 'USD/IDR', 'BBCA.JK'],
      source: 'BPS Indonesia',
    },
    {
      id: '8',
      timestamp: new Date(now.getTime() - 25200000).toISOString(),
      category: 'macro',
      title: 'US CPI Comes in at 2.3% — Below Expectations',
      summary: 'US Consumer Price Index rose 2.3% YoY, below the 2.5% consensus estimate. Core CPI (excluding food and energy) was 2.8%, also below expectations. This is the lowest inflation reading since February 2021.',
      sentiment: 'bullish',
      impact: 'high',
      assets: ['SPY', 'QQQ', 'TLT', 'GLD', 'BTC-USD'],
      source: 'Bureau of Labor Statistics',
    },
  ]
}

const CATEGORY_COLORS: Record<string, string> = {
  macro: '#3b82f6',
  equity: '#22c55e',
  crypto: '#f97316',
  forex: '#8b5cf6',
  commodity: '#f59e0b',
  indonesia: '#06b6d4',
}

const SENTIMENT_ICONS: Record<string, string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '●',
}

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<MarketInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    // Simulate API call delay
    setTimeout(() => {
      setInsights(generateInsights())
      setLoading(false)
    }, 500)
  }, [])

  const filtered = filter === 'all' ? insights : insights.filter(i => i.category === filter)

  const categories = ['all', 'macro', 'indonesia', 'equity', 'crypto', 'forex', 'commodity']

  return (
    <NexusLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-accent-cyan">AI MARKET INSIGHTS</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              AI-powered cross-asset analysis · {insights.length} insights generated
            </p>
          </div>
          <LiveDot status={loading ? 'stale' : 'live'} label />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-[10px] font-mono rounded border transition-colors ${
                filter === cat
                  ? 'text-bg-base font-bold'
                  : 'bg-bg-panel border-border-dim text-text-muted hover:border-border-active'
              }`}
              style={filter === cat ? { backgroundColor: cat === 'all' ? '#06b6d4' : CATEGORY_COLORS[cat], borderColor: cat === 'all' ? '#06b6d4' : CATEGORY_COLORS[cat] } : {}}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Insights Feed */}
        {loading ? (
          <div className="text-text-dim text-xs p-8 text-center">Generating AI insights...</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(insight => (
              <div key={insight.id} className="bg-bg-panel border border-border-dim rounded-lg p-4 hover:border-border-active transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[insight.category] }} />
                    <span className="text-[10px] font-mono text-text-muted uppercase">{insight.category}</span>
                    <span className={`text-[10px] font-mono font-bold ${
                      insight.sentiment === 'bullish' ? 'text-data-bull' :
                      insight.sentiment === 'bearish' ? 'text-data-bear' : 'text-text-muted'
                    }`}>
                      {SENTIMENT_ICONS[insight.sentiment]} {insight.sentiment}
                    </span>
                    <span className={`text-[10px] font-mono px-1 rounded ${
                      insight.impact === 'high' ? 'bg-data-bear/20 text-data-bear' :
                      insight.impact === 'medium' ? 'bg-data-bull/20 text-data-bull' : 'bg-bg-elevated text-text-muted'
                    }`}>
                      {insight.impact} impact
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted">
                    {new Date(insight.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold font-mono text-text-primary mb-2">{insight.title}</h3>
                <p className="text-xs text-text-dim leading-relaxed mb-3">{insight.summary}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {insight.assets.map(asset => (
                      <span key={asset} className="px-2 py-0.5 text-[9px] font-mono bg-bg-elevated rounded text-accent-cyan">
                        {asset}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-text-muted">{insight.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
          <h2 className="text-xs font-mono text-accent-cyan mb-2">METHODOLOGY</h2>
          <p className="text-xs text-text-dim">
            AI insights are generated by analyzing cross-asset correlations, macro data releases,
            on-chain metrics, and news sentiment. In production, this uses an LLM to synthesize
            real-time data from all 50+ data modules into actionable intelligence.
            Sentiment is classified as bullish/bearish/neutral based on price action and data trends.
          </p>
        </div>
      </div>
    </NexusLayout>
  )
}
