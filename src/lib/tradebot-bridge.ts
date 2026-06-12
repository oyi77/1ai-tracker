// ─────────────────────────────────────────────────────────────
// Trade-Bot SQLite Ingestion Bridge
// Reads trade, signal, and portfolio data from 1ai-trade-bot SQLite database
// Normalizes and exposes via TypeScript interfaces for tracker integration
// ─────────────────────────────────────────────────────────────

import { existsSync } from "fs";

// ─── Types: Normalized from trade-bot Python models ──────────────────────────

export interface BotTradeRecord {
  tradeId: string;
  symbol: string;
  action: string; // BUY, SELL, CALL, PUT
  entryPrice: number;
  exitPrice: number;
  sl: number;
  tp: number;
  stake: number;
  outcome: string; // OPEN, TP_HIT, SL_HIT, MANUAL, BREAKEVEN
  pips: number;
  profitUsd: number;
  profitIdr: number;
  openTime: string;
  closeTime: string | null;
  source: string;
  confidence: number;
  grade: string;
  strategy: string;
}

export interface BotSignalRecord {
  symbol: string;
  direction: "CALL" | "PUT";
  predictedDigit: number;
  confidence: number;
  source: string;
  grade: string;
  entryPrice: number | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface BotStats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPips: number;
  totalProfitUsd: number;
  totalProfitIdr: number;
  bestWinPips: number;
  worstLossPips: number;
  avgWinPips: number;
  avgLossPips: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  openPositions: number;
  currentStreak: string;
  currentStreakCount: number;
}

export interface BotBridgeHealth {
  available: boolean;
  dbPath: string;
  lastTrade?: string;
  tradeCount: number;
  lastChecked: string;
  error?: string;
}

// ─── SQLite Connection Singleton ────────────────────────────────────────────

const TRADE_BOT_DB_PATH = "/home/openclaw/projects/1ai-trade-bot/data/tradebot.db";
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface DatabaseConnection {
  prepare(sql: string): {
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  };
  close(): void;
  readonly memory: boolean;
  readonly readonly: boolean;
  readonly name: string;
  readonly open: boolean;
  readonly inTransaction: boolean;
}

let dbInstance: DatabaseConnection | null = null;
let dbError: Error | null = null;
const cache: Map<string, CacheEntry<unknown>> = new Map();

/**
 * Initialize SQLite connection.
 * Uses better-sqlite3 if available, otherwise returns null for graceful degradation.
 */
function getDbConnection(): DatabaseConnection | null {
  if (dbInstance !== null) return dbInstance;
  if (dbError !== null) return null;

  try {
    if (!existsSync(TRADE_BOT_DB_PATH)) {
      dbError = new Error(`Trade-bot DB not found at ${TRADE_BOT_DB_PATH}`);
      console.warn(`[TradeBotBridge] ${dbError.message} — cross-market correlation disabled`);
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require("better-sqlite3");
      dbInstance = new Database(TRADE_BOT_DB_PATH, { readonly: true });
      return dbInstance;
    } catch {
      dbError = new Error("better-sqlite3 not installed - install with: npm install better-sqlite3");
      console.warn(`[TradeBotBridge] ${dbError.message} — cross-market correlation disabled`);
      return null;
    }
  } catch (error) {
    dbError = error instanceof Error ? error : new Error(String(error));
    console.warn(`[TradeBotBridge] ${dbError.message}`);
    return null;
  }
}

/**
 * Execute cached query, reusing result for TTL duration.
 */
