"use client";

import { useState, useMemo } from "react";
import { cn, formatUsd, formatNumber, formatPercent, getChainColor } from "@/lib/utils";
import type { TokenData } from "@/lib/mock-data";
import { Star } from "lucide-react";

type SortKey = "smartMoneyFlow" | "priceChange24h" | "marketCap" | "volume24h" | "walletCount" | "price";

interface TokenTableProps {
  tokens: TokenData[];
  onToggleWatchlist?: (id: string) => void;
}

export function TokenTable({ tokens, onToggleWatchlist }: TokenTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("smartMoneyFlow");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("All");
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const chains = useMemo(() => {
    const set = new Set(tokens.map((t) => t.chain));
    return Array.from(set).sort();
  }, [tokens]);

  const sorted = useMemo(() => {
    let result = [...tokens];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
      );
    }
    if (chainFilter !== "All") {
      result = result.filter((t) => t.chain === chainFilter);
    }
    if (watchlistOnly) {
      result = result.filter((t) => t.watchlisted);
    }
    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return result;
  }, [tokens, search, chainFilter, watchlistOnly, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th
      className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-primary"
      onClick={() => handleSort(keyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === keyName && (
          <span className="text-accent-cyan">{sortDir === "desc" ? "\u2193" : "\u2191"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60 rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-cyan"
        />
        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
        >
          <option value="All">All Chains</option>
          {chains.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setWatchlistOnly(!watchlistOnly)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            watchlistOnly
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-white/10 bg-bg-surface text-text-muted hover:text-text-primary"
          )}
        >
          <Star className="h-3.5 w-3.5" />
          Watchlist
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-bg-elevated/50">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
              <SortHeader label="Price" keyName="price" />
              <SortHeader label="Market Cap" keyName="marketCap" />
              <SortHeader label="24h Vol" keyName="volume24h" />
              <SortHeader label="SM Flow" keyName="smartMoneyFlow" />
              <SortHeader label="# Wallets" keyName="walletCount" />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Holders</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Chain</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((token) => (
              <tr
                key={token.id}
                className="border-b border-white/[0.03] transition-colors hover:bg-bg-elevated/30"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleWatchlist?.(token.id)}
                    className={cn(
                      "transition-colors",
                      token.watchlisted ? "text-warning" : "text-text-muted hover:text-warning"
                    )}
                  >
                    <Star className="h-4 w-4" fill={token.watchlisted ? "currentColor" : "none"} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-xs font-bold text-text-primary">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{token.name}</div>
                      <div className="text-xs text-text-muted">{token.symbol}</div>
                    </div>
                    {token.trending && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        Trending
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono text-text-primary">${token.price < 1 ? token.price.toPrecision(4) : token.price.toLocaleString()}</div>
                  <div className={cn("text-xs font-mono", token.priceChange24h >= 0 ? "text-accent-green" : "text-danger")}>
                    {formatPercent(token.priceChange24h)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">{formatUsd(token.marketCap)}</td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">{formatUsd(token.volume24h)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={cn("font-mono font-medium", token.smartMoneyFlow >= 0 ? "text-accent-green" : "text-danger")}>
                    {token.smartMoneyFlow >= 0 ? "+" : ""}{formatUsd(token.smartMoneyFlow)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">{token.walletCount}</td>
                <td className="px-4 py-3">
                  <div className="flex h-2 w-20 overflow-hidden rounded-full bg-bg-elevated">
                    <div className="bg-accent-cyan" style={{ width: `${token.holderDistribution.top10}%` }} title={`Top 10: ${token.holderDistribution.top10}%`} />
                    <div className="bg-[#8B5CF6]" style={{ width: `${token.holderDistribution.top11to50}%` }} title={`11-50: ${token.holderDistribution.top11to50}%`} />
                    <div className="bg-warning" style={{ width: `${token.holderDistribution.top51to100}%` }} title={`51-100: ${token.holderDistribution.top51to100}%`} />
                    <div className="bg-text-muted" style={{ width: `${token.holderDistribution.retail}%` }} title={`Retail: ${token.holderDistribution.retail}%`} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: getChainColor(token.chain) }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: getChainColor(token.chain) }}
                    />
                    {token.chain}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                  No tokens found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
