"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import type { WalletProfile } from "@/lib/mock-data";

const RADAR_COLORS = ["#00D4FF", "#00FF88", "#FFB800", "#FF3D6B"];

interface RadarComparisonProps {
  wallets: WalletProfile[];
  className?: string;
}

export function RadarComparison({ wallets, className }: RadarComparisonProps) {
  const metrics = [
    { key: "pnl", label: "PNL", max: 400 },
    { key: "winRate", label: "Win Rate", max: 100 },
    { key: "activity", label: "Activity", max: 250 },
    { key: "diversification", label: "Diversification", max: 100 },
    { key: "riskScore", label: "Risk Score", max: 100 },
  ];

  const radarData = metrics.map((m) => {
    const point: Record<string, string | number> = { metric: m.label };
    wallets.forEach((w) => {
      const val = w[m.key as keyof WalletProfile] as number;
      point[w.id] = Math.min(100, (val / m.max) * 100);
    });
    return point;
  });

  return (
    <div className={cn("h-96", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#6B7280" }}
          />
          {wallets.map((w, i) => (
            <Radar
              key={w.id}
              name={w.label}
              dataKey={w.id}
              stroke={RADAR_COLORS[i]}
              fill={RADAR_COLORS[i]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-text-primary">{value}</span>
            )}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111318",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#E8EAED",
            }}
            formatter={(value: unknown) => [`${Number(value).toFixed(0)}%`]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
