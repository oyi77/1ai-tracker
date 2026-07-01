// ─────────────────────────────────────────────────────────────
// Composite Signal Engine
// Combines multiple module outputs into compound trading signals
// ETF outflow + rising exchange reserves + negative funding = bearish
// Zero hardcoded values — all derived from live module data
// ─────────────────────────────────────────────────────────────

import { fetchETFSummary } from '@/lib/modules/tradfi/etf/flows'
import { fetchPremiumSnapshots } from '@/lib/modules/tradfi/premium/monitor'
import { fetchDerivativesSnapshot } from '@/lib/modules/derived/derivatives-intel'
import { fetchSentimentIntelligence } from '@/lib/modules/sentiment/sentiment-intel'
import { fetchCreditRisk } from '@/lib/modules/defi/credit/risk'
import { fetchMinerFlow } from '@/lib/modules/chain/bitcoin/miner-flow'
import { fetchNarrativeRotation } from '@/lib/modules/derived/narrative-rotation'
import { fetchStakingQueue } from '@/lib/modules/chain/ethereum/staking-queue'

export interface CompositeSignal {
  id: string
  name: string
  description: string
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: number // 0-100
  components: SignalComponent[]
  timestamp: string
}

export interface SignalComponent {
  module: string
  metric: string
  value: number | string
  weight: number
  contribution: number // -100 to +100
}

// ─── Signal Definitions ─────────────────────────────────────

interface SignalRule {
  id: string
  name: string
  description: string
  modules: string[]
  evaluate: (data: ModuleData) => CompositeSignal | null
}

interface ModuleData {
  etf: Awaited<ReturnType<typeof fetchETFSummary>> | null
  premiums: Awaited<ReturnType<typeof fetchPremiumSnapshots>> | null
  derivatives: Awaited<ReturnType<typeof fetchDerivativesSnapshot>> | null
  sentiment: Awaited<ReturnType<typeof fetchSentimentIntelligence>> | null
  creditRisk: Awaited<ReturnType<typeof fetchCreditRisk>> | null
  minerFlow: Awaited<ReturnType<typeof fetchMinerFlow>> | null
  narrative: Awaited<ReturnType<typeof fetchNarrativeRotation>> | null
  staking: Awaited<ReturnType<typeof fetchStakingQueue>> | null
}

// ─── Signal Rules ───────────────────────────────────────────

