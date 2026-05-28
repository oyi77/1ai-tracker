"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { TokenTable } from "@/components/tokens/TokenTable";
import { tokenList } from "@/lib/mock-data";
import { cn, formatUsd } from "@/lib/utils";
import type { TokenData } from "@/lib/mock-data";

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenData[]>(tokenList);

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

        {/* Top Smart Money Flow */}
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

        {/* Full table */}
        <div className="mt-6">
          <TokenTable tokens={tokens} onToggleWatchlist={handleToggleWatchlist} />
        </div>
      </div>
    </div>
  );
}
