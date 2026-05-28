"use client";

import { useState, useMemo } from "react";
import { cn, formatUsd } from "@/lib/utils";
import { MARKETS, CATEGORY_COLORS, type MarketCategory, type MarketStatus } from "@/lib/predictions/mock-data";
import { MarketCard } from "@/components/predictions/MarketCard";
import { PageHeader } from "@/components/domain/page-header";
import { Search, TrendingUp, Clock, Star, BarChart3 } from "lucide-react";

type SortMode = "volume" | "recency" | "trending";

const ALL_CATEGORIES: MarketCategory[] = ["Politics", "Crypto", "Sports", "Science", "Finance"];
const ALL_STATUSES: MarketStatus[] = ["Open", "Resolved", "Upcoming"];

export default function PredictionsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<MarketCategory>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<MarketStatus>>(new Set(["Open"]));
  const [sortMode, setSortMode] = useState<SortMode>("volume");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [minVolume, setMinVolume] = useState(0);

  const toggleCategory = (cat: MarketCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleStatus = (status: MarketStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = MARKETS.filter((m) => {
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(m.category)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(m.status)) return false;
      if (m.totalVolume < minVolume) return false;
      return true;
    });

    switch (sortMode) {
      case "volume":
        result.sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "recency":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "trending":
        result.sort((a, b) => b.traders - a.traders);
        break;
    }
    return result;
  }, [search, selectedCategories, selectedStatuses, sortMode, minVolume]);

  const totalVolume = filtered.reduce((sum, m) => sum + m.volume24h, 0);

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Predictions Explorer"
        description="Browse active prediction markets across politics, crypto, sports, science, and finance."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-bg-surface px-3 py-1.5">
              <BarChart3 className="h-4 w-4 text-accent-cyan" />
              <span className="text-sm font-mono text-text-primary">{formatUsd(totalVolume)}</span>
              <span className="text-[10px] text-text-muted">24h vol</span>
            </div>
            <span className="text-sm text-text-muted">{filtered.length} markets</span>
          </div>
        }
      />

      <div className="flex gap-4">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-4 lg:flex">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="w-full rounded-lg border border-white/10 bg-bg-surface py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/50 focus:outline-none"
            />
          </div>

          {/* Categories */}
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <h3 className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Category</h3>
            <div className="flex flex-col gap-1">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                    selectedCategories.has(cat)
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <h3 className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Status</h3>
            <div className="flex flex-col gap-1">
              {ALL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                    selectedStatuses.has(status)
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Range */}
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <h3 className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Min Volume</h3>
            <input
              type="range"
              min={0}
              max={100_000_000}
              step={1_000_000}
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="w-full accent-accent-cyan"
            />
            <div className="mt-1 text-xs font-mono text-text-muted">{formatUsd(minVolume)}+</div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Sort bar */}
          <div className="flex items-center gap-2">
            {[
              { key: "volume" as SortMode, label: "Volume", icon: BarChart3 },
              { key: "trending" as SortMode, label: "Trending", icon: TrendingUp },
              { key: "recency" as SortMode, label: "Recency", icon: Clock },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSortMode(s.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  sortMode === s.key
                    ? "bg-accent-cyan/15 text-accent-cyan"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}

            <div className="flex-1" />

            {/* Mobile search */}
            <div className="relative lg:hidden">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-48 rounded-lg border border-white/10 bg-bg-surface py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Table header */}
          <div className="flex items-center gap-4 rounded-t-lg border border-white/5 bg-bg-surface px-4 py-2 text-[10px] uppercase tracking-wider text-text-muted">
            <span className="w-2" />
            <span className="min-w-0 flex-1">Market</span>
            <span className="w-24 text-right">Vol 24h</span>
            <span className="w-24 text-right hidden md:block">Total</span>
            <span className="w-16 text-right">Yes</span>
            <span className="w-16 text-right">No</span>
            <span className="w-20 text-right hidden lg:flex justify-end">Traders</span>
            <span className="w-32 text-right hidden xl:block">Top Trader</span>
            <span className="hidden xl:block">End</span>
          </div>

          {/* Market rows */}
          <div className="rounded-b-lg border border-t-0 border-white/5 bg-bg-surface">
            {filtered.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                expanded={expandedId === market.id}
                onToggle={() => setExpandedId(expandedId === market.id ? null : market.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-text-muted">
                No markets match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
