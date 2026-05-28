"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/domain/page-header";
import { RiskScore } from "@/components/domain/risk-score";
import { cn, formatUsd, formatNumber, formatPercent, getChainColor } from "@/lib/utils";
import { defiProtocols, generateTvlHistory, topDepositors } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ protocol: string }>;
}) {
  const { protocol: protocolId } = await params;
  const protocol = defiProtocols.find((p) => p.id === protocolId);

  if (!protocol) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary">Protocol not found</h2>
          <Link href="/defi" className="mt-2 text-sm text-accent-cyan hover:underline">
            Back to DeFi Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tvlHistory = generateTvlHistory(protocol.tvl, 90);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Link href="/defi" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to DeFi
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{protocol.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: getChainColor(protocol.chain) }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getChainColor(protocol.chain) }} />
                {protocol.chain}
              </span>
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">{protocol.category}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{protocol.description}</p>
          </div>
          <RiskScore score={protocol.riskScore} />
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">TVL</span>
            <div className="font-mono text-sm text-text-primary">{formatUsd(protocol.tvl)}</div>
            <span className={cn("text-xs font-mono", protocol.tvlChange24h >= 0 ? "text-accent-green" : "text-danger")}>
              {formatPercent(protocol.tvlChange24h)}
            </span>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">24h Volume</span>
            <div className="font-mono text-sm text-text-primary">
              {protocol.volume24h > 0 ? formatUsd(protocol.volume24h) : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">Users</span>
            <div className="font-mono text-sm text-text-primary">{formatNumber(protocol.uniqueUsers)}</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">SM Inflow</span>
            <div className={cn("font-mono text-sm", protocol.smartMoneyInflow >= 0 ? "text-accent-green" : "text-danger")}>
              {protocol.smartMoneyInflow >= 0 ? "+" : ""}{formatUsd(protocol.smartMoneyInflow)}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">Risk Score</span>
            <div className="font-mono text-sm text-text-primary">{protocol.riskScore}/100</div>
          </div>
          {protocol.yieldRate !== undefined && (
            <div className="rounded-lg border border-white/5 bg-bg-surface p-3">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Yield APY</span>
              <div className="font-mono text-sm text-accent-green">{protocol.yieldRate}%</div>
            </div>
          )}
        </div>

        {/* TVL Chart */}
        <div className="mt-6 rounded-lg border border-white/5 bg-bg-surface p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">TVL History (90d)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tvlHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${(v / 1e9).toFixed(1)}B`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111318",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#E8EAED",
                  }}
                  formatter={(value: unknown) => [formatUsd(Number(value)), "TVL"]}
                />
                <Area
                  type="monotone"
                  dataKey="tvl"
                  stroke="#00D4FF"
                  fill="url(#tvlGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Depositors */}
        <div className="mt-6 rounded-lg border border-white/5 bg-bg-surface p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Top Depositors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Label</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Address</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Deposited</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Share</th>
                </tr>
              </thead>
              <tbody>
                {topDepositors.map((dep, i) => (
                  <tr key={dep.address} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2.5 font-mono text-text-muted">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-text-primary">{dep.label}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-muted">{dep.address}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">{formatUsd(dep.deposited)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">{dep.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk & Yield */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Risk Metrics</h3>
            <div className="space-y-3">
              <RiskRow label="Smart Contract Risk" value={protocol.riskScore <= 25 ? "Low" : protocol.riskScore <= 50 ? "Medium" : "High"} />
              <RiskRow label="Liquidity Risk" value={protocol.tvl > 1e9 ? "Low" : protocol.tvl > 1e8 ? "Medium" : "High"} />
              <RiskRow label="Oracle Risk" value={protocol.category === "Lending" ? "Medium" : "Low"} />
              <RiskRow label="Governance Risk" value="Medium" />
            </div>
          </div>
          {protocol.yieldRate !== undefined && (
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Yield Rates</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Base APY</span>
                  <span className="font-mono text-sm text-accent-green">{(protocol.yieldRate * 0.6).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Reward APY</span>
                  <span className="font-mono text-sm text-accent-green">{(protocol.yieldRate * 0.4).toFixed(1)}%</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Total APY</span>
                  <span className="font-mono text-sm font-medium text-accent-green">{protocol.yieldRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskRow({ label, value }: { label: string; value: string }) {
  const color = value === "Low" ? "text-accent-green" : value === "Medium" ? "text-warning" : "text-danger";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={cn("text-sm font-medium", color)}>{value}</span>
    </div>
  );
}
