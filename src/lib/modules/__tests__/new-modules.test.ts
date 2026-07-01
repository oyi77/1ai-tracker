/**
 * Tests for the newly added data modules:
 * - us-treasury
 * - mempool
 * - sec-edgar
 * - deribit-options
 * - polymarket-clob
 * - defillama-research
 */

import { describe, it, expect } from 'vitest'
import usTreasury from '../macro/treasury/yields'
import mempool from '../macro/mempool/stats'
import secEdgar from '../equities/sec-edgar/filings'
import deribitOptions from '../derivatives/deribit/options'
import polymarketClob from '../prediction/polymarket/markets'
import defillamaResearch from '../news/defillama'

describe('New Alpha Data Modules structure & fallback validation', () => {
  const newModules = [
    { mod: usTreasury, name: 'US Treasury' },
    { mod: mempool, name: 'Mempool' },
    { mod: secEdgar, name: 'SEC EDGAR' },
    { mod: deribitOptions, name: 'Deribit Options' },
    { mod: polymarketClob, name: 'Polymarket CLOB' },
    { mod: defillamaResearch, name: 'DefiLlama Research' },
  ]

  for (const { mod, name } of newModules) {
    describe(name, () => {
      it('has valid structure', () => {
        expect(mod.id).toBeDefined()
        expect(mod.name).toBeDefined()
        expect(mod.category).toBeDefined()
        expect(mod.sourceType).toBeDefined()
        expect(mod.provenance).toBeDefined()
        expect(mod.isEnabled).toBeTypeOf('function')
        expect(mod.healthCheck).toBeTypeOf('function')
        expect(mod.fetch).toBeTypeOf('function')
        if (mod.sourceType === 're') {
          expect(mod.fallbackFn).toBeTypeOf('function')
        }
      })

      it('fallbackFn returns correctly formatted data', async () => {
        if (mod.fallbackFn) {
          const params = {}
          const fallback = await mod.fallbackFn(params)
          expect(fallback).toBeDefined()
          expect(fallback.data).toBeDefined()
          expect(fallback.source).toContain('fallback')
          expect(fallback.cached).toBe(false)
          expect(fallback.timestamp).toBeLessThanOrEqual(Date.now())
        }
      })
    })
  }
})