const SIGNAL_RULES: SignalRule[] = [
  {
    id: 'bearish-confluence',
    name: 'Bearish Confluence',
    description: 'ETF outflow + negative funding + extreme fear — high conviction bearish',
    modules: ['etf', 'derivatives', 'sentiment'],
    evaluate: (data) => {
      const components: SignalComponent[] = []
      let totalScore = 0

      // ETF flow direction
      if (data.etf?.summary) {
        const trend = data.etf.summary.trend
        const contribution = trend === 'outflow' ? -30 : trend === 'inflow' ? 30 : 0
        components.push({
          module: 'etf',
          metric: 'flow_trend',
          value: trend,
          weight: 0.3,
          contribution,
        })
        totalScore += contribution
      }

      // Derivatives funding
      if (data.derivatives?.length) {
        const avgFunding = data.derivatives.reduce((s, d) => s + d.fundingRate, 0) / data.derivatives.length
        const contribution = avgFunding < -0.01 ? -30 : avgFunding > 0.01 ? 30 : 0
        components.push({
          module: 'derivatives',
          metric: 'avg_funding_rate',
          value: avgFunding,
          weight: 0.3,
          contribution,
        })
        totalScore += contribution
      }

      // Sentiment (Fear & Greed)
      if (data.sentiment?.length) {
        const fg = data.sentiment.find(s => s.source === 'fear_greed')
        if (fg) {
          const contribution = fg.score < 25 ? -25 : fg.score > 75 ? 25 : 0
          components.push({
            module: 'sentiment',
            metric: 'fear_greed',
            value: fg.score,
            weight: 0.25,
            contribution,
          })
          totalScore += contribution
        }
      }

      if (components.length < 2) return null

      const direction = totalScore < -20 ? 'bearish' : totalScore > 20 ? 'bullish' : 'neutral'
      return {
        id: 'bearish-confluence',
        name: 'Bearish Confluence',
        description: 'ETF outflow + negative funding + extreme fear — high conviction bearish',
        direction,
        strength: Math.min(100, Math.abs(totalScore)),
        components,
        timestamp: new Date().toISOString(),
      }
    },
  },
  {
    id: 'smart-money-rotation',
    name: 'Smart Money Rotation',
    description: 'Narrative rotation + premium divergence — capital rotating between sectors',
    modules: ['narrative', 'premiums', 'staking'],
    evaluate: (data) => {
      const components: SignalComponent[] = []
      let totalScore = 0

      // Narrative inflows vs outflows
      if (data.narrative?.length) {
        const inflows = data.narrative.filter(s => s.signal === 'inflow').length
        const outflows = data.narrative.filter(s => s.signal === 'outflow').length
        const contribution = inflows > outflows * 2 ? 25 : outflows > inflows * 2 ? -25 : 0
        components.push({
          module: 'narrative',
          metric: 'inflow_outflow_ratio',
          value: `${inflows}:${outflows}`,
          weight: 0.4,
          contribution,
        })
        totalScore += contribution
      }

      // Coinbase premium
      if (data.premiums?.length) {
        const cbPremium = data.premiums.find(p => p.venuePair.includes('Coinbase'))
        if (cbPremium) {
          const contribution = cbPremium.premiumPct > 0.5 ? 20 : cbPremium.premiumPct < -0.5 ? -20 : 0
          components.push({
            module: 'premiums',
            metric: 'coinbase_premium',
            value: cbPremium.premiumPct,
            weight: 0.3,
            contribution,
          })
          totalScore += contribution
        }
      }

      // Staking queue
      if (data.staking) {
        const entryQ = data.staking.entryQueue ?? 0
        const exitQ = data.staking.exitQueue ?? 0
        const contribution = entryQ > exitQ * 2 ? 15 : exitQ > entryQ * 2 ? -15 : 0
        components.push({
          module: 'staking',
          metric: 'entry_exit_ratio',
          value: `${entryQ}:${exitQ}`,
          weight: 0.3,
          contribution,
        })
        totalScore += contribution
      }

      if (components.length < 2) return null

      const direction = totalScore < -15 ? 'bearish' : totalScore > 15 ? 'bullish' : 'neutral'
      return {
        id: 'smart-money-rotation',
        name: 'Smart Money Rotation',
        description: 'Narrative rotation + premium divergence — capital rotating between sectors',
        direction,
        strength: Math.min(100, Math.abs(totalScore)),
        components,
        timestamp: new Date().toISOString(),
      }
    },
  },
  {
    id: 'miner-capitulation',
    name: 'Miner Capitulation Signal',
    description: 'Low hash rate + negative funding + ETF outflow — miner stress selling',
    modules: ['minerFlow', 'derivatives', 'etf'],
    evaluate: (data) => {
      const components: SignalComponent[] = []
      let totalScore = 0

      // Miner hash rate
      if (data.minerFlow?.hashRate) {
        const hr = data.minerFlow.hashRate
        const contribution = hr < 500 ? -30 : hr > 700 ? 20 : 0
        components.push({
          module: 'minerFlow',
          metric: 'hash_rate',
          value: hr,
          weight: 0.4,
          contribution,
        })
        totalScore += contribution
      }

      // Funding rates
      if (data.derivatives?.length) {
        const avgFunding = data.derivatives.reduce((s, d) => s + d.fundingRate, 0) / data.derivatives.length
        const contribution = avgFunding < -0.005 ? -20 : avgFunding > 0.005 ? 20 : 0
        components.push({
          module: 'derivatives',
          metric: 'avg_funding',
          value: avgFunding,
          weight: 0.3,
          contribution,
        })
        totalScore += contribution
      }

      // ETF flow
      if (data.etf?.summary) {
        const contribution = data.etf.summary.trend === 'outflow' ? -20 : data.etf.summary.trend === 'inflow' ? 20 : 0
        components.push({
          module: 'etf',
          metric: 'flow_trend',
          value: data.etf.summary.trend,
          weight: 0.3,
          contribution,
        })
        totalScore += contribution
      }

      if (components.length < 2) return null

      const direction = totalScore < -20 ? 'bearish' : totalScore > 20 ? 'bullish' : 'neutral'
      return {
        id: 'miner-capitulation',
        name: 'Miner Capitulation Signal',
        description: 'Low hash rate + negative funding + ETF outflow — miner stress selling',
        direction,
        strength: Math.min(100, Math.abs(totalScore)),
        components,
        timestamp: new Date().toISOString(),
      }
    },
  },
  {
    id: 'defi-credit-stress',
    name: 'DeFi Credit Stress',
    description: 'Unsustainable yields + negative sentiment — DeFi protocol risk',
    modules: ['creditRisk', 'sentiment'],
    evaluate: (data) => {
      const components: SignalComponent[] = []
      let totalScore = 0

      // Credit risk protocols
      if (data.creditRisk?.length) {
        const critical = data.creditRisk.filter(c => c.riskLevel === 'critical').length
        const high = data.creditRisk.filter(c => c.riskLevel === 'high').length
        const contribution = critical > 3 ? -40 : high > 5 ? -25 : 0
        components.push({
          module: 'creditRisk',
          metric: 'elevated_protocols',
          value: `${critical} critical, ${high} high`,
          weight: 0.6,
          contribution,
        })
        totalScore += contribution
      }

      // Sentiment
      if (data.sentiment?.length) {
        const fg = data.sentiment.find(s => s.source === 'fear_greed')
        if (fg) {
          const contribution = fg.score < 30 ? -20 : fg.score > 70 ? 20 : 0
          components.push({
            module: 'sentiment',
            metric: 'fear_greed',
            value: fg.score,
            weight: 0.4,
            contribution,
          })
          totalScore += contribution
        }
      }

      if (components.length < 1) return null

      const direction = totalScore < -15 ? 'bearish' : totalScore > 15 ? 'bullish' : 'neutral'
      return {
        id: 'defi-credit-stress',
        name: 'DeFi Credit Stress',
        description: 'Unsustainable yields + negative sentiment — DeFi protocol risk',
        direction,
        strength: Math.min(100, Math.abs(totalScore)),
        components,
        timestamp: new Date().toISOString(),
      }
    },
  },
  {
    id: 'institutional-accumulation',
    name: 'Institutional Accumulation',
    description: 'ETF inflow + positive premium + entry queue growing — institutional buying',
    modules: ['etf', 'premiums', 'staking'],
    evaluate: (data) => {
      const components: SignalComponent[] = []
      let totalScore = 0

      // ETF inflow
      if (data.etf?.summary) {
        const contribution = data.etf.summary.trend === 'inflow' ? 30 : data.etf.summary.trend === 'outflow' ? -30 : 0
        components.push({
          module: 'etf',
          metric: 'flow_trend',
          value: data.etf.summary.trend,
          weight: 0.4,
          contribution,
        })
        totalScore += contribution
      }

      // Premiums
      if (data.premiums?.length) {
        const cbPremium = data.premiums.find(p => p.venuePair.includes('Coinbase'))
        if (cbPremium) {
          const contribution = cbPremium.premiumPct > 0.3 ? 25 : cbPremium.premiumPct < -0.3 ? -25 : 0
          components.push({
            module: 'premiums',
            metric: 'coinbase_premium',
            value: cbPremium.premiumPct,
            weight: 0.35,
            contribution,
          })
          totalScore += contribution
        }
      }

      // Staking entry queue
      if (data.staking) {
        const entryQ = data.staking.entryQueue ?? 0
        const contribution = entryQ > 5000 ? 20 : entryQ < 1000 ? -10 : 0
        components.push({
          module: 'staking',
          metric: 'entry_queue',
          value: entryQ,
          weight: 0.25,
          contribution,
        })
        totalScore += contribution
      }

      if (components.length < 2) return null

      const direction = totalScore < -15 ? 'bearish' : totalScore > 15 ? 'bullish' : 'neutral'
      return {
        id: 'institutional-accumulation',
        name: 'Institutional Accumulation',
        description: 'ETF inflow + positive premium + entry queue growing — institutional buying',
        direction,
        strength: Math.min(100, Math.abs(totalScore)),
        components,
        timestamp: new Date().toISOString(),
      }
    },
  },
]