function queryWithCache<T>(cacheKey: string, fn: () => T | null): T | null {
  try {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }

    const result = fn();
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[tradebot-bridge] Query error (${cacheKey}):`, error);
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Get recent trades from trade-bot database.
 * @param limit Number of trades to fetch (default: 50)
 * @returns Array of normalized trade records, empty if unavailable
 */
export function getRecentTrades(limit = 50): BotTradeRecord[] {
  return (
    queryWithCache<BotTradeRecord[]>(`recent_trades_${limit}`, () => {
      const db = getDbConnection();
      if (!db) return [];

      try {
        const stmt = db.prepare(`
          SELECT
            trade_id as trade_id,
            symbol,
            action,
            entry_price,
            exit_price,
            sl,
            tp,
            stake,
            outcome,
            pips,
            profit_usd,
            profit_idr,
            open_time,
            close_time,
            source,
            confidence,
            grade,
            strategy
          FROM trades
          WHERE 1=1
          ORDER BY open_time DESC
          LIMIT ?
        `);

        const rows = stmt.all(limit) as Array<{
          trade_id: string;
          symbol: string;
          action: string;
          entry_price: number;
          exit_price: number;
          sl: number;
          tp: number;
          stake: number;
          outcome: string;
          pips: number;
          profit_usd: number;
          profit_idr: number;
          open_time: string;
          close_time: string | null;
          source: string;
          confidence: number;
          grade: string;
          strategy: string;
        }>;

        return rows.map((row) => ({
          tradeId: row.trade_id,
          symbol: row.symbol,
          action: row.action,
          entryPrice: row.entry_price,
          exitPrice: row.exit_price,
          sl: row.sl,
          tp: row.tp,
          stake: row.stake,
          outcome: row.outcome,
          pips: row.pips,
          profitUsd: row.profit_usd,
          profitIdr: row.profit_idr,
          openTime: row.open_time,
          closeTime: row.close_time,
          source: row.source,
          confidence: row.confidence,
          grade: row.grade,
          strategy: row.strategy,
        }));
      } catch (error) {
        console.error("[tradebot-bridge] Error querying trades:", error);
        return [];
      }
    }) || []
  );
}

/**
 * Get trade statistics (win rate, P&L, streaks).
 * @returns Aggregated trade stats, null if unavailable
 */
export function getTradeStats(): BotStats | null {
  return queryWithCache<BotStats>("trade_stats", () => {
    const db = getDbConnection();
    if (!db) return null;

    try {
      // Get aggregated stats
      const statsStmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN outcome IN ('TP_HIT', 'BREAKEVEN') THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'SL_HIT' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN outcome = 'BREAKEVEN' THEN 1 ELSE 0 END) as breakeven,
          SUM(pips) as total_pips,
          SUM(profit_usd) as total_profit_usd,
          SUM(profit_idr) as total_profit_idr,
          MAX(CASE WHEN outcome = 'TP_HIT' THEN pips END) as best_win_pips,
          MIN(CASE WHEN outcome = 'SL_HIT' THEN pips END) as worst_loss_pips,
          COUNT(CASE WHEN outcome = 'OPEN' THEN 1 END) as open_positions
        FROM trades
        WHERE 1=1
      `);

      const stats = statsStmt.get() as {
        total: number;
        wins: number;
        losses: number;
        breakeven: number;
        total_pips: number;
        total_profit_usd: number;
        total_profit_idr: number;
        best_win_pips: number | null;
        worst_loss_pips: number | null;
        open_positions: number;
      };

      if (!stats || stats.total === 0) {
        return {
          total: 0,
          wins: 0,
          losses: 0,
          breakeven: 0,
          winRate: 0,
          totalPips: 0,
          totalProfitUsd: 0,
          totalProfitIdr: 0,
          bestWinPips: 0,
          worstLossPips: 0,
          avgWinPips: 0,
          avgLossPips: 0,
          maxConsecutiveWins: 0,
          maxConsecutiveLosses: 0,
          openPositions: 0,
          currentStreak: "none",
          currentStreakCount: 0,
        };
      }

      // Calculate averages
      const avgWinsStmt = db.prepare(`
        SELECT AVG(pips) as avg_win FROM trades
        WHERE outcome = 'TP_HIT'
      `);
      const avgWins = (avgWinsStmt.get() as { avg_win: number | null }).avg_win || 0;

      const avgLossesStmt = db.prepare(`
        SELECT AVG(pips) as avg_loss FROM trades
        WHERE outcome = 'SL_HIT'
      `);
      const avgLosses = (avgLossesStmt.get() as { avg_loss: number | null }).avg_loss || 0;

      // Get consecutive streaks (simplified: last 10 trades)
      const streakStmt = db.prepare(`
        SELECT outcome FROM trades
        ORDER BY open_time DESC
        LIMIT 10
      `);
      const recentTrades = streakStmt.all() as Array<{ outcome: string }>;
      let currentStreak = "none";
      let currentStreakCount = 0;

      if (recentTrades.length > 0) {
        const firstOutcome = recentTrades[0].outcome;
        if (firstOutcome === "TP_HIT") {
          currentStreak = "win";
          currentStreakCount = recentTrades.filter((t) => t.outcome === "TP_HIT").length;
        } else if (firstOutcome === "SL_HIT") {
          currentStreak = "loss";
          currentStreakCount = recentTrades.filter((t) => t.outcome === "SL_HIT").length;
        }
      }

      return {
        total: stats.total,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        breakeven: stats.breakeven || 0,
        winRate: stats.total > 0 ? (stats.wins || 0) / stats.total : 0,
        totalPips: stats.total_pips || 0,
        totalProfitUsd: stats.total_profit_usd || 0,
        totalProfitIdr: stats.total_profit_idr || 0,
        bestWinPips: stats.best_win_pips || 0,
        worstLossPips: stats.worst_loss_pips || 0,
        avgWinPips: avgWins,
        avgLossPips: Math.abs(avgLosses),
        maxConsecutiveWins: 0, // Would need full analysis, simplified here
        maxConsecutiveLosses: 0,
        openPositions: stats.open_positions,
        currentStreak,
        currentStreakCount,
      };
    } catch (error) {
      console.error("[tradebot-bridge] Error computing stats:", error);
      return null;
    }
  });
}

