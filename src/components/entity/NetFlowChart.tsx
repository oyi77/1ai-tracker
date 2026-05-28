"use client";

import { cn, formatUsd } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { NetFlow } from "@/lib/mock/entities";

interface NetFlowChartProps {
  data: NetFlow[];
  className?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-elevated px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono text-xs" style={{ color: p.color }}>
          {p.dataKey === "inflow" ? "Inflow" : "Outflow"}: {formatUsd(p.value)}
        </p>
      ))}
      <p className="mt-1 border-t border-white/10 pt-1 font-mono text-xs text-text-primary">
        Net: {formatUsd((payload[0]?.value ?? 0) - (payload[1]?.value ?? 0))}
      </p>
    </div>
  );
}

export function NetFlowChart({ data, className }: NetFlowChartProps) {
  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6B7280" }}
            tickFormatter={(v: string) => v.slice(-2)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6B7280" }}
            tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#6B7280" }}
            iconSize={8}
          />
          <Bar dataKey="inflow" fill="#00FF88" radius={[2, 2, 0, 0]} />
          <Bar dataKey="outflow" fill="#FF3D6B" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
