import { describe, it, expect, beforeEach, vi } from "vitest";
import { HyperliquidAdapter } from "./hyperliquid";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

describe("HyperliquidAdapter", () => {
  let adapter: HyperliquidAdapter;
  let cache: CexCache;
  let rateLimiter: CexRateLimiter;

  beforeEach(() => {
    cache = new CexCache();
    rateLimiter = new CexRateLimiter();
    adapter = new HyperliquidAdapter(cache, rateLimiter);
  });

  describe("getExchangeStatus()", () => {
    it("should_return_exchange_status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ BTC: "42000", ETH: "2500" }),
      });

      const status = await adapter.getExchangeStatus();

      expect(status.id).toBe("hyperliquid");
      expect(status.name).toBe("Hyperliquid");
      expect(["operational", "degraded"]).toContain(status.status);
    });

    it("should_handle_api_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      // Should not throw, should return offline status
      const status = await adapter.getExchangeStatus();
      expect(status.status).toBe("offline");
    });
  });

  describe("getPairs()", () => {
    it("should_return_mapped_pairs", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            universe: [{ name: "BTC" }, { name: "ETH" }, { name: "SOL" }],
          },
          [
            { markPx: "42000", midPx: "41999", funding: "0.0001", openInterest: "10000", prevDayPx: "41000", dayNtlVlm: "500000000" },
            { markPx: "2500", midPx: "2499", funding: "0.00005", openInterest: "5000", prevDayPx: "2400", dayNtlVlm: "200000000" },
            { markPx: "150", midPx: "149.5", funding: "0.0002", openInterest: "2000", prevDayPx: "145", dayNtlVlm: "100000000" },
          ],
        ],
      });

      const pairs = await adapter.getPairs();

      expect(pairs.length).toBe(3);

      const btc = pairs.find((p) => p.baseSymbol === "BTC");
      expect(btc).toBeDefined();
      expect(btc!.priceUsd).toBe(42000);
      expect(btc!.exchange).toBe("hyperliquid");
      expect(btc!.volumeUsd24h).toBe(500000000);
    });

    it("should_return_empty_array_on_api_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("API error"));

      const pairs = await adapter.getPairs();
      expect(pairs).toEqual([]);
    });
  });

  describe("getFundingRates()", () => {
    it("should_return_funding_rate_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: "BTC" }] },
          [
            { markPx: "42000", midPx: "41999", funding: "0.0001", openInterest: "10000", prevDayPx: "41000", dayNtlVlm: "500000000" },
          ],
        ],
      });

      const rates = await adapter.getFundingRates("BTCUSDT");

      expect(rates.length).toBeGreaterThanOrEqual(1);
      expect(rates[0].exchange).toBe("hyperliquid");
      expect(rates[0].fundingRate).toBe(0.0001);
    });

    it("should_return_empty_array_for_unknown_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { universe: [{ name: "BTC" }, { name: "ETH" }] },
          [
            { markPx: "42000", midPx: "41999", funding: "0.0001", openInterest: "10000", prevDayPx: "41000", dayNtlVlm: "500000000" },
            { markPx: "2500", midPx: "2499", funding: "0.00005", openInterest: "5000", prevDayPx: "2400", dayNtlVlm: "200000000" },
          ],
        ],
      });

      const rates = await adapter.getFundingRates("UNKNOWNSYMBOL");
      expect(rates).toEqual([]);
    });
  });

  describe("getOpenInterest()", () => {
    it("should_return_open_interest_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: "BTC" }] },
          [
            { markPx: "42000", midPx: "41999", funding: "0.0001", openInterest: "10000", prevDayPx: "41000", dayNtlVlm: "500000000" },
          ],
        ],
      });

      const oi = await adapter.getOpenInterest("BTCUSDT");

      expect(oi.length).toBeGreaterThanOrEqual(1);
      expect(oi[0].exchange).toBe("hyperliquid");
      expect(oi[0].openInterestUsd).toBeGreaterThan(0);
    });
  });

  describe("getLiquidations()", () => {
    it("should_return_empty_array_as_hyperliquid_does_not_expose_public_liquidations", async () => {
      const liq = await adapter.getLiquidations(24);
      expect(liq).toEqual([]);
    });
  });
});
