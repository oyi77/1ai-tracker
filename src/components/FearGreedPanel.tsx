"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/hooks/use-api";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────

interface CategoryScore {
  score: number;
  weight: number;
  source: string;
}

interface FearGreedData {
  composite: { score: number; label: string; previousScore: number; change: number };
  categories: {
    sentiment: CategoryScore;
    volatility: CategoryScore;
    momentum: CategoryScore;
    dominance: CategoryScore;
    volume: CategoryScore;
    social: CategoryScore;
  };
  regime: { state: string; stance: string };
  headerMetrics: { btcDom: number; totalMcap: number; mcapChange24h: number };
  history: Array<{ date: string; score: number }>;
}

// ─── Constants ─────────────────────────────────────────────

const GAUGE_ZONES = [
  { start: 0, end: 20, color: "#FF3D6B" },   // extreme fear
  { start: 20, end: 35, color: "#FF6B3D" },   // fear
  { start: 35, end: 50, color: "#FFB800" },   // neutral
  { start: 50, end: 65, color: "#A0E530" },   // greed
  { start: 65, end: 100, color: "#00FF88" },  // extreme greed
];

const REGIME_COLORS: Record<string, string> = {
  Crisis: "bg-danger text-white",
  Stressed: "bg-orange-500 text-white",
  Fragile: "bg-warning text-black",
  Stable: "bg-accent-green/20 text-accent-green",
  Strong: "bg-accent-green text-black",
};

const CATEGORY_LABELS: Record<string, string> = {
  sentiment: "Sentiment",
  volatility: "Volatility",
  momentum: "Momentum",
  dominance: "Dominance",
  volume: "Volume",
  social: "Social",
};

// ─── Gauge ─────────────────────────────────────────────────

