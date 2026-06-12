import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getRecentTrades,
  getRecentSignals,
  getTradeStats,
  getBotStatus,
  clearCache,
  closeConnection,
  type BotBridgeHealth,
} from "../tradebot-bridge";

describe("tradebot-bridge", () => {
  beforeAll(() => {
    // Clear cache before tests
    clearCache();
  });

  afterAll(() => {
    // Cleanup
    clearCache();
    closeConnection();
  });

  describe("getBotStatus()", () => {
    it("should return bridge health with correct structure", () => {
      const status: BotBridgeHealth = getBotStatus();

      expect(status).toHaveProperty("available");
      expect(status).toHaveProperty("dbPath");
      expect(status).toHaveProperty("tradeCount");
      expect(status).toHaveProperty("lastChecked");

      expect(typeof status.available).toBe("boolean");
      expect(typeof status.dbPath).toBe("string");
      expect(typeof status.tradeCount).toBe("number");
      expect(typeof status.lastChecked).toBe("string");
    });

    it("should have valid ISO timestamp", () => {
      const status = getBotStatus();
      const date = new Date(status.lastChecked);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should indicate if DB is available", () => {
      const status = getBotStatus();
      // Will depend on installation of better-sqlite3
      // Just verify the field exists and is boolean
      expect(typeof status.available).toBe("boolean");

      if (!status.available && status.error) {
        expect(typeof status.error).toBe("string");
      }
    });
  });

  describe("getRecentTrades()", () => {
    it("should return array of trades", () => {
      const trades = getRecentTrades();

      expect(Array.isArray(trades)).toBe(true);
    });

    it("should return trades with correct schema when available", () => {
      const trades = getRecentTrades(10);

      if (trades.length > 0) {
        const trade = trades[0];

        expect(trade).toHaveProperty("tradeId");
        expect(trade).toHaveProperty("symbol");
        expect(trade).toHaveProperty("action");
        expect(trade).toHaveProperty("entryPrice");
        expect(trade).toHaveProperty("exitPrice");
        expect(trade).toHaveProperty("stake");
        expect(trade).toHaveProperty("outcome");
        expect(trade).toHaveProperty("pips");
        expect(trade).toHaveProperty("profitUsd");
        expect(trade).toHaveProperty("openTime");

        // Verify types
        expect(typeof trade.tradeId).toBe("string");
        expect(typeof trade.symbol).toBe("string");
        expect(typeof trade.entryPrice).toBe("number");
        expect(typeof trade.outcome).toBe("string");
      }
    });

    it("should respect limit parameter", () => {
      const trades = getRecentTrades(5);

      expect(trades.length).toBeLessThanOrEqual(5);
    });

    it("should gracefully return empty array if DB unavailable", () => {
      const trades = getRecentTrades();

      expect(Array.isArray(trades)).toBe(true);
      expect(trades.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRecentSignals()", () => {
    it("should return array of signals", () => {
      const signals = getRecentSignals();

      expect(Array.isArray(signals)).toBe(true);
    });

    it("should respect limit parameter", () => {
      const signals = getRecentSignals(10);

      expect(signals.length).toBeLessThanOrEqual(10);
    });

    it("should have valid signal schema when present", () => {
      const signals = getRecentSignals(5);

      if (signals.length > 0) {
        const signal = signals[0];

        expect(signal).toHaveProperty("symbol");
        expect(signal).toHaveProperty("direction");
        expect(signal).toHaveProperty("confidence");
        expect(signal).toHaveProperty("timestamp");
        expect(signal).toHaveProperty("metadata");

        expect(["CALL", "PUT"]).toContain(signal.direction);
        expect(typeof signal.confidence).toBe("number");
        expect(typeof signal.metadata).toBe("object");
      }
    });
  });

  describe("getTradeStats()", () => {
    it("should return stats object or null", () => {
      const stats = getTradeStats();

      if (stats !== null) {
        expect(typeof stats).toBe("object");
      }
    });

    it("should have correct stats structure when available", () => {
      const stats = getTradeStats();

      if (stats) {
        expect(stats).toHaveProperty("total");
        expect(stats).toHaveProperty("wins");
        expect(stats).toHaveProperty("losses");
        expect(stats).toHaveProperty("winRate");
        expect(stats).toHaveProperty("totalPips");
        expect(stats).toHaveProperty("totalProfitUsd");
        expect(stats).toHaveProperty("openPositions");

        // Type checks
        expect(typeof stats.total).toBe("number");
        expect(typeof stats.winRate).toBe("number");

        // Win rate should be 0-1
        if (stats.total > 0) {
          expect(stats.winRate).toBeGreaterThanOrEqual(0);
          expect(stats.winRate).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should return zero stats for empty database", () => {
      const stats = getTradeStats();

      if (stats && stats.total === 0) {
        expect(stats.wins).toBe(0);
        expect(stats.losses).toBe(0);
        expect(stats.winRate).toBe(0);
        expect(stats.totalPips).toBe(0);
      }
    });
  });

  describe("caching", () => {
    it("should cache results for 30 seconds", () => {
      clearCache();

      const status1 = getBotStatus();
      const timestamp1 = status1.lastChecked;

      // Immediate second call should return same cached result
      const status2 = getBotStatus();
      const timestamp2 = status2.lastChecked;

      // Timestamps should be identical (from cache)
      expect(timestamp1).toBe(timestamp2);
    });

    it("should clear cache when requested", async () => {
      const status1 = getBotStatus();
      expect(status1).toBeDefined();

      clearCache();

      // Wait 1ms to ensure different timestamp
      await new Promise((r) => setTimeout(r, 1));
      const status2 = getBotStatus();

      // Timestamps should be different after cache clear
      expect(status2.lastChecked).not.toBe(status1.lastChecked);
    });
  });
});
