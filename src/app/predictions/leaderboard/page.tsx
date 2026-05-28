"use client";

import { useState } from "react";
import { TOP_TRADERS } from "@/lib/predictions/mock-data";
import { TraderLeaderboard } from "@/components/predictions/TraderLeaderboard";
import { PageHeader } from "@/components/domain/page-header";
import { Trophy, Users, TrendingUp, DollarSign } from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState("All Time");

  // In a real app, the time filter would filter data. For mock, we use the same set.
  const traders = TOP_TRADERS;

  const totalPnl = traders.reduce((sum, t) => sum + t.lifetimePnl, 0);
  const avgWinRate = traders.reduce((sum, t) => sum + t.winRate, 0) / traders.length;
  const totalPositions = traders.reduce((sum, t) => sum + t.openPositions, 0);

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Trader Leaderboard"
        description="Global PNL-ranked leaderboard of top prediction market traders."
        actions={
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{traders.length} traders tracked</span>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Trophy} label="Top PNL" value={`+${formatUsd(traders[0]?.lifetimePnl ?? 0)}`} accent="cyan" />
        <SummaryCard icon={DollarSign} label="Total PNL" value={formatUsd(totalPnl)} accent="green" />
        <SummaryCard icon={TrendingUp} label="Avg Win Rate" value={`${(avgWinRate * 100).toFixed(1)}%`} accent="yellow" />
        <SummaryCard icon={Users} label="Open Positions" value={totalPositions.toString()} />
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <TraderLeaderboard
          traders={traders}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "cyan" | "green" | "yellow";
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-4 w-4",
            accent === "cyan" && "text-accent-cyan",
            accent === "green" && "text-accent-green",
            accent === "yellow" && "text-warning",
            !accent && "text-text-muted"
          )}
        />
        <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <div className="mt-2 text-xl font-mono font-semibold text-text-primary">{value}</div>
    </div>
  );
}