function GaugeSVG({ score }: { score: number }) {
  // Half-circle gauge from 180° (left) to 0° (right)
  const cx = 150;
  const cy = 140;
  const r = 110;
  const strokeW = 18;

  // Score 0-100 maps to angle 180°-0°
  const angle = 180 - (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = cx + (r - 10) * Math.cos(rad);
  const needleY = cy - (r - 10) * Math.sin(rad);

  // Arc path for each zone
  function arcPath(startDeg: number, endDeg: number): string {
    const startRad = ((180 - startDeg) * Math.PI) / 180;
    const endRad = ((180 - endDeg) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy - r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy - r * Math.sin(endRad);
    const largeArc = startDeg - endDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <svg viewBox="0 0 300 170" className="w-full max-w-xs">
      {/* Colored zone arcs */}
      {GAUGE_ZONES.map((zone) => (
        <path
          key={zone.start}
          d={arcPath(zone.end, zone.start)}
          fill="none"
          stroke={zone.color}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          opacity={0.35}
        />
      ))}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="#E8EAED"
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#E8EAED" />

      {/* Tick labels */}
      <text x={cx - r - 4} y={cy + 16} fill="#6B7280" fontSize={10} textAnchor="middle">
        0
      </text>
      <text x={cx} y={cy - r - 6} fill="#6B7280" fontSize={10} textAnchor="middle">
        50
      </text>
      <text x={cx + r + 4} y={cy + 16} fill="#6B7280" fontSize={10} textAnchor="middle">
        100
      </text>
    </svg>
  );
}

// ─── Sparkline ─────────────────────────────────────────────

function Sparkline({ points }: { points: Array<{ date: string; score: number }> }) {
  if (points.length < 2) return null;

  const w = 200;
  const h = 40;
  const pad = 4;
  const maxScore = 100;

  const pathData = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
      const y = h - pad - (p.score / maxScore) * (h - 2 * pad);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPoint = points[points.length - 1];
  const lastX = w - pad;
  const lastY = h - pad - (lastPoint.score / maxScore) * (h - 2 * pad);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
      <path d={pathData} fill="none" stroke="#00D4FF" strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={2.5} fill="#00D4FF" />
    </svg>
  );
}

// ─── Category Bar ──────────────────────────────────────────

function CategoryBar({
  name,
  score,
  weight,
}: {
  name: string;
  score: number;
  weight: number;
}) {
  const barColor =
    score <= 20
      ? "bg-danger"
      : score <= 35
        ? "bg-orange-500"
        : score <= 50
          ? "bg-warning"
          : score <= 65
            ? "bg-lime-400"
            : "bg-accent-green";

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-medium text-text-muted">
        {CATEGORY_LABELS[name] ?? name}
      </span>
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <span className="w-8 text-right text-xs font-mono text-text-primary">{score}</span>
      <span className="w-12 text-right text-[10px] font-mono text-text-muted">
        {(weight * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Score color helpers ───────────────────────────────────

function scoreColor(score: number): string {
  if (score <= 20) return "text-danger";
  if (score <= 35) return "text-orange-400";
  if (score <= 50) return "text-warning";
  if (score <= 65) return "text-lime-400";
  return "text-accent-green";
}

function scoreGlowColor(score: number): string {
  if (score <= 20) return "#FF3D6B";
  if (score <= 35) return "#FF6B3D";
  if (score <= 50) return "#FFB800";
  if (score <= 65) return "#A0E530";
  return "#00FF88";
}

// ─── Panel ─────────────────────────────────────────────────

export default function FearGreedPanel() {
  const { data, loading, error } = useApi<FearGreedData>("/v1/fear-greed", {
    refreshInterval: 5 * 60 * 1000,
  });

  const categoryEntries: Array<[string, CategoryScore]> = useMemo(
    () => (data ? Object.entries(data.categories) as Array<[string, CategoryScore]> : []),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-text-muted">Loading Fear &amp; Greed Index…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
        <div className="flex h-40 items-center justify-center">
          <span className="text-sm text-danger">Failed to load Fear &amp; Greed data</span>
        </div>
      </div>
    );
  }

  const { composite, regime, headerMetrics, history } = data;

  return (
    <div className="space-y-4">
      {/* Header metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            BTC Dominance
          </span>
          <div className="mt-1 font-mono text-lg font-semibold text-text-primary">
            {headerMetrics.btcDom.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Total Market Cap
          </span>
          <div className="mt-1 font-mono text-lg font-semibold text-text-primary">
            ${formatNumber(headerMetrics.totalMcap)}
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            24h Change
          </span>
          <div
            className={cn(
              "mt-1 font-mono text-lg font-semibold",
              headerMetrics.mcapChange24h >= 0 ? "text-accent-green" : "text-danger",
            )}
          >
            {formatPercent(headerMetrics.mcapChange24h)}
          </div>
        </div>
      </div>

      {/* Main gauge card */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
        <div className="flex flex-col items-center">
          {/* Gauge */}
          <GaugeSVG score={composite.score} />

          {/* Score + label */}
          <div className="-mt-4 text-center">
            <div
              className={cn("font-mono text-5xl font-bold", scoreColor(composite.score))}
              style={{ textShadow: `0 0 24px ${scoreGlowColor(composite.score)}40` }}
            >
              {composite.score}
            </div>
            <div className="mt-1 text-sm font-medium text-text-primary">
              {composite.label}
            </div>
            {composite.change !== 0 && (
              <div
                className={cn(
                  "mt-0.5 text-xs font-mono",
                  composite.change > 0 ? "text-accent-green" : "text-danger",
                )}
              >
                {composite.change > 0 ? "▲" : "▼"} {Math.abs(composite.change)} from yesterday
              </div>
            )}
          </div>

          {/* Regime badge */}
          <div className="mt-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                REGIME_COLORS[regime.state] ?? "bg-bg-elevated text-text-muted",
              )}
            >
              {regime.state}
              <span className="opacity-70">/ {regime.stance}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Category breakdowns */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Category Breakdown
        </h3>
        <div className="space-y-2.5">
          {categoryEntries.map(([key, cat]) => (
            <CategoryBar
              key={key}
              name={key}
              score={cat.score}
              weight={cat.weight}
            />
          ))}
        </div>
      </div>

      {/* 7-day history sparkline */}
      {history.length > 1 && (
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              7-Day History
            </h3>
            <span className="text-[10px] font-mono text-text-muted">
              {history[0].date} → {history[history.length - 1].date}
            </span>
          </div>
          <Sparkline points={history} />
          <div className="mt-1 flex justify-between text-[10px] font-mono text-text-muted">
            <span>{history[0].score}</span>
            <span>{history[history.length - 1].score}</span>
          </div>
        </div>
      )}
    </div>
  );
}
