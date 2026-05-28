"use client";

import { cn } from "@/lib/utils";
import type { PricePoint } from "@/lib/predictions/mock-data";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface PriceHistoryChartProps {
  data: PricePoint[];
  className?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-surface px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono">
          <span className={p.dataKey === "yesPrice" ? "text-accent-cyan" : "text-text-muted"}>
            {p.dataKey === "yesPrice" ? `Yes: ${(p.value * 100).toFixed(1)}%` : `Vol: $${(p.value / 1000).toFixed(0)}k`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function PriceHistoryChart({ data, className }: PriceHistoryChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A1D27" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#1A1D27" }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="price"
            domain={[0, 1]}
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill="#1A1D27"
            opacity={0.5}
            radius={[2, 2, 0, 0]}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="yesPrice"
            stroke="#00D4FF"
            strokeWidth={2}
            fill="url(#yesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#00D4FF", stroke: "#0A0B0F", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