// ─── Evaluator ──────────────────────────────────────────────

export async function evaluateCompositeSignals(): Promise<CompositeSignal[]> {
  // Fetch all module data in parallel
  const [etf, premiums, derivatives, sentiment, creditRisk, minerFlow, narrative, staking] =
    await Promise.allSettled([
      fetchETFSummary(),
      fetchPremiumSnapshots(),
      fetchDerivativesSnapshot(),
      fetchSentimentIntelligence(),
      fetchCreditRisk(),
      fetchMinerFlow(),
      fetchNarrativeRotation(),
      fetchStakingQueue(),
    ])

  const data: ModuleData = {
    etf: etf.status === 'fulfilled' ? etf.value : null,
    premiums: premiums.status === 'fulfilled' ? premiums.value : null,
    derivatives: derivatives.status === 'fulfilled' ? derivatives.value : null,
    sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
    creditRisk: creditRisk.status === 'fulfilled' ? creditRisk.value : null,
    minerFlow: minerFlow.status === 'fulfilled' ? minerFlow.value : null,
    narrative: narrative.status === 'fulfilled' ? narrative.value : null,
    staking: staking.status === 'fulfilled' ? staking.value : null,
  }

  const signals: CompositeSignal[] = []

  for (const rule of SIGNAL_RULES) {
    try {
      const signal = rule.evaluate(data)
      if (signal) signals.push(signal)
    } catch { /* skip failed rules */ }
  }

  return signals.sort((a, b) => b.strength - a.strength)
}
