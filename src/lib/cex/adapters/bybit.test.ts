/**
 * Bybit Adapter Tests
 *
 * Unit tests for BybitAdapter
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BybitAdapter } from "./bybit";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

describe("BybitAdapter", () => {
  let adapter: BybitAdapter;
  let cache: CexCache;
  let rateLimiter: CexRateLimiter;

  beforeEach(() => {
    cache = new CexCache();
    rateLimiter = new CexRateLimiter();
    adapter = new BybitAdapter(cache, rateLimiter);
  });

  describe("getExchangeStatus()", () => {
    it("should_return_exchange_status_with_operational_state", async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: { list: [{ symbol: "BTCUSDT" }] },
          retMsg: "OK",
        }),
      });

      const status = await adapter.getExchangeStatus();

      expect(status.id).toBe("bybit");
      expect(status.name).toBe("Bybit");
      expect(status.status).toBe("operational");
      expect(status.makerFee).toBe(0.0001);
      expect(status.takerFee).toBe(0.0002);
    });

    it("should_throw_on_api_error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          retCode: -1,
          result: null,
          retMsg: "Invalid request",
        }),
      });

      await expect(adapter.getExchangeStatus()).rejects.toThrow();
    });
  });

  describe("getPairs()", () => {
    it("should_return_empty_array_on_error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const pairs = await adapter.getPairs();

      expect(pairs).toEqual([]);
    });

    it("should_cache_pairs_for_60_seconds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                lastPrice: "42000",
                price24hPcnt: "0.05",
                highPrice24h: "42500",
                lowPrice24h: "41500",
                volume24h: "1000",
                turnover24h: "42000000",
                bid1Price: "41999",
                ask1Price: "42001",
                bid1Size: "1",
                ask1Size: "1",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const pairs1 = await adapter.getPairs();
      expect(pairs1.length).toBeGreaterThan(0);

      // Second call should be cached
      global.fetch = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const pairs2 = await adapter.getPairs();

      expect(pairs2).toEqual(pairs1);
    });

    it("should_normalize_ticker_data_correctly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                lastPrice: "42000",
                price24hPcnt: "0.05", // 5% in Bybit
                highPrice24h: "42500",
                lowPrice24h: "41500",
                volume24h: "1000",
                turnover24h: "42000000",
                bid1Price: "41999",
                ask1Price: "42001",
                bid1Size: "1",
                ask1Size: "1",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const pairs = await adapter.getPairs();
      const btcPair = pairs.find((p) => p.symbol === "BTCUSDT");

      expect(btcPair).toBeDefined();
      expect(btcPair!.exchange).toBe("bybit");
      expect(btcPair!.baseSymbol).toBe("BTC");
      expect(btcPair!.quoteSymbol).toBe("USDT");
      expect(btcPair!.priceUsd).toBe(42000);
      expect(btcPair!.priceChange24hPercent).toBe(5); // Percent, not decimal
      expect(btcPair!.volumeUsd24h).toBe(42000000);
      expect(btcPair!.midPrice).toBeCloseTo(42000, 1);
    });
  });

  describe("getFundingRates()", () => {
    it("should_return_funding_rate_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                fundingRate: "0.0001",
                fundingRateTimestamp: "1234567890000",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const rates = await adapter.getFundingRates("BTCUSDT");

      expect(rates.length).toBe(1);
      expect(rates[0].exchange).toBe("bybit");
      expect(rates[0].fundingRate).toBe(0.0001);
      expect(rates[0].isPositive).toBe(true);
    });

    it("should_return_empty_array_on_no_data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: { list: [] },
          retMsg: "OK",
        }),
      });

      const rates = await adapter.getFundingRates("UNKNOWNSYMBOL");

      expect(rates).toEqual([]);
    });

    it("should_cache_funding_rates_for_30_seconds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                fundingRate: "0.0001",
                fundingRateTimestamp: "1234567890000",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const rates1 = await adapter.getFundingRates("BTCUSDT");
      expect(rates1.length).toBe(1);

      // Second call should be cached
      global.fetch = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const rates2 = await adapter.getFundingRates("BTCUSDT");

      expect(rates2).toEqual(rates1);
    });
  });

  describe("getOpenInterest()", () => {
    it("should_return_open_interest_for_symbol", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                openInterest: "1000000",
                timestamp: "1234567890000",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const oi = await adapter.getOpenInterest("BTCUSDT");

      expect(oi.length).toBe(1);
      expect(oi[0].exchange).toBe("bybit");
      expect(oi[0].openInterestUsd).toBe(1000000);
      expect(oi[0].openInterestAmount).toBe(1000000);
    });

    it("should_cache_open_interest_for_120_seconds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          retCode: 0,
          result: {
            list: [
              {
                symbol: "BTCUSDT",
                openInterest: "1000000",
                timestamp: "1234567890000",
              },
            ],
          },
          retMsg: "OK",
        }),
      });

      const oi1 = await adapter.getOpenInterest("BTCUSDT");
      expect(oi1.length).toBe(1);

      // Second call should be cached
      global.fetch = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const oi2 = await adapter.getOpenInterest("BTCUSDT");

      expect(oi2).toEqual(oi1);
    });
  });

  describe("getLiquidations()", () => {
    it("should_return_empty_array_as_bybit_does_not_expose_liquidations", async () => {
      const liquidations = await adapter.getLiquidations(24);

      expect(liquidations).toEqual([]);
    });
  });
});
