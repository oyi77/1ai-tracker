import { describe, it, expect, beforeEach, vi } from "vitest";
import { OkxAdapter } from "./okx";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

describe("OkxAdapter", () => {
  let adapter: OkxAdapter;
  let cache: CexCache;
  let rateLimiter: CexRateLimiter;

  beforeEach(() => {
    cache = new CexCache();
    rateLimiter = new CexRateLimiter();
    adapter = new OkxAdapter(cache, rateLimiter);
  });

  describe("getExchangeStatus()", () => {
    it("should_return_exchange_status_with_operational_state", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "0", data: [{ ts: "1718000000000" }], msg: "" }),
      });

      const status = await adapter.getExchangeStatus();

      expect(status.id).toBe("okx");
      expect(status.name).toBe("OKX");
      expect(status.status).toBe("operational");
    });

    it("should_return_degraded_on_api_error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "50001", data: [], msg: "Service unavailable" }),
      });

      const status = await adapter.getExchangeStatus();
      expect(status.status).toBe("degraded");
    });
  });

  describe("getPairs()", () => {
    it("should_return_empty_array_on_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const pairs = await adapter.getPairs();

      expect(pairs).toEqual([]);
    });

    it("should_normalize_spot_ticker_data_correctly", async () => {
      // getPairs() calls getSpotPairs() + getSwapPairs() in parallel,
      // each making instrument + ticker fetches → use mockResolvedValue for all calls
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "0",
          data: [
            {
              instId: "BTC-USDT",
              last: "42000",
              askPx: "42001",
              askSz: "1",
              bidPx: "41999",
              bidSz: "1",
              open24h: "40000",
              high24h: "42500",
              low24h: "41500",
              volCcy24h: "42000000",
              vol24h: "1000",
              ts: "1718000000000",
            },
          ],
          msg: "",
        }),
      });

      const pairs = await adapter.getPairs();
      const btc = pairs.find((p) => p.symbol === "BTCUSDT");

      expect(btc).toBeDefined();
      expect(btc!.exchange).toBe("okx");
      expect(btc!.baseSymbol).toBe("BTC");
      expect(btc!.quoteSymbol).toBe("USDT");
      expect(btc!.priceUsd).toBe(42000);
      expect(btc!.volumeUsd24h).toBe(42000000);
    });

    it("should_cache_pairs_for_60_seconds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "0",
          data: [{ instId: "BTC-USDT", last: "42000", askPx: "42001", askSz: "1", bidPx: "41999", bidSz: "1", volCcy24h: "42000000", vol24h: "1000", ts: "1718000000000" }],
          msg: "",
        }),
      });

      const pairs1 = await adapter.getPairs();
      expect(pairs1.length).toBeGreaterThan(0);

      global.fetch = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const pairs2 = await adapter.getPairs();
      expect(pairs2).toEqual(pairs1);
    });
  });

  describe("getFundingRates()", () => {
    it("should_return_funding_rates_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "0",
          data: [{ instId: "BTC-USDT-SWAP", fundingRate: "0.0001", fundingTime: "1718000000000" }],
          msg: "",
        }),
      });

      const rates = await adapter.getFundingRates("BTCUSDT");

      expect(rates.length).toBeGreaterThanOrEqual(1);
      expect(rates[0].exchange).toBe("okx");
      expect(rates[0].fundingRate).toBe(0.0001);
      expect(rates[0].isPositive).toBe(true);
    });

    it("should_return_empty_array_on_no_data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: "0", data: [], msg: "" }),
      });

      const rates = await adapter.getFundingRates("UNKNOWNSYMBOL");
      expect(rates).toEqual([]);
    });
  });

  describe("getOpenInterest()", () => {
    it("should_return_open_interest_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "0",
          data: [{ instId: "BTC-USDT-SWAP", oi: "1000000", oiCcy: "1000000", ts: "1718000000000" }],
          msg: "",
        }),
      });

      const oi = await adapter.getOpenInterest("BTCUSDT");

      expect(oi.length).toBeGreaterThanOrEqual(1);
      expect(oi[0].exchange).toBe("okx");
      expect(oi[0].openInterestUsd).toBe(1000000);
    });
  });

  describe("getLiquidations()", () => {
    it("should_return_empty_array_as_okx_does_not_expose_liquidations_via_public_api", async () => {
      const liq = await adapter.getLiquidations(24);
      expect(liq).toEqual([]);
    });
  });
});
