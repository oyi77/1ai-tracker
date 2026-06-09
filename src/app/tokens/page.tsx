"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { TokenTable } from "@/components/tokens/TokenTable";
import { cn, formatUsd } from "@/lib/utils";
import type { TokenData } from "@/lib/mock-data";

interface ApiToken {
  id: string;
  address: string;
  chain: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holderCount: number;
  smartMoneyFlow: number;
}

interface ApiResponse {
  data: ApiToken[];
  meta: { page: number; pageSize: number; total: number; hasMore: boolean };
  error: string | null;
}

function toTokenData(t: ApiToken): TokenData {
  return {
    id: t.id,
    name: t.name,
    symbol: t.symbol,
    price: t.price,
    priceChange24h: 0,
    marketCap: t.marketCap,
    volume24h: t.volume24h,
    smartMoneyFlow: t.smartMoneyFlow,
    walletCount: t.holderCount,
    holderDistribution: { top10: 0, top11to50: 0, top51to100: 0, retail: 0 },
    chain: t.chain,
    trending: false,
    watchlisted: false,
  };
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number; hasMore: boolean } | null>(null);

  const fetchTokens = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tokens?page=${p}&pageSize=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setTokens(json.data.map(toTokenData));
      setMeta(json.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens(page);
  }, [page, fetchTokens]);

  const handleToggleWatchlist = (id: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, watchlisted: !t.watchlisted } : t))
    );
  };

  const trending = tokens.filter((t) => t.trending);
  const topFlow = [...tokens].sort((a, b) => b.smartMoneyFlow - a.smartMoneyFlow).slice(0, 5);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <PageHeader
          title="Token Explorer"
          description="Search and analyze tokens across all chains with smart money insights"
        />

        {/* Trending tokens */}
        {trending.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">Trending</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-white/5 bg-bg-surface p-3 transition-colors hover:border-accent-cyan/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-xs font-bold">
                        {t.symbol.slice(0, 2)}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{t.symbol}</div>
                        <div className="text-xs text-text-muted">{t.name}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        t.priceChange24h >= 0 ? "text-accent-green" : "text-danger"
                      )}
                    >
                      {t.priceChange24h >= 0 ? "+" : ""}
                      {t.priceChange24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-mono text-sm text-text-primary">
                      ${t.price < 1 ? t.price.toPrecision(3) : t.price.toLocaleString()}
                    </span>
                    <span className={cn("font-mono text-xs", t.smartMoneyFlow >= 0 ? "text-accent-green" : "text-danger")}>
                      SM: {t.smartMoneyFlow >= 0 ? "+" : ""}{formatUsd(t.smartMoneyFlow)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Smart Money Flow */}
        {topFlow.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">Top Smart Money Flow (24h)</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {topFlow.map((t) => (
                <div
                  key={t.id}
                  className="flex min-w-[160px] items-center gap-2 rounded-lg border border-white/5 bg-bg-surface px-3 py-2"
                >
                  <span className="text-sm font-medium text-text-primary">{t.symbol}</span>
                  <span className={cn("ml-auto font-mono text-xs", t.smartMoneyFlow >= 0 ? "text-accent-green" : "text-danger")}>
                    {t.smartMoneyFlow >= 0 ? "+" : ""}{formatUsd(t.smartMoneyFlow)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mt-12 flex items-center justify-center">
            <svg className="h-6 w-6 animate-spin text-accent-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="mt-12 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              onClick={() => fetchTokens(page)}
              className="mt-3 rounded-md bg-bg-surface px-4 py-2 text-sm text-text-primary hover:bg-bg-elevated"
            >
              Retry
            </button>
          </div>
        )}

        {/* Full table + pagination */}
        {!loading && !error && (
          <div className="mt-6">
            <TokenTable tokens={tokens} onToggleWatchlist={handleToggleWatchlist} />

            {/* Pagination */}
            {meta && meta.total > meta.pageSize && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {Math.ceil(meta.total / meta.pageSize)} ({meta.total} tokens)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border border-white/10 bg-bg-surface px-3 py-1.5 text-xs text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!meta.hasMore}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-white/10 bg-bg-surface px-3 py-1.5 text-xs text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
