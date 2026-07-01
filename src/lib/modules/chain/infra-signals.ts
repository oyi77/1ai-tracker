// ─────────────────────────────────────────────────────────────
// Infrastructure Signals Module
// Tracks Lightning Network, mempool congestion, and hash rate
// Zero API keys — uses 1ml.com, mempool.space, CoinGecko
// ─────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────

export interface LightningData {
  capacityBtc: number | null
  nodeCount: number | null
  channelCount: number | null
  timestamp: string
}

export interface MempoolCongestionData {
  pendingTxCount: number | null
  medianFee: number | null
  fastestFee: number | null
  halfHourFee: number | null
  hourFee: number | null
  economyFee: number | null
  timestamp: string
}

export interface HashRateData {
  hashrate: number | null     // in EH/s
  difficulty: number | null
  timestamp: string
}

export interface BtcPriceData {
  priceUsd: number | null
  timestamp: string
}

export interface InfraSignalsSnapshot {
  lightning: LightningData
  mempool: MempoolCongestionData
  hashRate: HashRateData
  btcPrice: BtcPriceData
  compositeScore: number       // 0-100 adoption signal
  compositeLabel: string       // human-readable
  timestamp: string
}

// ── Lightning Network (1ml.com) ────────────────────────────

export async function fetchLightning(): Promise<LightningData> {
  const result: LightningData = {
    capacityBtc: null,
    nodeCount: null,
    channelCount: null,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch('https://1ml.com/lnd/graph/latest', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return result

    const data = await res.json() as {
      num_nodes?: number
      num_channels?: number
      total_capacity?: number  // in satoshis
    }

    result.nodeCount = data.num_nodes ?? null
    result.channelCount = data.num_channels ?? null
    result.capacityBtc = data.total_capacity != null
      ? data.total_capacity / 1e8  // satoshis → BTC
      : null
  } catch {
    // 1ml.com may be unavailable
  }

  return result
}

// ── Mempool Congestion (mempool.space) ─────────────────────

export async function fetchMempoolCongestion(): Promise<MempoolCongestionData> {
  const result: MempoolCongestionData = {
    pendingTxCount: null,
    medianFee: null,
    fastestFee: null,
    halfHourFee: null,
    hourFee: null,
    economyFee: null,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch('https://mempool.space/api/v1/fees/mempool', {
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const fees = await res.json() as {
        fastestFee?: number
        halfHourFee?: number
        hourFee?: number
        economyFee?: number
        minimumFee?: number
      }
      result.fastestFee = fees.fastestFee ?? null
      result.halfHourFee = fees.halfHourFee ?? null
      result.hourFee = fees.hourFee ?? null
      result.economyFee = fees.economyFee ?? null
    }
  } catch { /* optional */ }

  try {
    const res = await fetch('https://mempool.space/api/mempool', {
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const data = await res.json() as { count?: number }
      result.pendingTxCount = data.count ?? null
    }
  } catch { /* optional */ }

  // Fetch recommended fees for median
  try {
    const res = await fetch('https://mempool.space/api/v1/fees/recommended', {
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const data = await res.json() as { halfHourFee?: number }
      result.medianFee = data.halfHourFee ?? result.halfHourFee ?? null
    }
  } catch { /* optional */ }

  return result
}

// ── Hash Rate (mempool.space) ──────────────────────────────

export async function fetchHashRate(): Promise<HashRateData> {
  const result: HashRateData = {
    hashrate: null,
    difficulty: null,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch('https://mempool.space/api/v1/mining/hashrate/1m', {
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const data = await res.json() as { currentHashrate?: number; difficulty?: number }
      if (data.currentHashrate) {
        result.hashrate = data.currentHashrate / 1e18 // H/s → EH/s
      }
      result.difficulty = data.difficulty ?? null
    }
  } catch { /* optional */ }

  return result
}

// ── BTC Price (CoinGecko) ──────────────────────────────────

export async function fetchBtcPrice(): Promise<BtcPriceData> {
  const result: BtcPriceData = {
    priceUsd: null,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { signal: AbortSignal.timeout(10_000) },
    )
    if (res.ok) {
      const data = await res.json() as { bitcoin?: { usd?: number } }
      result.priceUsd = data?.bitcoin?.usd ?? null
    }
  } catch { /* optional */ }

  return result
}

// ── Composite Score ────────────────────────────────────────

function computeComposite(
  lightning: LightningData,
  mempool: MempoolCongestionData,
  hashRate: HashRateData,
): { score: number; label: string } {
  let score = 50 // neutral baseline
  let factors = 0

  // Lightning capacity score (higher = more adoption)
  if (lightning.capacityBtc != null) {
    factors++
    if (lightning.capacityBtc > 5000) score += 15
    else if (lightning.capacityBtc > 3000) score += 10
    else if (lightning.capacityBtc > 1000) score += 5
    else score -= 5
  }

  // Lightning node count (higher = more adoption)
  if (lightning.nodeCount != null) {
    factors++
    if (lightning.nodeCount > 15000) score += 10
    else if (lightning.nodeCount > 10000) score += 5
    else score -= 5
  }

  // Mempool congestion (high fees = high demand for block space = bullish)
  if (mempool.fastestFee != null) {
    factors++
    if (mempool.fastestFee > 50) score += 10   // very congested
    else if (mempool.fastestFee > 20) score += 5
    else if (mempool.fastestFee < 5) score -= 5  // very quiet
  }

  // Pending tx count (moderate is healthy)
  if (mempool.pendingTxCount != null) {
    factors++
    if (mempool.pendingTxCount > 100000) score += 5
    else if (mempool.pendingTxCount > 50000) score += 3
    else if (mempool.pendingTxCount < 10000) score -= 5
  }

  // Hash rate (higher = more security, more miners = bullish)
  if (hashRate.hashrate != null) {
    factors++
    if (hashRate.hashrate > 700) score += 15
    else if (hashRate.hashrate > 500) score += 10
    else if (hashRate.hashrate > 300) score += 5
    else score -= 10
  }

  // Normalize if we have no factors
  if (factors === 0) {
    return { score: 50, label: 'Insufficient data — no signals available' }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  let label: string
  if (score >= 80) label = 'Strong adoption — infrastructure signals bullish'
  else if (score >= 65) label = 'Healthy infrastructure — moderate bullish'
  else if (score >= 50) label = 'Neutral infrastructure — balanced signals'
  else if (score >= 35) label = 'Weak infrastructure — caution warranted'
  else label = 'Degrading infrastructure — bearish signal'

  return { score, label }
}

// ── Aggregate Fetch ────────────────────────────────────────

export async function fetchInfraSignals(): Promise<InfraSignalsSnapshot> {
  const [lightning, mempool, hashRate, btcPrice] = await Promise.allSettled([
    fetchLightning(),
    fetchMempoolCongestion(),
    fetchHashRate(),
    fetchBtcPrice(),
  ])

  const ln = lightning.status === 'fulfilled' ? lightning.value : {
    capacityBtc: null, nodeCount: null, channelCount: null, timestamp: new Date().toISOString(),
  }
  const mp = mempool.status === 'fulfilled' ? mempool.value : {
    pendingTxCount: null, medianFee: null, fastestFee: null,
    halfHourFee: null, hourFee: null, economyFee: null, timestamp: new Date().toISOString(),
  }
  const hr = hashRate.status === 'fulfilled' ? hashRate.value : {
    hashrate: null, difficulty: null, timestamp: new Date().toISOString(),
  }
  const bp = btcPrice.status === 'fulfilled' ? btcPrice.value : {
    priceUsd: null, timestamp: new Date().toISOString(),
  }

  const { score, label } = computeComposite(ln, mp, hr)

  return {
    lightning: ln,
    mempool: mp,
    hashRate: hr,
    btcPrice: bp,
    compositeScore: score,
    compositeLabel: label,
    timestamp: new Date().toISOString(),
  }
}

// ── Persist ────────────────────────────────────────────────

export async function persistInfraSignals(snapshot: InfraSignalsSnapshot): Promise<boolean> {
  try {
    const records = [
      snapshot.lightning.capacityBtc != null && {
        metric: 'lightning_capacity',
        value: snapshot.lightning.capacityBtc,
        unit: 'BTC',
        metadata: {
          nodeCount: snapshot.lightning.nodeCount,
          channelCount: snapshot.lightning.channelCount,
        },
      },
      snapshot.lightning.nodeCount != null && {
        metric: 'lightning_nodes',
        value: snapshot.lightning.nodeCount,
        unit: 'nodes',
        metadata: {
          capacityBtc: snapshot.lightning.capacityBtc,
          channelCount: snapshot.lightning.channelCount,
        },
      },
      snapshot.mempool.pendingTxCount != null && {
        metric: 'mempool_congestion',
        value: snapshot.mempool.pendingTxCount,
        unit: 'txs',
        metadata: {
          fastestFee: snapshot.mempool.fastestFee,
          halfHourFee: snapshot.mempool.halfHourFee,
          hourFee: snapshot.mempool.hourFee,
          economyFee: snapshot.mempool.economyFee,
          medianFee: snapshot.mempool.medianFee,
        },
      },
      snapshot.mempool.fastestFee != null && {
        metric: 'mempool_fee',
        value: snapshot.mempool.fastestFee,
        unit: 'sat/vB',
        metadata: {
          pendingTxCount: snapshot.mempool.pendingTxCount,
        },
      },
      snapshot.hashRate.hashrate != null && {
        metric: 'hashrate',
        value: snapshot.hashRate.hashrate,
        unit: 'EH/s',
        metadata: {
          difficulty: snapshot.hashRate.difficulty,
        },
      },
      {
        metric: 'adoption_composite',
        value: snapshot.compositeScore,
        unit: 'score',
        metadata: {
          label: snapshot.compositeLabel,
          btcPriceUsd: snapshot.btcPrice.priceUsd,
          lightningCapacityBtc: snapshot.lightning.capacityBtc,
          pendingTxCount: snapshot.mempool.pendingTxCount,
          hashrateEhs: snapshot.hashRate.hashrate,
        },
      },
    ].filter(Boolean) as { metric: string; value: number; unit: string; metadata: Record<string, unknown> }[]

    for (const r of records) {
      await prisma.infraSignalSnapshot.create({
        data: {
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          metadata: JSON.parse(JSON.stringify(r.metadata)),
        },
      })
    }

    return true
  } catch {
    return false
  }
}
