"use client"

import { useState, useEffect, useMemo } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { LiveDot } from '@/components/primitives/LiveDot'

interface AssetData {
  symbol: string
  name: string
  category: string
  returns: number[]
}

const CORRELATION_ASSETS = [
  // US Equities
  { symbol: 'SPY', name: 'S&P 500', category: 'Equity' },
  { symbol: 'QQQ', name: 'NASDAQ', category: 'Equity' },
  { symbol: 'DIA', name: 'Dow Jones', category: 'Equity' },
  // Bonds
  { symbol: 'TLT', name: '20Y+ Treasury', category: 'Bond' },
  { symbol: 'IEF', name: '7-10Y Treasury', category: 'Bond' },
  { symbol: 'SHY', name: '1-3Y Treasury', category: 'Bond' },
  // Commodities
  { symbol: 'GLD', name: 'Gold', category: 'Commodity' },
  { symbol: 'USO', name: 'Oil', category: 'Commodity' },
  { symbol: 'SLV', name: 'Silver', category: 'Commodity' },
  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', category: 'Crypto' },
  // Volatility
  { symbol: '^VIX', name: 'VIX', category: 'Volatility' },
  // USD
  { symbol: 'UUP', name: 'US Dollar', category: 'Currency' },
  // Indonesia
  { symbol: 'IDX', name: 'IHSG', category: 'IDX' },
]

const CATEGORY_COLORS: Record<string, string> = {
  Equity: '#3b82f6',
  Bond: '#f59e0b',
  Commodity: '#10b981',
  Crypto: '#f97316',
  Volatility: '#ef4444',
  Currency: '#8b5cf6',
  IDX: '#06b6d4',
}

function computeCorrelation(returns1: number[], returns2: number[]): number {
  const n = Math.min(returns1.length, returns2.length)
  if (n < 2) return 0

  const mean1 = returns1.reduce((s, v) => s + v, 0) / n
  const mean2 = returns2.reduce((s, v) => s + v, 0) / n

  let cov = 0, var1 = 0, var2 = 0
  for (let i = 0; i < n; i++) {
    const d1 = returns1[i] - mean1
    const d2 = returns2[i] - mean2
    cov += d1 * d2
    var1 += d1 * d1
    var2 += d2 * d2
  }

  const denom = Math.sqrt(var1 * var2)
  return denom === 0 ? 0 : cov / denom
}

export default function CorrelationPage() {
  const [assets, setAssets] = useState<AssetData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('All')

  useEffect(() => {
    // Fetch historical data for correlation computation
    const fetchAsset = async (asset: typeof CORRELATION_ASSETS[0]): Promise<AssetData | null> => {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.symbol)}?interval=1d&range=3mo`
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) return null
        const d = await res.json()
        const closes = d.chart?.result?.[0]?.indicators?.quote?.[0]?.close
        if (!closes || closes.length < 2) return null

        const returns: number[] = []
        for (let i = 1; i < closes.length; i++) {
          if (closes[i] != null && closes[i - 1] != null && closes[i - 1] > 0) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
          }
        }

        return { symbol: asset.symbol, name: asset.name, category: asset.category, returns }
      } catch {
        return null
      }
    }

    Promise.all(CORRELATION_ASSETS.map(fetchAsset))
      .then(results => {
        setAssets(results.filter((r): r is AssetData => r !== null))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(assets.map(a => a.category))]
    return ['All', ...cats]
  }, [assets])

  const filteredAssets = useMemo(() => {
    if (selectedCat === 'All') return assets
    return assets.filter(a => a.category === selectedCat)
  }, [assets, selectedCat])

  const correlationMatrix = useMemo(() => {
    const matrix: number[][] = []
    for (let i = 0; i < filteredAssets.length; i++) {
      const row: number[] = []
      for (let j = 0; j < filteredAssets.length; j++) {
        if (i === j) {
          row.push(1)
        } else {
          row.push(computeCorrelation(filteredAssets[i].returns, filteredAssets[j].returns))
        }
      }
      matrix.push(row)
    }
    return matrix
  }, [filteredAssets])

  const getCorrelationColor = (value: number) => {
    if (value >= 0.8) return '#166534'
    if (value >= 0.6) return '#15803d'
    if (value >= 0.4) return '#22c55e'
    if (value >= 0.2) return '#86efac'
    if (value >= 0) return '#bbf7d0'
    if (value >= -0.2) return '#fecaca'
    if (value >= -0.4) return '#fca5a5'
    if (value >= -0.6) return '#f87171'
    if (value >= -0.8) return '#ef4444'
    return '#991b1b'
  }

  return (
    <NexusLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-accent-cyan">CROSS-ASSET CORRELATION</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              90-day rolling correlation across {assets.length} assets in {Object.keys(CATEGORY_COLORS).length} classes
            </p>
          </div>
          <LiveDot status={loading ? 'stale' : 'live'} label />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1 text-[10px] font-mono rounded border transition-colors ${
                selectedCat === cat
                  ? 'bg-teal-vivid text-bg-base border-teal-vivid font-bold'
                  : 'bg-bg-panel border-border-dim text-text-muted hover:border-border-active'
              }`}>
              {cat}
              {cat !== 'All' && (
                <span className="ml-1 w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              )}
            </button>
          ))}
        </div>

        {/* Correlation Matrix */}
        {loading ? (
          <div className="text-text-dim text-xs p-8 text-center">Computing correlations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="p-1" />
                  {filteredAssets.map(a => (
                    <th key={a.symbol} className="p-1 text-[9px] font-mono text-text-muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '80px' }}>
                      <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: CATEGORY_COLORS[a.category] }} />
                      {a.symbol.replace('-USD', '').replace('.JK', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((a, i) => (
                  <tr key={a.symbol}>
                    <td className="p-1 text-[9px] font-mono text-text-muted text-right whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: CATEGORY_COLORS[a.category] }} />
                      {a.symbol.replace('-USD', '').replace('.JK', '')}
                    </td>
                    {correlationMatrix[i]?.map((val, j) => (
                      <td key={j} className="p-0.5">
                        <div
                          className="w-8 h-8 flex items-center justify-center rounded text-[8px] font-mono font-bold"
                          style={{
                            backgroundColor: getCorrelationColor(val),
                            color: Math.abs(val) >= 0.6 ? '#ffffff' : '#1f2937',
                          }}
                          title={`${filteredAssets[i].name} vs ${filteredAssets[j].name}: ${val.toFixed(3)}`}
                        >
                          {val.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
          <h2 className="text-xs font-mono text-accent-cyan mb-2">INTERPRETATION</h2>
          <div className="grid grid-cols-2 gap-4 text-xs text-text-dim">
            <div>
              <p className="font-mono text-data-bull mb-1">High Positive (+0.6 to +1.0)</p>
              <p>Assets move together. Diversification benefit is low.</p>
            </div>
            <div>
              <p className="font-mono text-data-bear mb-1">High Negative (-0.6 to -1.0)</p>
              <p>Assets move opposite. Strong hedge opportunity.</p>
            </div>
            <div>
              <p className="font-mono text-text-muted mb-1">Near Zero (-0.2 to +0.2)</p>
              <p>Assets are uncorrelated. Best diversification.</p>
            </div>
            <div>
              <p className="font-mono text-accent-cyan mb-1">Crypto vs TradFi</p>
              <p>Watch for regime changes — correlations shift in crises.</p>
            </div>
          </div>
        </div>
      </div>
    </NexusLayout>
  )
}
