// ─────────────────────────────────────────────────────────────
// GET /api/v1/signal-confidence — Signal confidence scores
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
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

    return NextResponse.json({
      data: {
        signals: data,
        count: data.length,
      },
      meta: null,
      error: null,
    })
  } catch {
    return NextResponse.json({ signals: [], count: 0 })
  }
}
