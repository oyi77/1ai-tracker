import { describe, expect, it } from 'vitest'
import { getCohorts, getCohortSignals } from '@/lib/modules/derived/cohort-engine'

describe('cohort engine', () => {
  it('getCohorts returns zeroed definitions (no Math.random)', async () => {
    const cohorts = await getCohorts()
    expect(cohorts.length).toBeGreaterThan(0)

    for (const c of cohorts) {
      expect(c.walletCount).toBe(0)
      expect(c.netFlow24h).toBe(0)
      expect(c.topAssets).toEqual([])
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
    }
  })

  it('getCohortSignals returns empty (no fabricated data)', async () => {
    const signals = await getCohortSignals()
    expect(signals).toEqual([])
  })
})
