// ─────────────────────────────────────────────────────────────
// GET /api/v1/defi/overview — Comprehensive DeFi intelligence
// DEX volume, stablecoins, bridges, fees, yields in one call
// ─────────────────────────────────────────────────────────────

import { apiSuccess, apiError, cacheHeaders } from '@/lib/api/response'
import { registerAllModules } from '@/lib/modules'

export async function GET() {
  const registry = registerAllModules()

  const [tvlRes, dexRes, stableRes, feeRes, yieldRes] = await Promise.allSettled([
    registry.fetchOne('defillama', { action: 'chains' }),
    registry.fetchOne('defillama', { action: 'dex-volumes' }),
    registry.fetchOne('defillama', { action: 'stablecoins' }),
    registry.fetchOne('defillama', { action: 'fees' }),
    registry.fetchOne('defillama', { action: 'yields' }),
  ])

  const data = {
    chains: tvlRes.status === 'fulfilled' ? tvlRes.value.data : null,
    dexVolumes: dexRes.status === 'fulfilled' ? dexRes.value.data : null,
    stablecoins: stableRes.status === 'fulfilled' ? stableRes.value.data : null,
    fees: feeRes.status === 'fulfilled' ? feeRes.value.data : null,
    yields: yieldRes.status === 'fulfilled' ? yieldRes.value.data : null,
  }

  const allFailed = [tvlRes, dexRes, stableRes, feeRes, yieldRes].every(r => r.status === 'rejected')
  if (allFailed) {
  return cacheHeaders(apiError('[defi/overview] All upstream fetches failed', 502), 120)
  }

  return cacheHeaders(apiSuccess(data), 120)
}
