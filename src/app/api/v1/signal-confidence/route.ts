// ─────────────────────────────────────────────────────────────
// GET /api/v1/signal-confidence — Signal confidence scores
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError } from '@/lib/api/response'
import {
  getAllConfidences,
  calculateConfidenceGrade,
} from '@/lib/modules/derived/signal-confidence'

export async function GET() {
  try {
    const confidences = getAllConfidences()

    const data = confidences.map(c => ({
      signalType: c.signalType,
      confidence: Math.round(c.confidence * 100) / 100,
      sampleSize: c.sampleSize,
      grade: calculateConfidenceGrade(c.confidence),
      lastUpdated: c.lastUpdated.toISOString(),
    }))

    const r = apiSuccess({ signals: data, count: data.length })
    r.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    return r
  } catch {
    return apiError('[signal-confidence] Failed to compute confidence scores', 502)
  }
}
