// ─────────────────────────────────────────────────────────────
// GET /api/v1/cron/start — Start the price snapshot cron
// Called once on app startup
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError } from '@/lib/api/response'
import { startPriceSnapshotCron } from '@/lib/modules/derived/price-cron'
import { getSnapshotCount, getSymbolCount } from '@/lib/modules/derived/price-store'

let started = false

export async function GET() {
  try {
    if (!started) {
      startPriceSnapshotCron()
      started = true
    }

    const r = apiSuccess({
      status: 'running',
      snapshots: getSnapshotCount(),
      symbols: getSymbolCount(),
    })
    r.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return r
  } catch (err) {
    return apiError((err as Error).message || 'Failed to start cron', 500)
  }
}
