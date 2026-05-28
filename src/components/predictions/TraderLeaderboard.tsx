"use client";

import { cn, formatUsd, formatAddress } from "@/lib/utils";
import type { Trader } from "@/lib/predictions/mock-data";

interface TraderLeaderboardProps {
  traders: Trader[];
  timeFilter?: string;
  onTimeFilterChange?: (filter: string) => void;
  className?: string;
}

const ENTITY_COLORS: Record<string, string> = {
  Whale: "#FFB800",
  Bot: "#8B5CF6",
  Fund: "#00D4FF",
  Retail: "#6B7280",
  Insider: "#FF3D6B",
};

export function TraderLeaderboard({ traders, timeFilter, onTimeFilterChange, className }: TraderLeaderboardProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {onTimeFilterChange && (
        <div className="mb-3 flex items-center gap-1">
          {["All Time", "30d", "7d", "24h"].map((f) => (
            <button
              key={f}
              onClick={() => onTimeFilterChange(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                timeFilter === f
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Spotlight #1 */}
      {traders.length > 0 && (
        <div className="mb-4 rounded-lg border border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-cyan/15 text-lg font-bold text-accent-cyan">
                1
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{traders[0].entityName}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      color: ENTITY_COLORS[traders[0].entityType],
                      backgroundColor: `${ENTITY_COLORS[traders[0].entityType]}20`,
                    }}
                  >
                    {traders[0].entityType}
                  </span>
                </div>
                <span className="font-mono text-xs text-text-muted">{traders[0].address}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-accent-green">
                +{formatUsd(traders[0].lifetimePnl)}
              </div>
              <div className="text-xs text-text-muted">
                {traders[0].roi.toFixed(1)}% ROI
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-text-muted">
              <th className="pb-2 text-left pl-2 w-12">#</th>
              <th className="pb-2 text-left">Entity</th>
              <th className="pb-2 text-right">Markets</th>
              <th className="pb-2 text-right">Win Rate</th>
              <th className="pb-2 text-right">PNL</th>
              <th className="pb-2 text-right">ROI</th>
              <th className="pb-2 text-right hidden md:table-cell">Open</th>
              <th className="pb-2 text-right pr-2 hidden lg:table-cell">Last Trade</th>
            </tr>
          </thead>
          <tbody>
            {traders.slice(1).map((trader) => (
              <tr
                key={trader.rank}
                className="border-b border-white/[0.03] transition-colors hover:bg-bg-elevated/30"
              >
                <td className="py-2.5 pl-2 text-sm font-mono text-text-muted">{trader.rank}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS[trader.entityType] }}
                    />
                    <div>
                      <div className="text-sm font-medium text-text-primary">{trader.entityName}</div>
                      <div className="font-mono text-[10px] text-text-muted">{trader.address}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-right text-sm font-mono text-text-primary">{trader.markets}</td>
                <td className="py-2.5 text-right text-sm font-mono text-text-primary">
                  {(trader.winRate * 100).toFixed(0)}%
                </td>
                <td className={cn(
                  "py-2.5 text-right text-sm font-mono font-medium",
                  trader.lifetimePnl >= 0 ? "text-accent-green" : "text-danger"
                )}>
                  {trader.lifetimePnl >= 0 ? "+" : ""}{formatUsd(trader.lifetimePnl)}
                </td>
                <td className={cn(
                  "py-2.5 text-right text-sm font-mono",
                  trader.roi >= 0 ? "text-accent-green" : "text-danger"
                )}>
                  {trader.roi >= 0 ? "+" : ""}{trader.roi.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right text-sm font-mono text-text-primary hidden md:table-cell">
                  {trader.openPositions}
                </td>
                <td className="py-2.5 pr-2 text-right text-xs text-text-muted hidden lg:table-cell">
                  {trader.lastTrade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
