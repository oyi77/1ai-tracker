"use client";

import { useState } from "react";
import { PageHeader } from "@/components/domain/page-header";
import { RadarComparison } from "@/components/compare/RadarComparison";
import { cn, formatUsd, formatAddress, getChainColor } from "@/lib/utils";
import { comparisonWallets, sharedHoldings, timelineOverlaps } from "@/lib/mock-data";
import type { WalletProfile } from "@/lib/mock-data";
import { X, Plus } from "lucide-react";

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>(["w1", "w2", "w3"]);
  const selectedWallets = comparisonWallets.filter((w) => selected.includes(w.id));

  const toggleWallet = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <PageHeader
          title="Wallet Comparison"
          description="Compare up to 4 wallets side by side"
        />

        {/* Wallet selector */}
        <div className="mt-6 flex flex-wrap gap-2">
          {comparisonWallets.map((w) => {
            const isSelected = selected.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => toggleWallet(w.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                    : "border-white/10 bg-bg-surface text-text-muted hover:text-text-primary"
                )}
              >
                {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span className="font-medium">{w.label}</span>
                <span className="font-mono text-xs opacity-60">{formatAddress(w.address, 3)}</span>
              </button>
            );
          })}
        </div>

        {selectedWallets.length < 2 && (
          <div className="mt-12 text-center text-sm text-text-muted">
            Select at least 2 wallets to compare.
          </div>
        )}

        {selectedWallets.length >= 2 && (
          <div className="mt-8 space-y-8">
            {/* Stats comparison */}
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-bg-elevated/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Metric</th>
                    {selectedWallets.map((w, i) => (
                      <th key={w.id} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#00D4FF", "#00FF88", "#FFB800", "#FF3D6B"][i] }} />
                          {w.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Total Value", key: "totalValue", format: (v: number) => formatUsd(v) },
                    { label: "PNL", key: "pnl", format: (v: number) => `+${v}%` },
                    { label: "Win Rate", key: "winRate", format: (v: number) => `${v}%` },
                    { label: "Activity (trades/wk)", key: "activity", format: (v: number) => `${v}` },
                    { label: "Diversification", key: "diversification", format: (v: number) => `${v}/100` },
                    { label: "Risk Score", key: "riskScore", format: (v: number) => `${v}/100` },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-white/[0.03]">
                      <td className="px-4 py-2.5 text-text-muted">{row.label}</td>
                      {selectedWallets.map((w) => (
                        <td key={w.id} className="px-4 py-2.5 text-right font-mono text-text-primary">
                          {row.format(w[row.key as keyof WalletProfile] as number)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Radar chart */}
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Performance Radar</h3>
              <RadarComparison wallets={selectedWallets} />
            </div>

            {/* Shared holdings */}
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Shared Holdings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Token</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Chain</th>
                      {selectedWallets.map((w) => (
                        <th key={w.id} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">{w.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sharedHoldings.map((sh) => (
                      <tr key={sh.symbol} className="border-b border-white/[0.03]">
                        <td className="px-3 py-2.5 font-medium text-text-primary">{sh.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs" style={{ color: getChainColor(sh.chain) }}>{sh.chain}</span>
                        </td>
                        {selectedWallets.map((w) => (
                          <td key={w.id} className="px-3 py-2.5 text-right">
                            <div className="font-mono text-text-primary">{formatUsd(sh.usdValues[w.id] || 0)}</div>
                            <div className="text-xs text-text-muted">{(sh.balances[w.id] || 0).toLocaleString()} {sh.symbol}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timeline overlap */}
            <div className="rounded-lg border border-white/5 bg-bg-surface p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Timeline Overlap</h3>
              <div className="space-y-3">
                {timelineOverlaps
                  .filter((to) => to.wallets.some((wid) => selected.includes(wid)))
                  .map((to, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border border-white/[0.03] px-4 py-3">
                      <div className="w-24 text-xs text-text-muted">{to.date}</div>
                      <div className="flex-1">
                        <span className="text-sm text-text-primary">
                          {to.wallets.filter((wid) => selected.includes(wid)).map((wid) => {
                            const w = comparisonWallets.find((x) => x.id === wid);
                            return w?.label;
                          }).join(", ")}
                        </span>
                        <span className="mx-1 text-text-muted">&mdash;</span>
                        <span className="text-sm text-accent-cyan">{to.action}</span>
                        <span className="mx-1 text-text-muted">{to.token}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-elevated">
                          <div
                            className="h-full rounded-full bg-accent-cyan"
                            style={{ width: `${to.similarity}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-mono text-text-muted">{to.similarity}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
