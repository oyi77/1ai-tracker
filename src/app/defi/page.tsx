"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { ProtocolCard } from "@/components/defi/ProtocolCard";
import { cn, formatUsd } from "@/lib/utils";
import type { DeFiProtocol, DeFiCategory } from "@/lib/mock-data";

const CHAINS = ["Ethereum", "Arbitrum", "Base", "Optimism", "Solana", "Bitcoin"] as const;
const CATEGORIES: DeFiCategory[] = ["Lending", "DEX", "Yield", "Perpetuals", "Bridge", "Liquid Staking"];

interface ApiProtocol {
  id: string;
  name: string;
  chain: string;
  category: string;
  tvl: number;
  tvlChange24h: number;
  volume24h: number;
  uniqueUsers: number;
  smartMoneyInflow: number;
  description?: string;
  riskScore?: number;
  yieldRate?: number;
}

export default function DeFiPage() {
  const [protocols, setProtocols] = useState<DeFiProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/defi?limit=50&sort=tvl", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items: DeFiProtocol[] = (json.data as ApiProtocol[]).map((p) => ({
          id: p.id,
          name: p.name,
          chain: p.chain.charAt(0).toUpperCase() + p.chain.slice(1),
          category: (p.category || "DEX") as DeFiCategory,
          tvl: p.tvl,
          tvlChange24h: p.tvlChange24h,
          volume24h: p.volume24h,
          uniqueUsers: p.uniqueUsers,
          smartMoneyInflow: p.smartMoneyInflow,
          description: p.description ?? "",
          riskScore: p.riskScore ?? 0,
          yieldRate: p.yieldRate,
        }));
        setProtocols(items);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load protocols");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    return protocols.filter((p) => {
      if (chainFilter !== "All" && p.chain !== chainFilter) return false;
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [protocols, chainFilter, categoryFilter, search]);

  const totalTvl = filtered.reduce((sum, p) => sum + p.tvl, 0);
  const totalVolume = filtered.reduce((sum, p) => sum + p.volume24h, 0);
  const totalUsers = filtered.reduce((sum, p) => sum + p.uniqueUsers, 0);
  const totalSmInflow = filtered.reduce((sum, p) => sum + p.smartMoneyInflow, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <PageHeader
          title="DeFi Dashboard"
          description="Protocol analytics with smart money tracking"
        />

        {loading && (
          <div className="mt-12 flex items-center justify-center">
            <div className="text-sm text-text-muted">Loading protocols…</div>
          </div>
        )}

        {error && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="text-sm text-danger">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/10 bg-bg-surface px-4 py-1.5 text-sm text-text-primary hover:border-accent-cyan"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary stats */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Total TVL</span>
                <div className="mt-1 font-mono text-xl font-semibold text-text-primary">{formatUsd(totalTvl)}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">24h Volume</span>
                <div className="mt-1 font-mono text-xl font-semibold text-text-primary">{formatUsd(totalVolume)}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Unique Users</span>
                <div className="mt-1 font-mono text-xl font-semibold text-text-primary">{totalUsers.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">SM Net Inflow</span>
                <div className={cn("mt-1 font-mono text-xl font-semibold", totalSmInflow >= 0 ? "text-accent-green" : "text-danger")}>
                  {totalSmInflow >= 0 ? "+" : ""}{formatUsd(totalSmInflow)}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search protocols..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-cyan"
              />
              <select
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
              >
                <option value="All">All Chains</option>
                {CHAINS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="text-xs text-text-muted">{filtered.length} protocols</span>
            </div>

            {/* Protocol grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProtocolCard key={p.id} protocol={p} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-text-muted">
                  No protocols match your filters.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
