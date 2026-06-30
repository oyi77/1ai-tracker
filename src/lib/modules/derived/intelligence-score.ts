// ─────────────────────────────────────────────────────────────
// Unified Intelligence Score Engine
// Combines all 14 module outputs into a single 0-100 score
// 50 = neutral, >50 = bullish, <50 = bearish
// Zero hardcoded data — all derived from live module outputs
// ─────────────────────────────────────────────────────────────

import { evaluateCompositeSignals } from '@/lib/modules/derived/composite-signals'
import { fetchETFSummary } from '@/lib/modules/tradfi/etf-flow'
import { fetchPremiumSnapshots } from '@/lib/modules/tradfi/premium-monitor'
import { fetchDerivativesSnapshot } from '@/lib/modules/derived/derivatives-intel'
import { fetchSentimentIntelligence } from '@/lib/modules/sentiment/sentiment-intel'
import { fetchCreditRisk } from '@/lib/modules/defi/credit-risk'
import { fetchMinerFlow, type MinerFlowSnapshot } from '@/lib/modules/chain/miner-flow'
import { fetchNarrativeRotation } from '@/lib/modules/derived/narrative-rotation'
import { fetchStakingQueue, type StakingSnapshot } from '@/lib/modules/chain/staking-queue'
import { fetchNewsIntelligence } from '@/lib/modules/news/news-intel'

export interface ModuleScore {
  module: string
  score: number // 0-100
  weight: number
  weightedScore: number
  signal: string
  dataPoints: number
}

export interface IntelligenceScore {
  composite: number // 0-100
  direction: 'bullish' | 'bearish' | 'neutral'
  confidence: number // 0-100 (based on data availability)
  modules: ModuleScore[]
  compositeSignals: number
  bullishSignals: number
  bearishSignals: number
  timestamp: string
}

// ─── Module Scorers ─────────────────────────────────────────

function scoreDerivatives(data: Awaited<ReturnType<typeof fetchDerivativesSnapshot>>): ModuleScore {
  if (!data.length) return { module: 'Derivatives', score: 50, weight: 0.12, weightedScore: 6, signal: 'No data', dataPoints: 0 }
  const avgFunding = data.reduce((s, d) => s + d.fundingRate, 0) / data.length
  const score = Math.max(0, Math.min(100, 50 + avgFunding * 5000))
  return {
    module: 'Derivatives', score, weight: 0.12, weightedScore: score * 0.12,
    signal: avgFunding > 0.01 ? 'Positive funding — longs dominant' : avgFunding < -0.01 ? 'Negative funding — shorts dominant' : 'Neutral funding',
    dataPoints: data.length,
  }
}

function scoreETF(data: Awaited<ReturnType<typeof fetchETFSummary>> | null): ModuleScore {
  if (!data?.flows?.length) return { module: 'ETF Flows', score: 50, weight: 0.12, weightedScore: 6, signal: 'No data', dataPoints: 0 }
  const trend = data.summary.trend
  const avgFlow = data.summary.avgDailyFlow
  const score = trend === 'inflow' ? Math.min(100, 60 + Math.abs(avgFlow) / 1e8) : trend === 'outflow' ? Math.max(0, 40 - Math.abs(avgFlow) / 1e8) : 50
  return {
    module: 'ETF Flows', score, weight: 0.12, weightedScore: score * 0.12,
    signal: trend === 'inflow' ? `Net inflow — $${(avgFlow / 1e6).toFixed(0)}M/day` : trend === 'outflow' ? `Net outflow — $${(Math.abs(avgFlow) / 1e6).toFixed(0)}M/day` : 'Flat flows',
    dataPoints: data.flows.length,
  }
}

function scoreSentiment(data: Awaited<ReturnType<typeof fetchSentimentIntelligence>>): ModuleScore {
  if (!data.length) return { module: 'Sentiment', score: 50, weight: 0.1, weightedScore: 5, signal: 'No data', dataPoints: 0 }
  const fg = data.find(s => s.source === 'fear_greed')
  if (!fg) return { module: 'Sentiment', score: 50, weight: 0.1, weightedScore: 5, signal: 'No FGI data', dataPoints: 0 }
  return {
    module: 'Sentiment', score: fg.score, weight: 0.1, weightedScore: fg.score * 0.1,
    signal: `${fg.label} (${fg.score})`, dataPoints: data.length,
  }
}

