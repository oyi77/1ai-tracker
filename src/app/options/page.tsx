"use client"

import { useState, useEffect } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { LiveDot } from '@/components/primitives/LiveDot'

// Black-Scholes Greeks Calculator
// Uses real underlying prices from Yahoo Finance
// Computes theoretical option prices and Greeks
// NOT real options chain — this is a calculator

interface UnderlyingData {
  symbol: string
  price: number
  change: number
  volatility: number // annualized historical vol estimate
}

interface Greeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  price: number
}

function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp(-x * x / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

function normPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
}

function blackScholes(
  S: number, K: number, T: number, r: number, sigma: number, isCall: boolean
): Greeks {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, price: 0 }
  }

  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  const nd1 = normPDF(d1)
  const Nd1 = normCDF(d1)
  const Nd2 = normCDF(d2)
  const sqrtT = Math.sqrt(T)
  const expRT = Math.exp(-r * T)

  if (isCall) {
    return {
      price: S * Nd1 - K * expRT * Nd2,
      delta: Nd1,
      gamma: nd1 / (S * sigma * sqrtT),
      theta: -(S * nd1 * sigma) / (2 * sqrtT) - r * K * expRT * Nd2,
      vega: S * nd1 * sqrtT / 100,
      rho: K * T * expRT * Nd2 / 100,
    }
  } else {
    const Nmd1 = normCDF(-d1)
    const Nmd2 = normCDF(-d2)
    return {
      price: K * expRT * Nmd2 - S * Nmd1,
      delta: Nd1 - 1,
      gamma: nd1 / (S * sigma * sqrtT),
      theta: -(S * nd1 * sigma) / (2 * sqrtT) + r * K * expRT * Nmd2,
      vega: S * nd1 * sqrtT / 100,
      rho: -K * T * expRT * Nmd2 / 100,
    }
  }
}

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMD', 'AMZN']

