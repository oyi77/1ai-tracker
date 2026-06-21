// ─────────────────────────────────────────────────────────────
// Signal Confidence Tracker — Tracks signal outcomes over time
// Calculates confidence scores per signal type based on accuracy
// ─────────────────────────────────────────────────────────────

export interface SignalRecord {
  id: string
  signalType: string
  asset: string
  direction: 'bullish' | 'bearish' | 'neutral'
  predictedOutcome: string
  timestamp: number
  timeHorizonMs: number
  outcome?: 'correct' | 'incorrect'
  outcomeRecordedAt?: number
}

export interface SignalConfidence {
  signalType: string
  confidence: number   // 0-100
  sampleSize: number
  lastUpdated: Date
}

export type ConfidenceGrade = 'A' | 'B' | 'C' | 'D' | 'F'

// In-memory store of signal records
const signalRecords: Map<string, SignalRecord> = new Map()

/**
 * Register a new signal for tracking.
 * Call this when a signal is first emitted so we can track its outcome later.
 */
export function registerSignal(record: Omit<SignalRecord, 'outcome' | 'outcomeRecordedAt'>): void {
  signalRecords.set(record.id, { ...record })
}

/**
 * Record the actual outcome for a previously registered signal.
 * Updates the signal record and recalculates confidence for that signal type.
 */
export function recordSignalOutcome(signalId: string, actualOutcome: 'correct' | 'incorrect'): void {
  const record = signalRecords.get(signalId)
  if (!record) return

  record.outcome = actualOutcome
  record.outcomeRecordedAt = Date.now()
  signalRecords.set(signalId, record)
}

/**
 * Get confidence stats for a specific signal type.
 * Confidence = (correct predictions / total predictions with outcomes) × 100
 * Returns 0% confidence with sampleSize 0 when no completed outcomes exist.
 */
export function getSignalConfidence(signalType: string): SignalConfidence {
  const records = Array.from(signalRecords.values())
    .filter(r => r.signalType === signalType && r.outcome != null)

  const total = records.length
  const correct = records.filter(r => r.outcome === 'correct').length
  const confidence = total > 0 ? (correct / total) * 100 : 0
  const lastUpdated = total > 0
    ? new Date(Math.max(...records.map(r => r.outcomeRecordedAt ?? 0)))
    : new Date(0)

  return { signalType, confidence, sampleSize: total, lastUpdated }
}

/**
 * Get confidence stats for all signal types that have at least one registered signal.
 */
export function getAllConfidences(): SignalConfidence[] {
  const types = new Set(Array.from(signalRecords.values()).map(r => r.signalType))
  return Array.from(types).sort().map(type => getSignalConfidence(type))
}

/**
 * Map a confidence percentage to a letter grade.
 *   A: > 80%
 *   B: > 60%
 *   C: > 40%
 *   D: > 20%
 *   F: ≤ 20%
 */
export function calculateConfidenceGrade(confidence: number): ConfidenceGrade {
  if (confidence > 80) return 'A'
  if (confidence > 60) return 'B'
  if (confidence > 40) return 'C'
  if (confidence > 20) return 'D'
  return 'F'
}

/**
 * Get a summary of all signal records (for debugging / admin views).
 */
export function getAllRecords(): SignalRecord[] {
  return Array.from(signalRecords.values())
}

/**
 * Clear all records (for testing).
 */
export function resetConfidenceStore(): void {
  signalRecords.clear()
}
