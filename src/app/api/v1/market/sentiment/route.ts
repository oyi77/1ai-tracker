// ─────────────────────────────────────────────────────────────
// GET /api/v1/market/sentiment — Fear & Greed + other sentiment
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError } from '@/lib/api/response'
import { registerAllModules } from '@/lib/modules'

export async function GET() {
  const registry = registerAllModules()

  try {
    const result = await registry.fetchOne<Array<{ value: number; classification: string }>>('fear-greed', { limit: 1 })
    const data = result.data
    const latest = data?.[0]

    return apiSuccess({
      fearGreed: latest?.value ?? null,
      classification: latest?.classification ?? 'Unknown',
      cached: result.cached,
    })
  } catch {
    return apiError('Failed to fetch sentiment data', 502)
  }
}
