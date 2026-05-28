"use client";

import { use } from "react";
import { cn, formatUsd, formatAddress, formatPercent, formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/domain/page-header";
import { EntityBadge } from "@/components/domain/entity-badge";
import { RiskScore } from "@/components/domain/risk-score";
import { WalletAddress } from "@/components/domain/wallet-address";
import { PnlBadge } from "@/components/domain/pnl-badge";
import { mockWalletProfile } from "@/lib/mock/entities";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { AlertTriangle, Copy, TrendingUp, Wallet } from "lucide-react";

function PnlTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-elevated px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono text-xs" style={{ color: p.color }}>
          {p.dataKey}: {formatUsd(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function WalletProfilerPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const profile = mockWalletProfile;
  const entity = profile.entity;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
            <Wallet className="h-6 w-6 text-accent-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <WalletAddress address={address} chars={6} className="text-lg" />
              {entity ? (
                <EntityBadge name={entity.name} type={entity.type} verified={entity.verified} />
              ) : (
                <span className="rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
                  Unidentified
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Last active {formatRelativeTime("2026-05-28T10:30:00Z")}
            </p>
          </div>
        </div>
        {entity && <RiskScore score={entity.riskScore} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Total PNL (90d)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-accent-green">
            {formatUsd(profile.pnlHistory[profile.pnlHistory.length - 1]?.total ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Realized PNL</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">
            {formatUsd(profile.pnlHistory[profile.pnlHistory.length - 1]?.realized ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Unrealized PNL</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">
            {formatUsd(profile.pnlHistory[profile.pnlHistory.length - 1]?.unrealized ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
          <p className="text-xs text-text-muted">Active Chains</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">
            {entity?.chains.length ?? 0}
          </p>
        </div>
      </div>

      {/* PNL Chart */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">PNL Over Time</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profile.pnlHistory}>
              <defs>
                <linearGradient id="gradRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradUnrealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<PnlTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} iconSize={8} />
              <Area
                type="monotone"
                dataKey="realized"
                stroke="#00FF88"
                fill="url(#gradRealized)"
                strokeWidth={1.5}
                name="Realized"
              />
              <Area
                type="monotone"
                dataKey="unrealized"
                stroke="#00D4FF"
                fill="url(#gradUnrealized)"
                strokeWidth={1.5}
                name="Unrealized"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#FFB800"
                strokeWidth={2}
                dot={false}
                name="Total"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Token Accumulation */}
      <div className="rounded-lg border border-white/5 bg-bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Token Accumulation Timeline</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profile.tokenAccumulation}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<PnlTooltip />} />
              <Line
                type="monotone"
                dataKey="usdValue"
                stroke="#00D4FF"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00D4FF" }}
                name="USD Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Amount</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">USD Value</th>
              </tr>
            </thead>
            <tbody>
              {profile.tokenAccumulation.map((t, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td className="px-3 py-2 text-xs text-text-muted">{t.date}</td>
                  <td className="px-3 py-2 text-sm font-medium text-text-primary">{t.token}</td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-text-primary">
                    {t.amount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-text-primary">
                    {formatUsd(t.usdValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy Trading Signal */}
      <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <h3 className="text-sm font-semibold text-warning">Copy Trading Signal</h3>
            <p className="mt-1 text-sm text-text-primary">{profile.copySignal}</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="flex items-center gap-1 rounded-md bg-accent-cyan/10 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/20 transition-colors">
                <TrendingUp className="h-3.5 w-3.5" />
                Mirror Trade
              </button>
              <button className="flex items-center gap-1 rounded-md bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">
                <Copy className="h-3.5 w-3.5" />
                Copy Signal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