function scorePremiums(data: Awaited<ReturnType<typeof fetchPremiumSnapshots>>): ModuleScore {
  if (!data.length) return { module: 'Premiums', score: 50, weight: 0.08, weightedScore: 4, signal: 'No data', dataPoints: 0 }
  const avgPremium = data.reduce((s, p) => s + p.premiumPct, 0) / data.length
  const score = Math.max(0, Math.min(100, 50 + avgPremium * 20))
  return {
    module: 'Premiums', score, weight: 0.08, weightedScore: score * 0.08,
    signal: avgPremium > 0.3 ? 'Positive premium — US buying' : avgPremium < -0.3 ? 'Negative premium — US selling' : 'Neutral premiums',
    dataPoints: data.length,
  }
}

function scoreCreditRisk(data: Awaited<ReturnType<typeof fetchCreditRisk>>): ModuleScore {
  if (!data.length) return { module: 'Credit Risk', score: 50, weight: 0.08, weightedScore: 4, signal: 'No elevated risk', dataPoints: 0 }
  const critical = data.filter(c => c.riskLevel === 'critical').length
  const high = data.filter(c => c.riskLevel === 'high').length
  const score = Math.max(0, 50 - critical * 10 - high * 5)
  return {
    module: 'Credit Risk', score, weight: 0.08, weightedScore: score * 0.08,
    signal: `${critical} critical, ${high} high risk protocols`, dataPoints: data.length,
  }
}

function scoreMiner(data: MinerFlowSnapshot): ModuleScore {
  if (!data.hashRate) return { module: 'Miner Flow', score: 50, weight: 0.08, weightedScore: 4, signal: 'No hash rate data', dataPoints: 0 }
  const hr = data.hashRate
  const score = hr > 700 ? 70 : hr > 500 ? 55 : hr > 300 ? 40 : 30
  return {
    module: 'Miner Flow', score, weight: 0.08, weightedScore: score * 0.08,
    signal: data.signal, dataPoints: 1,
  }
}

function scoreNarrative(data: Awaited<ReturnType<typeof fetchNarrativeRotation>>): ModuleScore {
  if (!data.length) return { module: 'Narrative', score: 50, weight: 0.08, weightedScore: 4, signal: 'No data', dataPoints: 0 }
  const inflows = data.filter(s => s.signal === 'inflow').length
  const outflows = data.filter(s => s.signal === 'outflow').length
  const ratio = inflows / Math.max(1, outflows)
  const score = Math.max(0, Math.min(100, 50 + (ratio - 1) * 25))
  return {
    module: 'Narrative', score, weight: 0.08, weightedScore: score * 0.08,
    signal: `${inflows} inflow, ${outflows} outflow sectors`, dataPoints: data.length,
  }
}

function scoreStaking(data: StakingSnapshot): ModuleScore {
  const entryQ = data.entryQueue ?? 0
  const exitQ = data.exitQueue ?? 0
  if (!entryQ && !exitQ) return { module: 'Staking', score: 50, weight: 0.06, weightedScore: 3, signal: 'No queue data', dataPoints: 0 }
  const ratio = entryQ / Math.max(1, exitQ)
  const score = Math.max(0, Math.min(100, 50 + (ratio - 1) * 20))
  return {
    module: 'Staking', score, weight: 0.06, weightedScore: score * 0.06,
    signal: `Entry: ${entryQ}, Exit: ${exitQ}`, dataPoints: 1,
  }
}

function scoreNews(data: Awaited<ReturnType<typeof fetchNewsIntelligence>>): ModuleScore {
  const events = data.events ?? []
  if (!events.length) return { module: 'News', score: 50, weight: 0.06, weightedScore: 3, signal: 'No news data', dataPoints: 0 }
  const bullish = events.filter(e => e.direction === 'bullish').length
  const bearish = events.filter(e => e.direction === 'bearish').length
  const ratio = bullish / Math.max(1, bearish)
  const score = Math.max(0, Math.min(100, 50 + (ratio - 1) * 20))
  return {
    module: 'News', score, weight: 0.06, weightedScore: score * 0.06,
    signal: `${bullish} bullish, ${bearish} bearish articles`, dataPoints: events.length,
  }
}

