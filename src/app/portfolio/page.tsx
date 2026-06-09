"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { cn, formatUsd, formatPercent } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  Star,
  ExternalLink,
} from "lucide-react";

interface WatchlistToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
}

const WATCHLIST_KEY = "tracker-watchlist";

export default function PortfolioPage() {
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [tokens, setTokens] = useState<WatchlistToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load persisted watchlist on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      setWatchlistIds(stored ? JSON.parse(stored) : ["bitcoin", "ethereum", "solana"]);
    } catch {
      setWatchlistIds(["bitcoin", "ethereum", "solana"]);
    }
  }, []);

  const fetchTokens = useCallback(async () => {
    if (watchlistIds.length === 0) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/tokens?ids=${watchlistIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        const items: WatchlistToken[] = (data.tokens ?? data ?? []).map((t: Record<string, unknown>) => ({
          id: t.id ?? t.coin_id ?? "",
          name: t.name ?? "",
          symbol: (t.symbol ?? "").toString().toUpperCase(),
          price: Number(t.price ?? t.price_usd ?? 0),
          change24h: Number(t.change24h ?? t.change_24h ?? t.percent_change_24h ?? 0),
          marketCap: Number(t.marketCap ?? t.market_cap ?? 0),
        }));
        setTokens(items);
      } else {
        // Fallback: try CoinGecko directly
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${watchlistIds.join(",")}&order=market_cap_desc&sparkline=false`
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          setTokens(
            cgData.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: c.name as string,
              symbol: (c.symbol as string).toUpperCase(),
              price: c.current_price as number,
              change24h: c.price_change_percentage_24h as number,
              marketCap: c.market_cap as number,
            }))
          );
        }
      }
    } catch {
      setError("Failed to fetch token data");
    } finally {
      setLoading(false);
    }
  }, [watchlistIds]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const addToken = () => {
    const id = inputValue.trim().toLowerCase();
    if (!id) return;
    if (watchlistIds.includes(id)) {
      setInputValue("");
      return;
    }
    const next = [...watchlistIds, id];
    setWatchlistIds(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    setInputValue("");
  };

  const removeToken = (id: string) => {
    const next = watchlistIds.filter((t) => t !== id);
    setWatchlistIds(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="Track your favorite tokens and monitor performance"
      />

      {/* Add token input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addToken()}
            placeholder="Enter CoinPaprika ID (e.g. bitcoin, ethereum)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-white/20 transition-colors"
          />
        </div>
        <button
          onClick={addToken}
          disabled={!inputValue.trim()}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Watchlist table */}
      <div className="rounded-lg border border-white/5 bg-bg-surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <Star className="h-4 w-4 text-yellow-400" />
          <h2 className="text-sm font-medium text-text-primary">
            Watchlist ({tokens.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-text-muted">
              No tokens in watchlist. Add one above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">24h Change</th>
                  <th className="px-4 py-3 text-right">Market Cap</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tokens.map((token) => (
                  <tr
                    key={token.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-text-primary">
                              {token.name}
                            </span>
                            <a
                              href={`/token/${token.id}`}
                              className="text-text-muted hover:text-text-secondary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <span className="text-xs text-text-muted">{token.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-text-primary">
                        {formatUsd(token.price)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-mono",
                          token.change24h >= 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {formatPercent(token.change24h)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-text-secondary">
                        {token.marketCap > 0 ? formatUsd(token.marketCap) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeToken(token.id)}
                        className="rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