/**
 * Get recent signals (if available in database).
 * Note: Signal storage varies; this attempts to read from signals table if it exists.
 * @param limit Number of signals to fetch (default: 50)
 * @returns Array of signal records, empty if unavailable
 */
export function getRecentSignals(limit = 50): BotSignalRecord[] {
  return (
    queryWithCache<BotSignalRecord[]>(`recent_signals_${limit}`, () => {
      const db = getDbConnection();
      if (!db) return [];

      try {
        // Check if signals table exists
        const tableExistsStmt = db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='signals'
        `);
        const tableExists = tableExistsStmt.get();

        if (!tableExists) {
          // No signals table; return empty
          return [];
        }

        const stmt = db.prepare(`
          SELECT
            symbol,
            direction,
            predicted_digit,
            confidence,
            source,
            grade,
            entry_price,
            timestamp,
            metadata
          FROM signals
          ORDER BY timestamp DESC
          LIMIT ?
        `);

        const rows = stmt.all(limit) as Array<{
          symbol: string;
          direction: string;
          predicted_digit: number;
          confidence: number;
          source: string;
          grade: string;
          entry_price: number | null;
          timestamp: string;
          metadata: string;
        }>;

        return rows.map((row) => ({
          symbol: row.symbol,
          direction: row.direction as "CALL" | "PUT",
          predictedDigit: row.predicted_digit,
          confidence: row.confidence,
          source: row.source,
          grade: row.grade,
          entryPrice: row.entry_price,
          timestamp: row.timestamp,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        }));
      } catch (error) {
        console.error("[tradebot-bridge] Error querying signals:", error);
        return [];
      }
    }) || []
  );
}

/**
 * Get bridge health status and connection info.
 * @returns Health check result with DB availability and metadata
 */
export function getBotStatus(): BotBridgeHealth {
  const result = queryWithCache<BotBridgeHealth>("bot_status", () => {
    const db = getDbConnection();

    if (!db) {
      return {
        available: false,
        dbPath: TRADE_BOT_DB_PATH,
        tradeCount: 0,
        lastChecked: new Date().toISOString(),
        error: dbError?.message || "Unknown error",
      };
    }

    try {
      // Get basic metadata
      const countStmt = db.prepare("SELECT COUNT(*) as cnt FROM trades");
      const countResult = countStmt.get() as { cnt: number };

      const lastTradeStmt = db.prepare(
        "SELECT open_time FROM trades ORDER BY open_time DESC LIMIT 1"
      );
      const lastTradeResult = lastTradeStmt.get() as { open_time: string } | undefined;

      return {
        available: true,
        dbPath: TRADE_BOT_DB_PATH,
        tradeCount: countResult.cnt,
        lastTrade: lastTradeResult?.open_time,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        available: false,
        dbPath: TRADE_BOT_DB_PATH,
        tradeCount: 0,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  return result ?? {
    available: false,
    dbPath: TRADE_BOT_DB_PATH,
    tradeCount: 0,
    lastChecked: new Date().toISOString(),
    error: "Failed to retrieve bot status",
  };
}

/**
 * Clear cache (useful for testing or forcing refresh).
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Close database connection (cleanup).
 */
export function closeConnection(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      dbInstance = null;
    } catch (error) {
      console.error("[tradebot-bridge] Error closing connection:", error);
    }
  }
}
