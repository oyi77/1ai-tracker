"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/hooks/use-api";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  DollarSign,
  BarChart3,
  Briefcase,
  Globe,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface MacroIndicator {
  id: string;
  name: string;
  category: string;
  latestValue: number;
  latestDate: string;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: "up" | "down" | "flat";
}

interface MacroData {
  indicators: MacroIndicator[];
  yieldCurve: { spread10Y2Y: number; signal: string };
  summary: {
    gdpGrowth: number;
    inflationRate: number;
    unemploymentRate: number;
    fedRate: number;
  };
}

// ─── Category tabs ────────────────────────────────────────

type Category = "all" | "rates" | "inflation" | "employment" | "growth" | "cross-market";

const TABS: { id: Category; label: string; icon: typeof Activity }[] = [
  { id: "all",          label: "All",          icon: BarChart3 },
  { id: "rates",        label: "Rates",        icon: Activity },
  { id: "inflation",    label: "Inflation",    icon: DollarSign },
  { id: "employment",   label: "Employment",   icon: Briefcase },
  { id: "growth",       label: "Growth",       icon: TrendingUp },
  { id: "cross-market", label: "Cross-Market", icon: Globe },
];

// ─── Helpers ──────────────────────────────────────────────

function formatValue(value: number, unit: string): string {
  if (unit === "Billions") {
    return `$${(value / 1).toFixed(1)}B`;
  }
  if (unit === "$/bbl" || unit === "$/oz") {
    return `$${value.toFixed(2)}`;
  }
  if (unit === "Index") {
    return value.toFixed(2);
  }
  return `${value.toFixed(2)}${unit === "%" ? "%" : ""}`;
}

function YieldCurveBadge({ signal }: { signal: string }) {
  const styles: Record<string, string> = {
    Normal:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Flat:     "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Inverted: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[signal] ?? styles.Flat,
      )}
    >
      {signal}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Summary bar skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-white/5 p-4">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="mt-2 h-6 w-24 rounded bg-white/10" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-white/5 p-4 h-28" />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export default function MacroDashboard() {
  const [category, setCategory] = useState<Category>("all");

  const { data, loading, error, refetch } = useApi<MacroData>(
    `/v1/macro?category=${category}`,
    { refreshInterval: 30 * 60 * 1000 }, // 30 minutes
  );

  if (loading && !data) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load macro economic data
      </div>
    );
  }

  if (!data) return null;

  const { indicators, yieldCurve, summary } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Macro Indicators</h2>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-muted hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="GDP" value={`$${summary.gdpGrowth.toFixed(1)}B`} icon={<BarChart3 className="h-4 w-4" />} />
        <SummaryTile label="CPI" value={summary.inflationRate.toFixed(1)} icon={<DollarSign className="h-4 w-4" />} />
        <SummaryTile label="Unemployment" value={`${summary.unemploymentRate.toFixed(1)}%`} icon={<Briefcase className="h-4 w-4" />} />
        <SummaryTile label="Fed Rate" value={`${summary.fedRate.toFixed(2)}%`} icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Yield curve indicator */}
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">10Y-2Y Spread:</span>
          <span className={cn(
            "font-mono text-sm font-medium",
            yieldCurve.spread10Y2Y < 0 ? "text-red-400" : "text-emerald-400",
          )}>
            {yieldCurve.spread10Y2Y >= 0 ? "+" : ""}{yieldCurve.spread10Y2Y.toFixed(3)}%
          </span>
        </div>
        <YieldCurveBadge signal={yieldCurve.signal} />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/5 bg-white/5 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-text-primary"
                  : "text-text-muted hover:text-text-primary hover:bg-white/5",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Indicator cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {indicators.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </div>

      {indicators.length === 0 && (
        <div className="rounded-lg border border-white/5 bg-white/5 p-8 text-center text-text-muted text-sm">
          No indicators available for this category
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="text-text-muted">{icon}</span>
      </div>
      <span className="mt-2 block text-xl font-semibold font-mono text-text-primary">
        {value}
      </span>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: MacroIndicator }) {
  const isPositiveChange = indicator.changePercent >= 0;
  const TrendIcon =
    indicator.trend === "up" ? TrendingUp
      : indicator.trend === "down" ? TrendingDown
      : Minus;

  return (
    <div className="rounded-lg border border-white/5 bg-bg-surface p-4 transition-colors hover:border-white/10">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-muted truncate">{indicator.name}</p>
          <p className="mt-1 text-2xl font-semibold font-mono text-text-primary">
            {formatValue(indicator.latestValue, indicator.unit)}
          </p>
        </div>
        <TrendIcon
          className={cn(
            "h-5 w-5 shrink-0",
            indicator.trend === "up" ? "text-emerald-400" : indicator.trend === "down" ? "text-red-400" : "text-text-muted",
          )}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            isPositiveChange
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400",
          )}
        >
          {isPositiveChange ? "+" : ""}
          {indicator.changePercent.toFixed(2)}%
        </span>
        <span className="text-xs text-text-muted">
          {new Date(indicator.latestDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
