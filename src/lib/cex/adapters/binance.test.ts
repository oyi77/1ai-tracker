import { describe, it, expect, beforeEach, vi } from "vitest";
import { BinanceAdapter } from "./binance";
import { CexCache } from "../cache";
import { CexRateLimiter } from "../rate-limiter";

describe("BinanceAdapter", () => {
  let adapter: BinanceAdapter;
  let cache: CexCache;
  let rateLimiter: CexRateLimiter;

  beforeEach(() => {
    cache = new CexCache();
    rateLimiter = new CexRateLimiter();
    adapter = new BinanceAdapter(cache, rateLimiter);
  });

  describe("getExchangeStatus", () => {
    it("returns exchange info with correct id", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          timezone: "UTC",
          serverTime: 1700000000000,
          symbols: [{ symbol: "BTCUSDT", status: "TRADING" }],
        }),
      });

      const result = await adapter.getExchangeStatus();
      expect(result.id).toBe("binance");
      expect(result.name).toBe("Binance");
      expect(result.timezone).toBe("UTC");
      expect(result.status).toBe("operational");
      expect(result.lastUpdate).toBeGreaterThan(0);
    });

    it("throws immediately on non-retryable 4xx error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ msg: "Forbidden" }),
      });

      await expect(adapter.getExchangeStatus()).rejects.toThrow(/binance.*API/);
    });


  });

  describe("getPairs", () => {
    it("fetches spot and futures tickers", async () => {
      const mockTicker = {
        symbol: "BTCUSDT",
        priceChange: "100",
        priceChangePercent: "1.5",
        weightedAvgPrice: "50000",
        prevClosePrice: "49000",
        lastPrice: "50000",
        lastQty: "0.1",
        bidPrice: "49990",
        bidQty: "1.0",
        askPrice: "50010",
        askQty: "0.5",
        openPrice: "49250",
        highPrice: "51000",
        lowPrice: "49000",
        volume: "1000",
        quoteAssetVolume: "50000000",
        openTime: 1699900000000,
        closeTime: 1700000000000,
        firstId: 1,
        lastId: 100,
        count: 100,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockTicker],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockTicker],
        });

      const pairs = await adapter.getPairs();
      expect(Array.isArray(pairs)).toBe(true);
      expect(pairs.length).toBeGreaterThanOrEqual(2);

      const spotPair = pairs[0];
      expect(spotPair.exchange).toBe("binance");
      expect(spotPair.symbol).toBe("BTCUSDT");
      expect(spotPair.pairType).toBe("spot");
      expect(spotPair.priceUsd).toBe(50000);

      const futurePair = pairs[1];
      expect(futurePair.pairType).toBe("linear");
    });
  });

  describe("getFundingRates", () => {
    it("returns funding rate for a symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            symbol: "BTCUSDT",
            fundingRate: "0.0001",
            fundingTime: 1700000000000,
          },
        ],
      });

      const rates = await adapter.getFundingRates("BTC");
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBe(1);

      const rate = rates[0];
      expect(rate.exchange).toBe("binance");
      expect(rate.symbol).toBe("BTCUSDT");
      expect(rate.fundingRate).toBe(0.0001);
      expect(rate.fundingTimestamp).toBe(1700000000000);
      expect(rate.isPositive).toBe(true);
    });
  });

  describe("getOpenInterest", () => {
    it("returns open interest for a symbol", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: "BTCUSDT",
          openInterest: "500000000",
          time: 1700000000000,
        }),
      });

      const oi = await adapter.getOpenInterest("BTC");
      expect(Array.isArray(oi)).toBe(true);
      expect(oi.length).toBe(1);

      const entry = oi[0];
      expect(entry.exchange).toBe("binance");
      expect(entry.symbol).toBe("BTCUSDT");
      expect(entry.openInterestUsd).toBe(500000000);
      expect(entry.timestamp).toBe(1700000000000);
    });
  });

  describe("getLiquidations", () => {
    it("returns empty array (no public API)", async () => {
      const liqs = await adapter.getLiquidations(24);
      expect(Array.isArray(liqs)).toBe(true);
      expect(liqs.length).toBe(0);
    });
  });
});
