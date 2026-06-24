# Implementation Plan — Final Quality Pass
> Date: 2026-06-24 | Target: 100% tested, verified, production-ready

## Phase 1: Fix all broken/empty pages (30min)
- [ ] 1.1 Test every sidebar page in browser — log empty/broken states
- [ ] 1.2 Fix every page that shows no data
- [ ] 1.3 Verify all API endpoints return real data
- [ ] 1.4 Test every tab in consolidated hubs (trading, defi, onchain, macro, analytics)

## Phase 2: Add integration tests (30min)
- [ ] 2.1 Write API integration tests for critical endpoints
- [ ] 2.2 Test cache behavior (HIT/MISS)
- [ ] 2.3 Test rate limiting
- [ ] 2.4 Verify 184/184 existing tests still pass

## Phase 3: Performance & reliability (20min)
- [ ] 3.1 Verify all external API calls have timeout + retry
- [ ] 3.2 Verify all getCached calls have proper TTL
- [ ] 3.3 Test cache status endpoint
- [ ] 3.4 Verify PM2 auto-restart on crash

## Phase 4: Security audit (15min)
- [ ] 4.1 Verify no secrets in code
- [ ] 4.2 Verify rate limiting on all public routes
- [ ] 4.3 Verify CORS headers
- [ ] 4.4 Test unauthorized access to protected routes

## Phase 5: Final verification (15min)
- [ ] 5.1 All 35+ pages return 200
- [ ] 5.2 All critical APIs return real data
- [ ] 5.3 Build succeeds
- [ ] 5.4 All tests pass
- [ ] 5.5 Commit + push
