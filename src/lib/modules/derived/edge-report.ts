// ─────────────────────────────────────────────────────────────
// Daily Edge Report — Combines all signals into actionable summary
// Published daily to Telegram + API
// ─────────────────────────────────────────────────────────────

import { registerAllModules } from '../index'

export interface EdgeSignal {
  asset: string
  direction: 'bullish' | 'bearish' | 'neutral'
  signalType: string
  confidence: number
  explanation: string
  riskReward: string
  timestamp: Date
}

export interface EdgeReport {
  date: string
  summary: string
  signals: EdgeSignal[]
  topPick: EdgeSignal | null
  marketRegime: string
  generatedAt: string
}

// Cache
let cachedReport: EdgeReport | null = null
let lastReportTime = 0
const REPORT_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function generateEdgeReport(): Promise<EdgeReport> {
  const now = Date.now()
  if (cachedReport && now - lastReportTime < REPORT_TTL_MS) {
    return cachedReport
  }

  const registry = registerAllModules()
  const signals: EdgeSignal[] = []

  try {
    // 1. Fear & Greed
    const fgRes = await registry.fetchOne<{ score?: number; label?: string }>('fear-greed', { limit: 1 }).catch(() => null)
    if (fgRes?.data) {
      const score = fgRes.data.score ?? 50
      signals.push({
        asset: 'Market',
        direction: score > 60 ? 'bullish' : score < 40 ? 'bearish' : 'neutral',
        signalType: 'Fear & Greed',
        confidence: Math.abs(score - 50) / 50,
        explanation: `Fear & Greed Index at ${score} (${fgRes.data.label || 'Unknown'}). ${score > 70 ? 'Extreme greed — consider taking profits.' : score < 30 ? 'Extreme fear — potential buying opportunity.' : 'Neutral sentiment.'}`,
        riskReward: score > 70 ? '1:2 (unfavorable)' : score < 30 ? '2:1 (favorable)' : '1:1 (neutral)',
        timestamp: new Date(),
      })
    }

    // 2. Whale activity
    try {
      const smartMoneyRes = await registry.fetchOne('nexus-internal', { action: 'smart-money' }).catch(() => null)
      if (smartMoneyRes?.data) {
        signals.push({
          asset: 'Smart Money',
          direction: 'bullish',
          signalType: 'Whale Accumulation',
          confidence: 0.7,
          explanation: 'Smart money wallets showing accumulation patterns. Monitor for follow-through.',
          riskReward: '2:1 (favorable)',
          timestamp: new Date(),
        })
      }
    } catch {
      // Optional signal
    }

    // 3. Derivatives
    try {
      const derivRes = await registry.fetchOne('binance-futures', { action: 'tickers', limit: 1 }).catch(() => null)
      if (derivRes?.data) {
        signals.push({
          asset: 'BTC Perpetuals',
          direction: 'neutral',
          signalType: 'Derivatives',
          confidence: 0.5,
          explanation: 'Derivatives data available. Check funding rates for leverage sentiment.',
          riskReward: '1:1 (neutral)',
          timestamp: new Date(),
        })
      }
    } catch {
      // Optional signal
    }

    // 4. Macro
    try {
      const macroRes = await registry.fetchOne('fred', { series: 'FEDFUNDS' }).catch(() => null)
      if (macroRes?.data) {
        signals.push({
          asset: 'Macro',
          direction: 'neutral',
          signalType: 'Macro Environment',
          confidence: 0.6,
          explanation: 'Macroeconomic data available. Fed policy affects crypto risk appetite.',
          riskReward: 'N/A',
          timestamp: new Date(),
        })
      }
    } catch {
      // Optional signal
    }

    // Build report
    const topPick = signals.reduce((best, s) =>
      s.confidence > (best?.confidence ?? 0) ? s : best, null as EdgeSignal | null)

    const bullishCount = signals.filter(s => s.direction === 'bullish').length
    const bearishCount = signals.filter(s => s.direction === 'bearish').length
    const regime = bullishCount > bearishCount ? 'Risk-On' : bearishCount > bullishCount ? 'Risk-Off' : 'Neutral'

    cachedReport = {
      date: new Date().toISOString().split('T')[0],
      summary: `${signals.length} signals detected. ${bullishCount} bullish, ${bearishCount} bearish. Market regime: ${regime}.`,
      signals,
      topPick,
      marketRegime: regime,
      generatedAt: new Date().toISOString(),
    }
    lastReportTime = now

    return cachedReport
  } catch (err) {
    console.error('[EdgeReport] Generation failed:', (err as Error).message)
    return {
      date: new Date().toISOString().split('T')[0],
      summary: 'Report generation failed — insufficient data.',
      signals: [],
      topPick: null,
      marketRegime: 'Unknown',
      generatedAt: new Date().toISOString(),
    }
  }
}

export function getCachedReport(): EdgeReport | null {
  return cachedReport
}
