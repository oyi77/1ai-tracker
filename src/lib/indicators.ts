// ─── Technical Indicators Library ─────────────────────────
// Calculates RSI, SMA, EMA, MACD, Bollinger Bands from OHLCV data.
// All functions are pure — no side effects, no external dependencies.
// ─────────────────────────────────────────────────────────

export interface OHLCV {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IndicatorPoint {
  time: number
  value: number
}

// ─── Simple Moving Average ────────────────────────────────

export function SMA(data: OHLCV[], period: number): IndicatorPoint[] {
  if (data.length < period) return []

  const result: IndicatorPoint[] = []
  let sum = 0

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close
    if (i >= period) {
      sum -= data[i - period].close
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: sum / period })
    }
  }

  return result
}

// ─── Exponential Moving Average ───────────────────────────

export function EMA(data: OHLCV[], period: number): IndicatorPoint[] {
  if (data.length < period) return []

  const result: IndicatorPoint[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for first value
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  let ema = sum / period
  result.push({ time: data[period - 1].time, value: ema })

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema
    result.push({ time: data[i].time, value: ema })
  }

  return result
}

// ─── Relative Strength Index ──────────────────────────────

export function RSI(data: OHLCV[], period: number = 14): IndicatorPoint[] {
  if (data.length < period + 1) return []

  const result: IndicatorPoint[] = []
  let avgGain = 0
  let avgLoss = 0

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }

  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  result.push({ time: data[period].time, value: rsi })

  // Smoothed RSI for remaining data
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const smoothRs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push({ time: data[i].time, value: 100 - (100 / (1 + smoothRs)) })
  }

  return result
}

// ─── MACD (Moving Average Convergence Divergence) ─────────

export interface MACDResult {
  macd: IndicatorPoint[]
  signal: IndicatorPoint[]
  histogram: IndicatorPoint[]
}

export function MACD(
  data: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): MACDResult {
  const fastEma = EMA(data, fastPeriod)
  const slowEma = EMA(data, slowPeriod)

  if (fastEma.length === 0 || slowEma.length === 0) {
    return { macd: [], signal: [], histogram: [] }
  }

  // Align fast and slow EMA by time
  const slowMap = new Map(slowEma.map(p => [p.time, p.value]))
  const macdLine: IndicatorPoint[] = []

  for (const fast of fastEma) {
    const slowVal = slowMap.get(fast.time)
    if (slowVal !== undefined) {
      macdLine.push({ time: fast.time, value: fast.value - slowVal })
    }
  }

  // Signal line is EMA of MACD line
  if (macdLine.length < signalPeriod) {
    return { macd: macdLine, signal: [], histogram: [] }
  }

  const signalLine: IndicatorPoint[] = []
  const multiplier = 2 / (signalPeriod + 1)

  let sum = 0
  for (let i = 0; i < signalPeriod; i++) {
    sum += macdLine[i].value
  }
  let ema = sum / signalPeriod
  signalLine.push({ time: macdLine[signalPeriod - 1].time, value: ema })

  for (let i = signalPeriod; i < macdLine.length; i++) {
    ema = (macdLine[i].value - ema) * multiplier + ema
    signalLine.push({ time: macdLine[i].time, value: ema })
  }

  // Histogram = MACD - Signal
  const signalMap = new Map(signalLine.map(p => [p.time, p.value]))
  const histogram: IndicatorPoint[] = []

  for (const macd of macdLine) {
    const sigVal = signalMap.get(macd.time)
    if (sigVal !== undefined) {
      histogram.push({ time: macd.time, value: macd.value - sigVal })
    }
  }

  return { macd: macdLine, signal: signalLine, histogram }
}

// ─── Bollinger Bands ──────────────────────────────────────

export interface BollingerBands {
  upper: IndicatorPoint[]
  middle: IndicatorPoint[]
  lower: IndicatorPoint[]
}

export function Bollinger(
  data: OHLCV[],
  period: number = 20,
  stdDev: number = 2,
): BollingerBands {
  const sma = SMA(data, period)
  if (sma.length === 0) return { upper: [], middle: [], lower: [] }

  const upper: IndicatorPoint[] = []
  const lower: IndicatorPoint[] = []

  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1
    const slice = data.slice(dataIndex - period + 1, dataIndex + 1)
    const mean = sma[i].value

    const variance = slice.reduce((sum, d) => sum + Math.pow(d.close - mean, 2), 0) / period
    const std = Math.sqrt(variance)

    upper.push({ time: sma[i].time, value: mean + stdDev * std })
    lower.push({ time: sma[i].time, value: mean - stdDev * std })
  }

  return { upper, middle: sma, lower }
}

// ─── Helper: compute all indicators for a dataset ─────────

export interface AllIndicators {
  sma20: IndicatorPoint[]
  sma50: IndicatorPoint[]
  sma200: IndicatorPoint[]
  ema20: IndicatorPoint[]
  ema50: IndicatorPoint[]
  rsi14: IndicatorPoint[]
  macd: MACDResult
  bollinger: BollingerBands
}

export function computeAllIndicators(data: OHLCV[]): AllIndicators {
  return {
    sma20: SMA(data, 20),
    sma50: SMA(data, 50),
    sma200: SMA(data, 200),
    ema20: EMA(data, 20),
    ema50: EMA(data, 50),
    rsi14: RSI(data, 14),
    macd: MACD(data),
    bollinger: Bollinger(data),
  }
}
