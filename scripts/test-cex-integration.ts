/**
 * Integration test — hits real CEX APIs.
 * Run: npx tsx scripts/test-cex-integration.ts
 */
import { CexClient } from "../src/lib/cex/client";
import { CexCache } from "../src/lib/cex/cache";
import { CexRateLimiter } from "../src/lib/cex/rate-limiter";

async function testCexAdapters() {
  console.log("=== CEX ADAPTER INTEGRATION TEST ===\n");

  const cache = new CexCache();
  const rateLimiter = new CexRateLimiter();
  const client = new CexClient(cache, rateLimiter);

  const start = Date.now();

  // 1. Exchange Status
  console.log("--- getExchangeStatus ---");
  const statuses = await client.getExchangeStatus();
  for (const [id, exc] of Object.entries(statuses)) {
    console.log(`  ${id}: status=${exc.status} fee=${exc.makerFee}/${exc.takerFee}`);
  }

  // 2. Pairs
  console.log("\n--- getPairs ---");
  const pairs = await client.getPairs();
  console.log(`  ${pairs.length} pairs returned`);
  if (pairs.length > 0) {
    console.log(`  sample: ${pairs.slice(0, 3).map(p => p.symbol).join(", ")}`);
  }

  // 3. Funding Rates (BTC)
  console.log("\n--- getFundingRates (BTC) ---");
  const funding = await client.getFundingRates("BTC");
  console.log(`  ${funding.length} rates returned`);
  if (funding.length > 0) {
    console.log(`  sample: ${funding.slice(0, 3).map(r => `${r.exchange}:${r.fundingRate}`).join(", ")}`);
  }

  // 4. Open Interest (BTC)
  console.log("\n--- getOpenInterest (BTC) ---");
  const oi = await client.getOpenInterest("BTC");
  console.log(`  ${oi.length} OI entries`);
  if (oi.length > 0) {
    console.log(`  sample: ${oi.slice(0, 3).map(o => `${o.exchange}:$${o.openInterestUsd.toLocaleString()}`).join(", ")}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== DONE in ${elapsed}s ===`);
}

testCexAdapters().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
