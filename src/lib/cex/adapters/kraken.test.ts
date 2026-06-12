import { describe, it, expect, beforeEach, vi } from "vitest";
import { KrakenAdapter } from "./kraken";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

describe("KrakenAdapter", () => {
  let adapter: KrakenAdapter;
  let cache: CexCache;
  let rateLimiter: CexRateLimiter;

  beforeEach(() => {
    cache = new CexCache();
    rateLimiter = new CexRateLimiter();
    adapter = new KrakenAdapter(cache, rateLimiter);
  });

  describe("getExchangeStatus()", () => {
    it("should_return_exchange_status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: [],
          result: { server_time: "1718000000" },
        }),
      });

      const status = await adapter.getExchangeStatus();

      expect(status.id).toBe("kraken");
      expect(status.name).toBe("Kraken");
      expect(["operational", "degraded"]).toContain(status.status);
    });

    it("should_handle_api_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const status = await adapter.getExchangeStatus();
      expect(status.status).toBe("offline");
    });
  });

  describe("getPairs()", () => {
    it("should_return_ticker_data_for_mapped_pairs", async () => {
      // Kraken ticker API returns nested object keyed by pair name
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: [],
          result: {
            XBTUSD: {
              a: ["42001", "1", "1"],
              b: ["41999", "1", "1"],
              c: ["42000", "0.5"],
              v: ["1000", "800"],
              p: ["41950", "41900"],
              t: [1000, 800],
              l: ["41500", "41300"],
              h: ["42500", "42700"],
              o: ["41000", "41200"],
            },
          },
        }),
      });

      const pairs = await adapter.getPairs();

      expect(pairs.length).toBeGreaterThanOrEqual(1);

      const btc = pairs.find((p) => p.baseSymbol === "BTC" || p.symbol.startsWith("XBT"));
      expect(btc).toBeDefined();
      expect(btc!.exchange).toBe("kraken");
      expect(btc!.priceUsd).toBe(42000);
    });

    it("should_return_empty_array_on_api_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const pairs = await adapter.getPairs();
      expect(pairs).toEqual([]);
    });
  });

  describe("getFundingRates()", () => {
    it("should_return_empty_array_kraken_has_no_public_funding_api", async () => {
      const rates = await adapter.getFundingRates("BTCUSDT");
      expect(rates).toEqual([]);
    });
  });

  describe("getOpenInterest()", () => {
    it("should_return_empty_array_kraken_has_no_public_oi_api", async () => {
      const oi = await adapter.getOpenInterest("BTCUSDT");
      expect(oi).toEqual([]);
    });
  });

  describe("getLiquidations()", () => {
    it("should_return_empty_array_kraken_has_no_public_liquidation_api", async () => {
      const liq = await adapter.getLiquidations(24);
      expect(liq).toEqual([]);
    });
  });
});
