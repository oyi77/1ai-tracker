"use client";

import { cn, formatUsd, formatNumber } from "@/lib/utils";
import type { Market, MarketCategory } from "@/lib/predictions/mock-data";
import { CATEGORY_COLORS } from "@/lib/predictions/mock-data";
import { TrendingUp, TrendingDown, Users, Clock } from "lucide-react";

interface MarketCardProps {
  market: Market;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

function categoryColor(cat: MarketCategory): string {
  return CATEGORY_COLORS[cat] ?? "#6B7280";
}

export function MarketCard({ market, expanded, onToggle, className }: MarketCardProps) {
  const isResolved = market.status === "Resolved";
  const isUpcoming = market.status === "Upcoming";

  return (
    <div
      className={cn(
        "group cursor-pointer border-b border-white/5 transition-colors hover:bg-bg-elevated/50",
        expanded && "bg-bg-elevated/30",
        className
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Category dot */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor(market.category) }}
        />

        {/* Title + category */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "truncate text-sm font-medium",
              isResolved ? "text-text-muted line-through" : "text-text-primary"
            )}>
              {market.title}
            </span>
            {isUpcoming && (
              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                UPCOMING
              </span>
            )}
            {isResolved && (
              <span className="rounded bg-accent-green/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-green">
                RESOLVED {market.resolvedOutcome}
              </span>
            )}
          </div>
          <span className="text-xs text-text-muted">{market.category}</span>
        </div>

        {/* Volume 24h */}
        <div className="w-24 text-right">
          <div className="text-sm font-mono text-text-primary">{formatUsd(market.volume24h)}</div>
          <div className="text-[10px] text-text-muted">24h vol</div>
        </div>

        {/* Total Volume */}
        <div className="w-24 text-right hidden md:block">
          <div className="text-sm font-mono text-text-primary">{formatUsd(market.totalVolume)}</div>
          <div className="text-[10px] text-text-muted">total</div>
        </div>

        {/* Yes Price */}
        <div className="w-16 text-right">
          <div className="flex items-center justify-end gap-1">
            <TrendingUp className="h-3 w-3 text-accent-green" />
            <span className="text-sm font-mono font-medium text-accent-green">
              {(market.yesPrice * 100).toFixed(0)}&cent;
            </span>
          </div>
        </div>

        {/* No Price */}
        <div className="w-16 text-right">
          <div className="flex items-center justify-end gap-1">
            <TrendingDown className="h-3 w-3 text-danger" />
            <span className="text-sm font-mono font-medium text-danger">
              {(market.noPrice * 100).toFixed(0)}&cent;
            </span>
          </div>
        </div>

        {/* Traders */}
        <div className="w-20 text-right hidden lg:flex items-center justify-end gap-1">
          <Users className="h-3 w-3 text-text-muted" />
          <span className="text-sm font-mono text-text-primary">{formatNumber(market.traders)}</span>
        </div>

        {/* Top Trader */}
        <div className="w-32 text-right hidden xl:block">
          <div className="text-xs font-mono text-accent-cyan truncate">{market.topTrader}</div>
          <div className="text-[10px] text-text-muted truncate">{market.topTraderEntity}</div>
        </div>

        {/* Time */}
        <div className="hidden xl:flex items-center gap-1 text-text-muted">
          <Clock className="h-3 w-3" />
          <span className="text-xs">{market.endDate}</span>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div className="border-t border-white/5 bg-bg-primary/50 px-6 py-4">
          <p className="text-sm text-text-muted mb-3">{market.description}</p>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Volume 24h</span>
              <div className="text-sm font-mono text-text-primary">{formatUsd(market.volume24h)}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Traders</span>
              <div className="text-sm font-mono text-text-primary">{formatNumber(market.traders)}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">End Date</span>
              <div className="text-sm font-mono text-text-primary">{market.endDate}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Status</span>
              <div className="text-sm font-mono text-text-primary">{market.status}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
