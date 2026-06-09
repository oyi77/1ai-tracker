// ─────────────────────────────────────────────────────────────
// Technical Analysis Indicators — pure TypeScript, zero deps
// Inspired by Fincept Terminal's 50+ indicators
// ─────────────────────────────────────────────────────────────

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignal {
  indicator: string;
  value: number;
  signal: "buy" | "sell" | "neutral";
  strength: number; // 0–100
}

// ─── Helpers ──────────────────────────────────────────────────

function fillNaN(len: number): number[] {
  return new Array(len).fill(NaN);
}

// ─── SMA ─────────────────────────────────────────────────────

export function SMA(data: number[], period: number): number[] {
  const out = fillNaN(data.length);
  if (data.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  out[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    out[i] = sum / period;
  }
  return out;
}

// ─── EMA ─────────────────────────────────────────────────────

export function EMA(data: number[], period: number): number[] {
  const out = fillNaN(data.length);
  if (data.length < period) return out;

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  out[period - 1] = sum / period;

  const k = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    out[i] = data[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

// ─── RSI ─────────────────────────────────────────────────────

export function RSI(data: number[], period = 14): number[] {
  const out = fillNaN(data.length);
  if (data.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average gain/loss over first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // Wilder smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// ─── MACD ────────────────────────────────────────────────────

export function MACD(
  data: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const emaFast = EMA(data, fast);
  const emaSlow = EMA(data, slow);

  const macdLine = fillNaN(data.length);
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(emaFast[i]) && !isNaN(emaSlow[i])) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }

  // Signal line is EMA of the MACD line (skip NaNs by starting after slow-1)
  const signalLine = fillNaN(data.length);
  const start = slow - 1;
  let sum = 0;
  let count = 0;
  for (let i = start; i < start + signal && i < data.length; i++) {
    if (!isNaN(macdLine[i])) {
      sum += macdLine[i];
      count++;
    }
  }
  if (count === signal) {
    signalLine[start + signal - 1] = sum / signal;
    const k = 2 / (signal + 1);
    for (let i = start + signal; i < data.length; i++) {
      if (!isNaN(macdLine[i])) {
        signalLine[i] = macdLine[i] * k + signalLine[i - 1] * (1 - k);
      }
    }
  }

  const histogram = fillNaN(data.length);
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(macdLine[i]) && !isNaN(signalLine[i])) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macdLine, signalLine, histogram };
}

// ─── Bollinger Bands ─────────────────────────────────────────

export function BollingerBands(
  data: number[],
  period = 20,
  stdDev = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = SMA(data, period);
  const upper = fillNaN(data.length);
  const lower = fillNaN(data.length);

  for (let i = period - 1; i < data.length; i++) {
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (data[j] - middle[i]) ** 2;
    }
    const sd = Math.sqrt(sqSum / period);
    upper[i] = middle[i] + stdDev * sd;
    lower[i] = middle[i] - stdDev * sd;
  }

  return { upper, middle, lower };
}

// ─── ATR ─────────────────────────────────────────────────────

export function ATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number[] {
  const len = highs.length;
  const out = fillNaN(len);
  if (len < period + 1) return out;

  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < len; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }

  let atr = 0;
  for (let i = 0; i < period; i++) atr += tr[i];
  atr /= period;
  out[period - 1] = atr;

  // Wilder smoothing
  for (let i = period; i < len; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out[i] = atr;
  }
  return out;
}

// ─── VWAP ────────────────────────────────────────────────────

export function VWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const len = closes.length;
  const out = fillNaN(len);
  if (len === 0) return out;

  let cumTypical = 0;
  let cumVol = 0;

  for (let i = 0; i < len; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTypical += tp * volumes[i];
    cumVol += volumes[i];
    out[i] = cumVol > 0 ? cumTypical / cumVol : NaN;
  }
  return out;
}

// ─── Stochastic Oscillator ───────────────────────────────────

export function StochasticOscillator(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3
): { k: number[]; d: number[] } {
  const len = closes.length;
  const k = fillNaN(len);

  for (let i = kPeriod - 1; i < len; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    const range = hh - ll;
    k[i] = range === 0 ? 50 : ((closes[i] - ll) / range) * 100;
  }

  // %D is SMA of %K
  const d = SMA(k, dPeriod);

  return { k, d };
}

// ─── Compute All Indicators ──────────────────────────────────

export interface AllIndicators {
  sma20: number[];
  ema12: number[];
  rsi14: number[];
  macd: { macdLine: number[]; signalLine: number[]; histogram: number[] };
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  atr14: number[];
  vwap: number[];
  stochastic: { k: number[]; d: number[] };
}

export function computeAll(candles: Candle[]): AllIndicators {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  return {
    sma20: SMA(closes, 20),
    ema12: EMA(closes, 12),
    rsi14: RSI(closes, 14),
    macd: MACD(closes),
    bollinger: BollingerBands(closes),
    atr14: ATR(highs, lows, closes),
    vwap: VWAP(highs, lows, closes, volumes),
    stochastic: StochasticOscillator(highs, lows, closes),
  };
}

