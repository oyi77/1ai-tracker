"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn, formatUsd, formatRelativeTime } from "@/lib/utils";
import type { Trade, TradeDirection, EntityType, MarketCategory } from "@/lib/predictions/mock-data";
import { CATEGORY_COLORS } from "@/lib/predictions/mock-data";

interface TradeFeedProps {
  trades: Trade[];
  autoScroll?: boolean;
  showFilters?: boolean;
  className?: string;
}

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  Whale: "#FFB800",
  Bot: "#8B5CF6",
  Fund: "#00D4FF",
  Retail: "#6B7280",
  Insider: "#FF3D6B",
};

export function TradeFeed({ trades, autoScroll = true, showFilters = false, className }: TradeFeedProps) {
  const [paused, setPaused] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | "All">("All");
  const [entityFilter, setEntityFilter] = useState<EntityType | "All">("All");
  const [minSize, setMinSize] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = trades.filter((t) => {
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (entityFilter !== "All" && t.entityType !== entityFilter) return false;
    if (t.value < minSize) return false;
    return true;
  });

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll || paused || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length, autoScroll, paused]);

  return (
    <div className={cn("flex flex-col", className)}>
      {showFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MarketCategory | "All")}
            className="rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-text-primary"
          >
            <option value="All">All Categories</option>
            {Object.keys(CATEGORY_COLORS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as EntityType | "All")}
            className="rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-text-primary"
          >
            <option value="All">All Entities</option>
            {(["Whale", "Bot", "Fund", "Retail", "Insider"] as EntityType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="number"
            value={minSize || ""}
            onChange={(e) => setMinSize(Number(e.target.value) || 0)}
            placeholder="Min $"
            className="w-24 rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-text-primary placeholder:text-text-muted"
          />
          <span className="text-[10px] text-text-muted">{filtered.length} trades</span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/5 bg-bg-surface px-3 py-2 text-[10px] uppercase tracking-wider text-text-muted">
          <span className="w-16">Time</span>
          <span className="flex-1">Market</span>
          <span className="w-12">Side</span>
          <span className="w-16 text-right">Shares</span>
          <span className="w-14 text-right">Price</span>
          <span className="w-20 text-right">Value</span>
          <span className="w-28 text-right">Entity</span>
        </div>

        {filtered.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}

        {autoScroll && paused && (
          <div className="sticky bottom-0 flex items-center justify-center bg-bg-surface/80 py-1 text-[10px] text-text-muted backdrop-blur-sm">
            Paused (hover away to resume)
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isYes = trade.direction === "YES";
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.03] px-3 py-2 transition-colors hover:bg-bg-elevated/30">
      <span className="w-16 text-[11px] font-mono text-text-muted">
        {formatRelativeTime(trade.timestamp)}
      </span>
      <span className="flex-1 truncate text-xs text-text-primary">{trade.marketTitle}</span>
      <span
        className={cn(
          "w-12 rounded px-1.5 py-0.5 text-center text-[10px] font-bold",
          isYes
            ? "bg-accent-green/15 text-accent-green"
            : "bg-danger/15 text-danger"
        )}
      >
        {trade.direction}
      </span>
      <span className="w-16 text-right text-xs font-mono text-text-primary">
        {trade.shares.toLocaleString()}
      </span>
      <span className="w-14 text-right text-xs font-mono text-text-primary">
        {(trade.price * 100).toFixed(0)}&cent;
      </span>
      <span className="w-20 text-right text-xs font-mono text-text-primary">
        {formatUsd(trade.value)}
      </span>
      <span className="w-28 text-right">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ENTITY_TYPE_COLORS[trade.entityType] }}
          />
          <span className="truncate text-[11px] text-text-muted">{trade.entity}</span>
        </span>
      </span>
    </div>
  );
}
