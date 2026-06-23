# Notes

## 2026-06-23: toFixed crash fix

Fixed all unguarded `.toFixed()` calls across 16 files in the 1ai-tracker codebase to prevent `TypeError: Cannot read properties of undefined (reading 'toFixed')` crashes when API data has null/undefined values.

### Pattern applied
- **Object property access**: Added `?? 0` guard (e.g., `row.volume.toFixed(2)` → `(row.volume ?? 0).toFixed(2)`)
- **Formatter functions**: Added `if (n == null || isNaN(n)) return '—'` at top of function
- **Locally computed values**: Left unchanged (e.g., `v / 1e9` inside a function that already validates input)

### Files modified
1. `src/app/tokens/page.tsx` — row.volume, row.marketCap, selectedToken.volume/marketCap/change7d
2. `src/app/dashboard/page.tsx` — row.volume
3. `src/app/entities/page.tsx` — row.pnl7d, selectedEntity.pnl7d
4. `src/app/dex/page.tsx` — row.amountIn, row.amountOut, row.volume24h, row.liquidity
5. `src/app/scanner/page.tsx` — formatVolume() null guard
6. `src/app/predictions/tape/page.tsx` — formatNum() null guard
7. `src/app/exchange-flow/page.tsx` — r.avgPriceChange, r.priceChange, fmtUsd() null guard
8. `src/app/derivatives/page.tsx` — r.volume24h, r.fundingRate
9. `src/app/smart-money/page.tsx` — row.confidence, row.winRate
10. `src/app/liquidations/page.tsx` — entry.rate, r.fundingRate, formatUsd() null guard
11. `src/app/mempool/page.tsx` — r.valueBtc, r.rate, formatSats/formatVsize/formatUsd() null guards
12. `src/app/alpha/page.tsx` — signal.zScore
13. `src/app/tokens/discover/page.tsx` — t.priceUsd, t.change24h, formatNum() null guard
14. `src/app/gas/page.tsx` — tier.value
15. `src/app/macro/page.tsx` — latest.value
16. `src/app/entity/[slug]/page.tsx` — entity.confidence

### Already safe (no changes needed)
- `src/app/correlations/page.tsx` — already had `?? 0` guards
- `src/app/predictions/tape/page.tsx` lines 89/94 — guarded by `m.yesPrice != null &&` checks
- Liquidations `bin.longLiquidations > 0` ternaries — undefined > 0 is false, returns ''
- `longDominance.toFixed(0)` — locally computed variable

### Verification
`npx tsc --noEmit` passes with zero errors.