// ─── Signal Generation ───────────────────────────────────────

function lastValid(arr: number[]): number | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) return arr[i];
  }
  return undefined;
}

function secondLastValid(arr: number[]): number | undefined {
  let found = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) {
      found++;
      if (found === 2) return arr[i];
    }
  }
  return undefined;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function getSignals(candles: Candle[]): TechnicalSignal[] {
  if (candles.length < 30) return [];

  const ind = computeAll(candles);
  const signals: TechnicalSignal[] = [];
  const price = candles[candles.length - 1].close;

  // RSI signal
  const rsiVal = lastValid(ind.rsi14);
  if (rsiVal !== undefined) {
    const sig: TechnicalSignal["signal"] =
      rsiVal < 30 ? "buy" : rsiVal > 70 ? "sell" : "neutral";
    const strength =
      sig === "buy"
        ? clamp((30 - rsiVal) * (100 / 30), 0, 100)
        : sig === "sell"
          ? clamp((rsiVal - 70) * (100 / 30), 0, 100)
          : 0;
    signals.push({ indicator: "RSI", value: rsiVal, signal: sig, strength });
  }

  // MACD signal (histogram cross)
  const histCur = lastValid(ind.macd.histogram);
  const histPrev = secondLastValid(ind.macd.histogram);
  if (histCur !== undefined && histPrev !== undefined) {
    const sig: TechnicalSignal["signal"] =
      histCur > 0 && histPrev <= 0
        ? "buy"
        : histCur < 0 && histPrev >= 0
          ? "sell"
          : histCur > 0
            ? "buy"
            : histCur < 0
              ? "sell"
              : "neutral";
    const strength = clamp(Math.abs(histCur / price) * 10000, 0, 100);
    signals.push({
      indicator: "MACD",
      value: histCur,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  // Bollinger Bands — price vs bands
  const bbUpper = lastValid(ind.bollinger.upper);
  const bbLower = lastValid(ind.bollinger.lower);
  const bbMid = lastValid(ind.bollinger.middle);
  if (bbUpper !== undefined && bbLower !== undefined && bbMid !== undefined) {
    const bbRange = bbUpper - bbLower;
    const sig: TechnicalSignal["signal"] =
      price <= bbLower ? "buy" : price >= bbUpper ? "sell" : "neutral";
    const strength =
      sig === "buy"
        ? clamp(((bbLower - price) / bbRange) * 100, 0, 100)
        : sig === "sell"
          ? clamp(((price - bbUpper) / bbRange) * 100, 0, 100)
          : clamp(Math.abs((price - bbMid) / (bbRange / 2)) * 50, 0, 100);
    signals.push({
      indicator: "Bollinger",
      value: price,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  // SMA 20 — trend
  const smaVal = lastValid(ind.sma20);
  if (smaVal !== undefined) {
    const pctDiff = ((price - smaVal) / smaVal) * 100;
    const sig: TechnicalSignal["signal"] =
      pctDiff > 2 ? "buy" : pctDiff < -2 ? "sell" : "neutral";
    const strength = clamp(Math.abs(pctDiff) * 10, 0, 100);
    signals.push({
      indicator: "SMA20",
      value: smaVal,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  // EMA 12 — trend
  const emaVal = lastValid(ind.ema12);
  if (emaVal !== undefined) {
    const pctDiff = ((price - emaVal) / emaVal) * 100;
    const sig: TechnicalSignal["signal"] =
      pctDiff > 1 ? "buy" : pctDiff < -1 ? "sell" : "neutral";
    const strength = clamp(Math.abs(pctDiff) * 10, 0, 100);
    signals.push({
      indicator: "EMA12",
      value: emaVal,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  // Stochastic — overbought/oversold
  const stochK = lastValid(ind.stochastic.k);
  if (stochK !== undefined) {
    const sig: TechnicalSignal["signal"] =
      stochK < 20 ? "buy" : stochK > 80 ? "sell" : "neutral";
    const strength =
      sig === "buy"
        ? clamp((20 - stochK) * 5, 0, 100)
        : sig === "sell"
          ? clamp((stochK - 80) * 5, 0, 100)
          : 0;
    signals.push({
      indicator: "Stochastic",
      value: stochK,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  // VWAP — price vs vwap
  const vwapVal = lastValid(ind.vwap);
  if (vwapVal !== undefined) {
    const pctDiff = ((price - vwapVal) / vwapVal) * 100;
    const sig: TechnicalSignal["signal"] =
      pctDiff > 1 ? "buy" : pctDiff < -1 ? "sell" : "neutral";
    const strength = clamp(Math.abs(pctDiff) * 10, 0, 100);
    signals.push({
      indicator: "VWAP",
      value: vwapVal,
      signal: sig,
      strength: Math.round(strength),
    });
  }

  return signals;
}
