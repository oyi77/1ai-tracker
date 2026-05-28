"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { cn, formatAddress } from "@/lib/utils";
import type { HolderInfo } from "@/lib/mock-data";

interface HolderBreakdownProps {
  distribution: { top10: number; top11to50: number; top51to100: number; retail: number };
  topHolders: HolderInfo[];
  className?: string;
}

const COLORS = ["#00D4FF", "#8B5CF6", "#FFB800", "#6B7280"];
const LABELS = ["Top 10", "11-50", "51-100", "Retail"];

const typeColors: Record<string, string> = {
  Exchange: "text-accent-cyan",
  Fund: "text-warning",
  Whale: "text-accent-green",
  Protocol: "text-[#8B5CF6]",
  Retail: "text-text-muted",
};

export function HolderBreakdown({ distribution, topHolders, className }: HolderBreakdownProps) {
  const pieData = [
    { name: "Top 10", value: distribution.top10 },
    { name: "11-50", value: distribution.top11to50 },
    { name: "51-100", value: distribution.top51to100 },
    { name: "Retail", value: distribution.retail },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pie chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#111318",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#E8EAED",
              }}
              formatter={(value: unknown) => [`${value}%`]}
            />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-text-primary">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top holders table */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-text-primary">Top Holders</h4>
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-bg-elevated/50">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Label</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Address</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Type</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Balance</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">%</th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((holder, i) => (
                <tr key={holder.address} className="border-b border-white/[0.03]">
                  <td className="px-3 py-2 font-mono text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{holder.label}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-muted">{formatAddress(holder.address, 6)}</td>
                  <td className={cn("px-3 py-2 text-xs font-medium", typeColors[holder.type])}>{holder.type}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">{holder.balance.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">{holder.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