function scoreCompositeSignals(signals: Awaited<ReturnType<typeof evaluateCompositeSignals>>): ModuleScore {
  if (!signals.length) return { module: 'Composite Signals', score: 50, weight: 0.14, weightedScore: 7, signal: 'No signals', dataPoints: 0 }
  const bullish = signals.filter(s => s.direction === 'bullish').length
  const bearish = signals.filter(s => s.direction === 'bearish').length
  const avgStrength = signals.reduce((s, sig) => s + (sig.direction === 'bullish' ? sig.strength : sig.direction === 'bearish' ? -sig.strength : 0), 0) / signals.length
  const score = Math.max(0, Math.min(100, 50 + avgStrength / 2))
  return {
    module: 'Composite Signals', score, weight: 0.14, weightedScore: score * 0.14,
    signal: `${bullish} bullish, ${bearish} bearish signals`, dataPoints: signals.length,
  }
}

// ─── Main Scorer ────────────────────────────────────────────

export async function computeIntelligenceScore(): Promise<IntelligenceScore> {
  const [derivatives, etf, sentiment, premiums, creditRisk, minerFlow, narrative, staking, news, compositeSignals] =
    await Promise.allSettled([
      fetchDerivativesSnapshot(),
      fetchETFSummary(),
      fetchSentimentIntelligence(),
      fetchPremiumSnapshots(),
      fetchCreditRisk(),
      fetchMinerFlow(),
      fetchNarrativeRotation(),
      fetchStakingQueue(),
      fetchNewsIntelligence(),
      evaluateCompositeSignals(),
    ])

  const defaultMiner: MinerFlowSnapshot = { outflowToExchangesUsd: null, hashRate: null, hashRateUnit: 'EH/s', difficulty: null, blockHeight: null, signal: 'No data', timestamp: '' }
  const defaultStaking: StakingSnapshot = { asset: '', entryQueue: null, exitQueue: null, netStaked: null, entryWaitDays: null, exitWaitDays: null, timestamp: '' }

  const modules: ModuleScore[] = [
    scoreDerivatives(derivatives.status === 'fulfilled' ? derivatives.value : []),
    scoreETF(etf.status === 'fulfilled' ? etf.value : null),
    scoreSentiment(sentiment.status === 'fulfilled' ? sentiment.value : []),
    scorePremiums(premiums.status === 'fulfilled' ? premiums.value : []),
    scoreCreditRisk(creditRisk.status === 'fulfilled' ? creditRisk.value : []),
    scoreMiner(minerFlow.status === 'fulfilled' ? minerFlow.value : defaultMiner),
    scoreNarrative(narrative.status === 'fulfilled' ? narrative.value : []),
    scoreStaking(staking.status === 'fulfilled' ? staking.value : defaultStaking),
    scoreNews(news.status === 'fulfilled' ? news.value : { events: [], exchangeStatuses: [] }),
    scoreCompositeSignals(compositeSignals.status === 'fulfilled' ? compositeSignals.value : []),
  ]

  const composite = Math.round(modules.reduce((s, m) => s + m.weightedScore, 0) * 100) / 100
  const dataPoints = modules.reduce((s, m) => s + m.dataPoints, 0)
  const confidence = Math.min(100, Math.round((dataPoints / 200) * 100))

  const signals = compositeSignals.status === 'fulfilled' ? compositeSignals.value : []
  const bullishSignals = signals.filter(s => s.direction === 'bullish').length
  const bearishSignals = signals.filter(s => s.direction === 'bearish').length

  return {
    composite,
    direction: composite > 55 ? 'bullish' : composite < 45 ? 'bearish' : 'neutral',
    confidence,
    modules,
    compositeSignals: signals.length,
    bullishSignals,
    bearishSignals,
    timestamp: new Date().toISOString(),
  }
}