export default function OptionsPage() {
  const [selected, setSelected] = useState('AAPL')
  const [underlying, setUnderlying] = useState<UnderlyingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [strike, setStrike] = useState(200)
  const [expiry, setExpiry] = useState('2026-07-18')
  const [sigma, setSigma] = useState(0.25)
  const [isCall, setIsCall] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/modules/fetch?module=yahoo-finance&action=quote&symbols=${selected}`)
      .then(r => r.json())
      .then(d => {
        const q = d.data?.[0]
        if (q) {
          const price = q.regularMarketPrice ?? 0
          setUnderlying({
            symbol: selected,
            price,
            change: q.regularMarketChangePercent ?? 0,
            volatility: 0.25, // default 25% annual vol
          })
          setStrike(Math.round(price))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selected])

  const today = new Date()
  const expDate = new Date(expiry)
  const T = Math.max((expDate.getTime() - today.getTime()) / (365.25 * 24 * 60 * 60 * 1000), 0.001)
  const r = 0.05 // 5% risk-free rate

  const greeks = underlying ? blackScholes(underlying.price, strike, T, r, sigma, isCall) : null

  const expirations = [
    '2026-07-18', '2026-08-15', '2026-09-19', '2026-12-18', '2027-01-15', '2027-06-18',
  ]

  return (
    <NexusLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-accent-cyan">BLACK-SCHOLES CALCULATOR</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              Theoretical option pricing · Real underlying prices from Yahoo Finance
            </p>
          </div>
          <LiveDot status={loading ? 'stale' : 'live'} label />
        </div>

        {/* Disclaimer */}
        <div className="bg-accent-cyan/10 border border-accent-cyan rounded-lg p-3">
          <p className="text-xs font-mono text-accent-cyan">
            NOTE: This is a theoretical calculator using Black-Scholes model.
            It does NOT display real options chain data.
            Greeks are computed from real underlying prices + your input parameters.
          </p>
        </div>

        {/* Symbol Selector */}
        <div className="flex flex-wrap gap-2">
          {SYMBOLS.map(s => (
            <button key={s} onClick={() => setSelected(s)}
              className={`px-3 py-1 text-[10px] font-mono rounded border transition-colors ${
                selected === s
                  ? 'bg-teal-vivid text-bg-base border-teal-vivid font-bold'
                  : 'bg-bg-panel border-border-dim text-text-muted hover:border-border-active'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Underlying Info */}
        {underlying && (
          <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono text-text-primary">{underlying.symbol}</h2>
                <p className="text-xs text-text-muted font-mono">Underlying Price</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold font-mono text-text-primary">${underlying.price.toFixed(2)}</p>
                <p className={`text-xs font-mono ${underlying.change >= 0 ? 'text-data-bull' : 'text-data-bear'}`}>
                  {underlying.change >= 0 ? '+' : ''}{underlying.change.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
            <label className="text-[10px] text-text-muted font-mono block mb-1">Strike Price ($)</label>
            <input type="number" value={strike} onChange={e => setStrike(Number.parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs font-mono bg-bg-elevated border border-border-dim rounded text-text-primary" />
          </div>
          <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
            <label className="text-[10px] text-text-muted font-mono block mb-1">Expiration</label>
            <select value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full px-2 py-1 text-xs font-mono bg-bg-elevated border border-border-dim rounded text-text-primary">
              {expirations.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
            <label className="text-[10px] text-text-muted font-mono block mb-1">Implied Vol (%)</label>
            <input type="number" value={(sigma * 100).toFixed(0)} onChange={e => setSigma(Number.parseFloat(e.target.value) / 100 || 0.25)}
              className="w-full px-2 py-1 text-xs font-mono bg-bg-elevated border border-border-dim rounded text-text-primary" />
          </div>
          <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
            <label className="text-[10px] text-text-muted font-mono block mb-1">Type</label>
            <div className="flex gap-2">
              {(['CALL', 'PUT'] as const).map(t => (
                <button key={t} onClick={() => setIsCall(t === 'CALL')}
                  className={`flex-1 px-2 py-1 text-xs font-mono rounded border ${
                    (t === 'CALL') === isCall
                      ? t === 'CALL' ? 'bg-data-bull text-white border-data-bull' : 'bg-data-bear text-white border-data-bear'
                      : 'bg-bg-elevated border-border-dim text-text-muted'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {greeks && (
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">PRICE</p>
              <p className="text-xl font-bold font-mono text-text-primary">${greeks.price.toFixed(2)}</p>
            </div>
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">DELTA</p>
              <p className="text-xl font-bold font-mono text-text-primary">{greeks.delta.toFixed(4)}</p>
            </div>
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">GAMMA</p>
              <p className="text-xl font-bold font-mono text-text-primary">{greeks.gamma.toFixed(4)}</p>
            </div>
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">THETA</p>
              <p className="text-xl font-bold font-mono text-data-bear">{greeks.theta.toFixed(2)}</p>
            </div>
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">VEGA</p>
              <p className="text-xl font-bold font-mono text-text-primary">{greeks.vega.toFixed(2)}</p>
            </div>
            <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
              <p className="text-[10px] text-text-muted font-mono">RHO</p>
              <p className="text-xl font-bold font-mono text-text-primary">{greeks.rho.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Greeks Explanation */}
        <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
          <h2 className="text-xs font-mono text-accent-cyan mb-2">GREEKS EXPLAINED</h2>
          <div className="grid grid-cols-2 gap-4 text-xs text-text-dim">
            <div>
              <p className="font-mono text-text-primary mb-1">Delta: Price sensitivity to $1 move</p>
              <p>Call delta: 0 to 1. Put delta: -1 to 0. ATM options have delta ~0.5.</p>
            </div>
            <div>
              <p className="font-mono text-text-primary mb-1">Gamma: Delta sensitivity to $1 move</p>
              <p>Highest for ATM options near expiration. Measures convexity.</p>
            </div>
            <div>
              <p className="font-mono text-text-primary mb-1">Theta: Daily time decay</p>
              <p>Always negative for long options. Accelerates near expiration.</p>
            </div>
            <div>
              <p className="font-mono text-text-primary mb-1">Vega: Sensitivity to 1% IV change</p>
              <p>Highest for ATM options with longer expiration.</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-panel border border-border-dim rounded-lg p-4">
          <h2 className="text-xs font-mono text-accent-cyan mb-2">SOURCE</h2>
          <p className="text-xs text-text-dim">
            Underlying prices from Yahoo Finance (real-time).
            Greeks computed using Black-Scholes model.
            Risk-free rate: 5% (US Treasury).
            This is a calculator — not real options chain data.
          </p>
        </div>
      </div>
    </NexusLayout>
  )
}
